'use client';

/**
 * WalletRow Component
 * Desktop table row for wallet statistics
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from './icons';
import type { WalletStats } from '@/types';
import { cn, formatPrice, formatUSD, truncateAddress } from '@/lib/utils';
import { EXPLORER_URL } from '@/lib/constants';

interface WalletRowProps {
  wallet: WalletStats;
  index: number;
  selectedToken?: string | null;
}

export const WalletRow = memo(function WalletRow({ wallet, index, selectedToken }: WalletRowProps) {
  const isError = wallet.error;

  // Determine display side and size based on selectedToken
  const getDisplayData = () => {
    if (selectedToken) {
      const position = wallet.positions?.find(p => p.coin === selectedToken);
      if (position) {
        return {
          side: position.side,
          size: position.sizeUsd,
          entryPrice: position.entryPrice,
          currentPrice: position.currentPrice,
          positionPnl: position.pnl,
          liquidationPrice: position.liquidationPrice,
        };
      }
      return { side: null, size: 0, entryPrice: null, currentPrice: null, positionPnl: null, liquidationPrice: null };
    } else {
      const netLong = (wallet.longPosition || 0) - (wallet.shortPosition || 0);
      const totalSize = (wallet.longPosition || 0) + (wallet.shortPosition || 0);
      return {
        side: netLong > 0 ? 'Long' : netLong < 0 ? 'Short' : null,
        size: totalSize,
        entryPrice: null,
        currentPrice: null,
        positionPnl: null,
        liquidationPrice: null,
      };
    }
  };

  const { side, size, entryPrice, currentPrice, positionPnl, liquidationPrice } = getDisplayData();
  const isLong = side === 'Long';

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
      className={cn(
        'border-b border-gunmetal-700/50 hover:bg-white/[0.02] transition-colors',
        isError && 'opacity-50'
      )}
    >
      {/* Wallet Address */}
      <td className="px-3 py-2.5 md:px-4 md:py-3">
        <a
          href={`${EXPLORER_URL}/address/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 font-mono text-sm transition-colors',
            'text-electric-lime hover:text-electric-lime/80',
            isError && 'text-gray-500'
          )}
        >
          {truncateAddress(wallet.address, 4)}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </td>

      {/* Side (Long/Short) */}
      <td className="px-3 py-2.5 md:px-4 md:py-3">
        {side ? (
          <span className={cn(
            'px-3 py-1 rounded text-xs font-bold uppercase tracking-wider',
            isLong 
              ? 'bg-electric-lime/20 text-electric-lime border border-electric-lime/30' 
              : 'bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30'
          )}>
            {side}
          </span>
        ) : (
          <span className="text-xs text-gray-500 font-mono">-</span>
        )}
      </td>

      {/* Position Size */}
      <td className="px-3 py-2.5 md:px-4 md:py-3">
        <span className="font-mono text-sm mono-nums text-gray-200">
          {size > 0 ? formatUSD(size) : '-'}
        </span>
      </td>

      {/* 7D PnL */}
      <td className="px-3 py-2.5 md:px-4 md:py-3">
        <span className={cn(
          'font-mono text-sm mono-nums font-semibold',
          wallet.pnl7d > 0 
            ? 'text-electric-lime text-glow-green' 
            : wallet.pnl7d < 0 
            ? 'text-short' 
            : 'text-gray-400'
        )}>
          {formatUSD(wallet.pnl7d)}
        </span>
      </td>

      {/* 30D PnL */}
      <td className="px-3 py-2.5 md:px-4 md:py-3">
        <span className={cn(
          'font-mono text-sm mono-nums',
          wallet.pnl30d > 0 ? 'text-electric-lime' : wallet.pnl30d < 0 ? 'text-short' : 'text-gray-400'
        )}>
          {formatUSD(wallet.pnl30d)}
        </span>
      </td>

      {/* 7D Win Rate */}
      <td className="px-3 py-2.5 md:px-4 md:py-3">
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 md:w-12 md:h-12">
            <svg className="w-10 h-10 md:w-12 md:h-12 transform -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gunmetal-700"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${wallet.winRate7d} ${100 - wallet.winRate7d}`}
                className={cn(
                  wallet.winRate7d >= 60 ? 'text-electric-lime' : 
                  wallet.winRate7d >= 40 ? 'text-neon-cyan' : 
                  'text-short'
                )}
                strokeLinecap="round"
              />
            </svg>
            <span className={cn(
              'absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold',
              wallet.winRate7d >= 60 ? 'text-electric-lime' : 
              wallet.winRate7d >= 40 ? 'text-neon-cyan' : 
              'text-short'
            )}>
              {Math.round(wallet.winRate7d)}%
            </span>
          </div>
        </div>
      </td>

      {/* 30D Win Rate */}
      <td className="px-3 py-2.5 md:px-4 md:py-3">
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-10 md:w-12 md:h-12">
            <svg className="w-10 h-10 md:w-12 md:h-12 transform -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gunmetal-700"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${wallet.winRate30d} ${100 - wallet.winRate30d}`}
                className={cn(
                  wallet.winRate30d >= 60 ? 'text-electric-lime' : 
                  wallet.winRate30d >= 40 ? 'text-neon-cyan' : 
                  'text-short'
                )}
                strokeLinecap="round"
              />
            </svg>
            <span className={cn(
              'absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold',
              wallet.winRate30d >= 60 ? 'text-electric-lime' : 
              wallet.winRate30d >= 40 ? 'text-neon-cyan' : 
              'text-short'
            )}>
              {Math.round(wallet.winRate30d)}%
            </span>
          </div>
        </div>
      </td>

      {/* Entry Price (token view only) */}
      {selectedToken && (
        <td className="px-3 py-2.5 md:px-4 md:py-3">
          <span className="font-mono text-sm mono-nums text-gray-200">
            {entryPrice != null ? `$${formatPrice(entryPrice)}` : '-'}
          </span>
        </td>
      )}

      {/* Current Price (token view only) */}
      {selectedToken && (
        <td className="px-3 py-2.5 md:px-4 md:py-3">
          <span className="font-mono text-sm mono-nums text-gray-200">
            {currentPrice != null ? `$${formatPrice(currentPrice)}` : '-'}
          </span>
        </td>
      )}

      {/* Position PnL (token view only) */}
      {selectedToken && (
        <td className="px-3 py-2.5 md:px-4 md:py-3">
          <span className={cn(
            'font-mono text-sm mono-nums',
            (positionPnl || 0) > 0 ? 'text-electric-lime' : (positionPnl || 0) < 0 ? 'text-short' : 'text-gray-400'
          )}>
            {positionPnl != null ? formatUSD(positionPnl) : '-'}
          </span>
        </td>
      )}

      {/* Liquidation Price (token view only) */}
      {selectedToken && (
        <td className="px-3 py-2.5 md:px-4 md:py-3">
          <span className="font-mono text-sm mono-nums text-gray-200">
            {liquidationPrice != null ? `$${formatPrice(liquidationPrice)}` : '-'}
          </span>
        </td>
      )}
    </motion.tr>
  );
});
