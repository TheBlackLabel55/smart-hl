'use client';

/**
 * TokenFilterPanel Component
 * Token filter dropdown for wallet dashboard
 */

import { motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
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
  return (
    <div className="px-6 py-3 border-b border-gunmetal-700 bg-base-800/50">
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
          Filter by Token:
        </span>
        
        <div className="relative">
          <select
            value={selectedToken || ''}
            onChange={(e) => onTokenChange(e.target.value || null)}
            className={cn(
              'appearance-none px-4 py-2 pr-8 text-sm font-mono',
              'bg-gunmetal-800 border border-gunmetal-600 rounded',
              'text-white focus:outline-none focus:border-electric-lime',
              'transition-colors cursor-pointer'
            )}
          >
            <option value="">All Tokens</option>
            {availableTokens.map((token) => (
              <option key={token} value={token}>
                {token}
              </option>
            ))}
          </select>
          
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {selectedToken && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onTokenChange(null)}
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
