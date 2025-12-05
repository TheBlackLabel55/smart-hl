'use client';

/**
 * TokenFilterPanel Component
 * Token filter dropdown for wallet dashboard with search functionality
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TokenFilterPanelProps {
  availableTokens: string[];
  selectedToken: string | null;
  onTokenChange: (token: string | null) => void;
}

export function TokenFilterPanel({
  availableTokens,
  selectedToken,
  onTokenChange,
}: TokenFilterPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter tokens based on search query (case-insensitive, starts with)
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableTokens;
    }
    const query = searchQuery.toUpperCase();
    return availableTokens.filter(token => 
      token.toUpperCase().startsWith(query)
    );
  }, [availableTokens, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search query when selected token changes externally
  useEffect(() => {
    if (selectedToken && !isOpen) {
      setSearchQuery('');
    }
  }, [selectedToken, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(true);
    
    // If input is cleared, clear selection
    if (!value.trim()) {
      onTokenChange(null);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleTokenSelect = (token: string) => {
    onTokenChange(token);
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onTokenChange(null);
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const displayValue = selectedToken || searchQuery;

  return (
    <div className="px-4 sm:px-6 py-3 border-b border-gunmetal-700 bg-base-800/50">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
          Filter by Token:
        </span>
        
        <div className="relative w-full sm:w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={displayValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder="Type to search (e.g., B for BTC, BNB...)"
              className={cn(
                'pl-9 pr-8 py-2 text-sm font-mono w-full min-h-[44px]',
                'bg-gunmetal-800 border border-gunmetal-600 rounded',
                'text-white placeholder:text-gray-500',
                'focus:outline-none focus:border-electric-lime',
                'transition-colors'
              )}
            />
            {displayValue && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gunmetal-700 rounded transition-colors"
                aria-label="Clear"
              >
                <X className="w-3 h-3 text-gray-400 hover:text-white" />
              </button>
            )}
            <ChevronDown 
              className={cn(
                'absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform',
                isOpen && 'rotate-180'
              )} 
            />
          </div>

          {/* Dropdown List */}
          <AnimatePresence>
            {isOpen && filteredTokens.length > 0 && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'absolute top-full left-0 mt-1 w-full max-h-64 overflow-y-auto',
                  'bg-gunmetal-800 border border-gunmetal-600 rounded',
                  'shadow-xl z-50'
                )}
              >
                {filteredTokens.map((token) => (
                  <button
                    key={token}
                    onClick={() => handleTokenSelect(token)}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm font-mono',
                      'hover:bg-gunmetal-700 transition-colors',
                      'text-white',
                      selectedToken === token && 'bg-electric-lime/20 text-electric-lime'
                    )}
                  >
                    {token}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No results message */}
          <AnimatePresence>
            {isOpen && searchQuery && filteredTokens.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'absolute top-full left-0 mt-1 w-64 px-4 py-3',
                  'bg-gunmetal-800 border border-gunmetal-600 rounded',
                  'text-sm font-mono text-gray-400 z-50'
                )}
              >
                No tokens found starting with "{searchQuery}"
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectedToken && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleClear}
            className={cn(
              'flex items-center gap-1 px-2 py-1 text-xs font-mono',
              'text-gray-400 hover:text-white transition-colors',
              'border border-gunmetal-600 rounded hover:border-gunmetal-500'
            )}
          >
            <X className="w-3 h-3" />
            Clear
          </motion.button>
        )}

        <div className="flex-1" />

        {selectedToken && (
          <span className="text-xs font-mono text-gray-500">
            Showing wallets with {selectedToken} positions
          </span>
        )}
      </div>
    </div>
  );
}
