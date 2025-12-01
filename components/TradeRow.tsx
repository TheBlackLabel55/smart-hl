'use client';

/**
 * TradeRow Component
 * Individual trade entry with cyberpunk styling and motion
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { UnifiedTradeLog } from '@/types';
import { cn, formatUSD, formatPrice, truncateAddress, formatTime, isGoldenSetup } from '@/lib/utils';

interface TradeRowProps {
  trade: UnifiedTradeLog;
  index: number;
}

export const TradeRow = memo(function TradeRow({ trade, index }: TradeRowProps) {
  const isGolden = isGoldenSetup(trade.isSmart, trade.sizeUsd);
  const isLong = trade.side === 'Long';

  // Animation variants
  const rowVariants = {
    initial: { 
      opacity: 0, 
      x: -20,
      scale: 0.98,
    },
    animate: { 
      opacity: 1, 
      x: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        delay: index * 0.02, // Staggered reveal
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.2 },
    },
  };

  // Determine row style based on trade type
  const getRowStyles = () => {
    if (isGolden) {
      return 'golden-setup';
    }
    if (trade.isSmart) {
      return 'border-glow-smart bg-neon-green/5';
    }
    if (trade.isWhale) {
      return 'border-glow-whale bg-whale/5';
    }
    return 'border-gunmetal-700 hover:border-gunmetal-600 hover:bg-white/[0.02]';
  };

  return (
    <motion.div
      variants={rowVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
      className={cn(
        'grid grid-cols-[100px_80px_100px_140px_1fr_120px] gap-4 px-4 py-3',
        'border-b border-l-2 transition-colors duration-200',
        'font-mono text-sm',
        getRowStyles(),
        isLong ? 'border-l-long' : 'border-l-short'
      )}
    >
      {/* Timestamp */}
      <div className="flex items-center">
        <span className="text-gray-400 mono-nums">
          {formatTime(trade.timestamp)}
        </span>
      </div>

      {/* Ticker */}
      <div className="flex items-center">
        <span className={cn(
          'font-semibold tracking-wide',
          trade.ticker === 'BTC' && 'text-orange-400',
          trade.ticker === 'ETH' && 'text-blue-400',
          !['BTC', 'ETH'].includes(trade.ticker) && 'text-gray-200'
        )}>
          {trade.ticker}
        </span>
      </div>

      {/* Side Badge */}
      <div className="flex items-center">
        <span className={cn(
          'px-3 py-1 rounded text-xs font-bold uppercase tracking-wider',
          isLong 
            ? 'bg-long/20 text-long border border-long/30' 
            : 'bg-short/20 text-short border border-short/30'
        )}>
          {trade.side}
        </span>
      </div>

      {/* Price */}
      <div className="flex items-center">
        <span className="text-gray-200 mono-nums">
          ${formatPrice(trade.price)}
        </span>
      </div>

      {/* Size & Labels */}
      <div className="flex items-center gap-3">
        {/* Size */}
        <span className={cn(
          'font-bold mono-nums',
          trade.isWhale ? 'text-whale text-glow-green' : 'text-white'
        )}>
          {formatUSD(trade.sizeUsd)}
        </span>

        {/* Labels */}
        <div className="flex items-center gap-2">
          {trade.isSmart && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded',
                'bg-neon-green/20 text-neon-green border border-neon-green/40',
                isGolden && 'animate-pulse'
              )}
            >
              {isGolden ? '⚡ GOLDEN' : 'SMART'}
            </motion.span>
          )}
          
          {trade.isWhale && !trade.isSmart && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-whale/20 text-whale border border-whale/40"
            >
              🐋 WHALE
            </motion.span>
          )}

          {trade.walletLabel && trade.walletLabel !== 'Whale' && (
            <span className="text-xs text-gray-400 truncate max-w-[150px]">
              {trade.walletLabel}
            </span>
          )}
        </div>
      </div>

      {/* Wallet Address */}
      <div className="flex items-center justify-end">
        <a
          href={`https://arbiscan.io/address/${trade.walletAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'font-mono text-xs transition-colors duration-200',
            trade.isSmart 
              ? 'text-neon-green/70 hover:text-neon-green' 
              : 'text-gray-500 hover:text-gray-300'
          )}
        >
          {truncateAddress(trade.walletAddress, 4)}
        </a>
      </div>
    </motion.div>
  );
});

