'use client';

/**
 * WalletCard Component
 * Mobile card view for wallet statistics
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from './icons';
import type { WalletStats } from '@/types';
import { cn, formatUSD, truncateAddress } from '@/lib/utils';
import { EXPLORER_URL } from '@/lib/constants';

interface WalletCardProps {
  wallet: WalletStats;
  index: number;
  selectedToken?: string | null;
}

export const WalletCard = memo(function WalletCard({ wallet, index, selectedToken }: WalletCardProps) {
  const isError = wallet.error;

  const getDisplayData = () => {
    if (selectedToken) {
      const position = wallet.positions?.find(p => p.coin === selectedToken);
      if (position) {
        return {
          side: position.side,
          size: position.sizeUsd,
        };
      }
      return { side: null as null, size: 0 };
    }
    const netLong = (wallet.longPosition || 0) - (wallet.shortPosition || 0);
    const totalSize = (wallet.longPosition || 0) + (wallet.shortPosition || 0);
    return {
      side: netLong > 0 ? 'Long' as const : netLong < 0 ? 'Short' as const : null,
      size: totalSize,
    };
  };

  const { side, size } = getDisplayData();
  const totalExposure = size;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      className={cn(
        'p-4 sm:p-5 rounded-lg border border-electric-lime/20 bg-base-800/50',
        'hover:border-electric-lime/40 hover:bg-base-800/70 transition-all',
        'backdrop-blur-sm',
        isError && 'opacity-50'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <a
          href={`${EXPLORER_URL}/address/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 font-mono text-sm font-semibold',
            'text-electric-lime hover:text-electric-lime/80 transition-colors',
            isError && 'text-gray-500'
          )}
        >
          {truncateAddress(wallet.address, 6)}
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wide border',
              side === 'Long'
                ? 'bg-electric-lime/15 text-electric-lime border-electric-lime/40'
                : side === 'Short'
                ? 'bg-hyper-violet/15 text-hyper-violet border-hyper-violet/40'
                : 'bg-gunmetal-700/40 text-gray-300 border-gunmetal-500'
            )}
          >
            {side ?? 'N/A'}
          </span>
          <span className="text-xs font-mono text-gray-300">
            {totalExposure > 0 ? formatUSD(totalExposure) : 'No position'}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* PnL Section */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wider">PnL</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">1D:</span>
              <span className={cn(
                'font-mono text-xs mono-nums',
                wallet.pnl1d > 0 ? 'text-electric-lime' : wallet.pnl1d < 0 ? 'text-short' : 'text-gray-400'
              )}>
                {formatUSD(wallet.pnl1d)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">7D:</span>
              <span className={cn(
                'font-mono text-xs mono-nums font-semibold',
                wallet.pnl7d > 0 
                  ? 'text-electric-lime' 
                  : wallet.pnl7d < 0 
                  ? 'text-short' 
                  : 'text-gray-400'
              )}>
                {formatUSD(wallet.pnl7d)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">30D:</span>
              <span className={cn(
                'font-mono text-xs mono-nums',
                wallet.pnl30d > 0 ? 'text-electric-lime' : wallet.pnl30d < 0 ? 'text-short' : 'text-gray-400'
              )}>
                {formatUSD(wallet.pnl30d)}
              </span>
            </div>
          </div>
        </div>

        {/* Win Rate Section */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Win Rate</div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">7D:</span>
              <div className="flex items-center gap-1.5">
                <div className="relative w-8 h-8">
                  <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gunmetal-700"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
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
                    'absolute inset-0 flex items-center justify-center text-[8px] font-mono font-semibold',
                    wallet.winRate7d >= 60 ? 'text-electric-lime' : 
                    wallet.winRate7d >= 40 ? 'text-neon-cyan' : 
                    'text-short'
                  )}>
                    {Math.round(wallet.winRate7d)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">30D:</span>
              <div className="flex items-center gap-1.5">
                <div className="relative w-8 h-8">
                  <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gunmetal-700"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
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
                    'absolute inset-0 flex items-center justify-center text-[8px] font-mono font-semibold',
                    wallet.winRate30d >= 60 ? 'text-electric-lime' : 
                    wallet.winRate30d >= 40 ? 'text-neon-cyan' : 
                    'text-short'
                  )}>
                    {Math.round(wallet.winRate30d)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Volume Section */}
        <div className="space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Volume</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">7D:</span>
              <span className="font-mono text-xs mono-nums text-gray-300">
                {formatUSD(wallet.volume7d)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">30D:</span>
              <span className="font-mono text-xs mono-nums text-gray-300">
                {formatUSD(wallet.volume30d)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
