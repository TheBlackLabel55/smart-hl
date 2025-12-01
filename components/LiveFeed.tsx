'use client';

/**
 * LiveFeed Component
 * Main container for the real-time trade stream with filtering and virtualization
 * 
 * UI States:
 * 1. LOADING - Loading cache
 * 2. CONNECTING - WebSocket connecting
 * 3. SCANNING - Connected but no trades yet
 * 4. ACTIVE - Trades flowing
 */

import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TradeRow } from './TradeRow';
import { useFilteredTrades, useConnectionStatus, useStats } from '@/store/useStore';
import { useHyperliquidWS } from '@/hooks/useHyperliquidWS';
import { useProcessor } from '@/hooks/useProcessor';
import { useSmartMoneyLoader } from '@/hooks/useSmartMoneyLoader';
import { cn, formatUSD } from '@/lib/utils';

const ROW_HEIGHT = 56; // Height of each TradeRow in pixels

export function LiveFeed() {
  const trades = useFilteredTrades();
  const connectionStatus = useConnectionStatus();
  const stats = useStats();
  const parentRef = useRef<HTMLDivElement>(null);

  // Load Smart Money cache
  const { isLoading: isLoadingCache, walletCount, error: cacheError } = useSmartMoneyLoader();

  // Initialize processor
  const { handleTrade } = useProcessor();

  // Connect to Hyperliquid WebSocket (only after cache is loaded)
  useHyperliquidWS(handleTrade, {
    autoConnect: !isLoadingCache,
  });

  // Derive state
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const hasError = connectionStatus === 'error';
  const hasTrades = trades.length > 0;

  // Virtual list for performance
  const virtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  // Get connection status color
  const getStatusColor = useCallback(() => {
    switch (connectionStatus) {
      case 'connected': return 'bg-neon-green';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }, [connectionStatus]);

  // Determine which UI state to show
  const renderContent = () => {
    // STATE 1: Loading cache
    if (isLoadingCache) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-center p-8"
        >
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-2 border-neon-green/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-neon-green rounded-full animate-spin" />
          </div>
          <h3 className="font-display text-xl font-semibold text-gray-300 mb-2">
            Initializing Neural Link
          </h3>
          <p className="text-gray-500 font-mono text-sm">
            Loading Smart Money database...
          </p>
        </motion.div>
      );
    }

    // STATE 2: WebSocket connecting
    if (isConnecting) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-center p-8"
        >
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-2 border-yellow-500/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-yellow-500 rounded-full animate-spin" />
          </div>
          <h3 className="font-display text-xl font-semibold text-yellow-500 mb-2">
            Establishing Connection
          </h3>
          <p className="text-gray-500 font-mono text-sm">
            Connecting to Hyperliquid WebSocket...
          </p>
        </motion.div>
      );
    }

    // STATE 3: Error state
    if (hasError) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-center p-8"
        >
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="font-display text-xl font-semibold text-red-500 mb-2">
            Connection Error
          </h3>
          <p className="text-gray-500 font-mono text-sm max-w-md">
            Failed to connect to Hyperliquid. Please refresh the page.
          </p>
        </motion.div>
      );
    }

    // STATE 4: Connected but no trades yet
    if (isConnected && !hasTrades) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-full text-center p-8"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-6xl mb-4"
          >
            📡
          </motion.div>
          <h3 className="font-display text-xl font-semibold text-neon-green mb-2">
            System Online
          </h3>
          <p className="text-gray-500 font-mono text-sm max-w-md">
            Scanning for Smart Money & Whale trades...
          </p>
          <p className="text-gray-600 font-mono text-xs mt-2">
            Trades will appear here when detected
          </p>
        </motion.div>
      );
    }

    // STATE 5: Active - trades flowing
    return (
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="popLayout">
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const trade = trades[virtualRow.index];
            return (
              <div
                key={trade.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TradeRow trade={trade} index={virtualRow.index} />
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gunmetal-700 bg-base-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', getStatusColor())} />
            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
              {connectionStatus}
            </span>
          </div>

          {/* Cache Status */}
          {isLoadingCache ? (
            <span className="text-xs font-mono text-yellow-500">Loading cache...</span>
          ) : cacheError ? (
            <span className="text-xs font-mono text-red-500">Cache error</span>
          ) : (
            <span className="text-xs font-mono text-gray-500">
              {walletCount} Smart Wallets
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <StatBadge label="Total" value={stats.totalTrades.toString()} />
          <StatBadge label="Smart" value={stats.smartTrades.toString()} color="green" />
          <StatBadge label="Whales" value={stats.whaleTrades.toString()} color="gold" />
          <StatBadge label="Volume" value={formatUSD(stats.totalVolume)} />
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[100px_80px_100px_140px_1fr_120px] gap-4 px-4 py-2 border-b border-gunmetal-700 bg-base-900/30">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Time</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Ticker</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Side</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Price</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Size / Labels</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Wallet</span>
      </div>

      {/* Trade List */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto relative"
        style={{ contain: 'strict' }}
      >
        {renderContent()}
      </div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden scanline opacity-30" />
    </div>
  );
}

// Helper component for stats badges
function StatBadge({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: string; 
  color?: 'green' | 'gold' | 'cyan';
}) {
  const colorClasses = {
    green: 'text-neon-green',
    gold: 'text-whale',
    cyan: 'text-neon-cyan',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono uppercase tracking-wider text-gray-500">
        {label}:
      </span>
      <span className={cn(
        'text-sm font-mono font-semibold mono-nums',
        color ? colorClasses[color] : 'text-gray-200'
      )}>
        {value}
      </span>
    </div>
  );
}
