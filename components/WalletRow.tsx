'use client';

/**
 * WalletRow Component
 * Desktop table row for wallet statistics
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import type { WalletStats } from '@/types';
import { cn, formatUSD, truncateAddress } from '@/lib/utils';
import { EXPLORER_URL } from '@/lib/constants';

interface WalletRowProps {
  wallet: WalletStats;
  index: number;
}

export const WalletRow = memo(function WalletRow({ wallet, index }: WalletRowProps) {
  const isPositive = wallet.pnl7d > 0;
  const isError = wallet.error;

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
      <td className="px-4 py-3">
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

      {/* 1D PnL */}
      <td className="px-4 py-3">
        <span className={cn(
          'font-mono text-sm mono-nums',
          wallet.pnl1d > 0 ? 'text-electric-lime' : wallet.pnl1d < 0 ? 'text-short' : 'text-gray-400'
        )}>
          {formatUSD(wallet.pnl1d)}
        </span>
      </td>

      {/* 7D PnL */}
      <td className="px-4 py-3">
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
      <td className="px-4 py-3">
        <span className={cn(
          'font-mono text-sm mono-nums',
          wallet.pnl30d > 0 ? 'text-electric-lime' : wallet.pnl30d < 0 ? 'text-short' : 'text-gray-400'
        )}>
          {formatUSD(wallet.pnl30d)}
        </span>
      </td>

      {/* 7D Win Rate */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
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
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
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

      {/* 7D Volume */}
      <td className="px-4 py-3">
        <span className="font-mono text-sm mono-nums text-gray-300">
          {formatUSD(wallet.volume7d)}
        </span>
      </td>

      {/* 30D Volume */}
      <td className="px-4 py-3">
        <span className="font-mono text-sm mono-nums text-gray-300">
          {formatUSD(wallet.volume30d)}
        </span>
      </td>

      {/* TWAP */}
      <td className="px-4 py-3">
        <span className="font-mono text-sm mono-nums text-gray-400">
          ${wallet.twap.toFixed(2)}
        </span>
      </td>
    </motion.tr>
  );
});
