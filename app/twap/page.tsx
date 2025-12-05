'use client';

/**
 * TWAP Page
 * Shows all wallets with active TWAP orders
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';
import { useSmartWallets } from '@/hooks/useSmartWallets';
import { cn, formatUSD, truncateAddress } from '@/lib/utils';
import { EXPLORER_URL } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import type { WalletStats, ActiveTwap } from '@/types';

interface TwapRowProps {
  wallet: WalletStats;
  twap: ActiveTwap;
  index: number;
}

function TwapRow({ wallet, twap, index }: TwapRowProps) {
  const isLong = twap.side === 'Long';
  const hours = Math.floor(twap.minutesRemaining / 60);
  const minutes = twap.minutesRemaining % 60;
  const timeRemaining = hours > 0 
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="border-b border-gunmetal-700/50 hover:bg-white/[0.02] transition-colors"
    >
      {/* Wallet Address */}
      <td className="px-4 py-3">
        <a
          href={`${EXPLORER_URL}/address/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-mono text-sm text-electric-lime hover:text-electric-lime/80 transition-colors"
        >
          {truncateAddress(wallet.address, 4)}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </td>

      {/* Token */}
      <td className="px-4 py-3">
        <span className={cn(
          'font-semibold tracking-wide text-sm',
          twap.coin === 'BTC' && 'text-orange-400',
          twap.coin === 'ETH' && 'text-blue-400',
          !['BTC', 'ETH'].includes(twap.coin) && 'text-gray-200'
        )}>
          {twap.coin}
        </span>
      </td>

      {/* Side */}
      <td className="px-4 py-3">
        <span className={cn(
          'px-3 py-1 rounded text-xs font-bold uppercase tracking-wider',
          isLong 
            ? 'bg-electric-lime/20 text-electric-lime border border-electric-lime/30' 
            : 'bg-hyper-violet/20 text-hyper-violet border border-hyper-violet/30'
        )}>
          {twap.side}
        </span>
      </td>

      {/* Size */}
      <td className="px-4 py-3">
        <span className="font-mono text-sm mono-nums text-gray-200">
          {formatUSD(twap.sizeUsd)}
        </span>
      </td>

      {/* Time Remaining */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="font-mono text-sm text-gray-300">
            {timeRemaining}
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={cn(
          'px-2 py-1 rounded text-xs font-mono font-semibold',
          twap.minutesRemaining > 30
            ? 'bg-electric-lime/20 text-electric-lime border border-electric-lime/30'
            : twap.minutesRemaining > 10
            ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
            : 'bg-red-500/20 text-red-500 border border-red-500/30'
        )}>
          {twap.minutesRemaining > 30 ? 'Active' : twap.minutesRemaining > 10 ? 'Ending Soon' : 'Final Minutes'}
        </span>
      </td>
    </motion.tr>
  );
}

export default function TwapPage() {
  const {
    wallets,
    isLoading,
    error,
  } = useSmartWallets();

  // Filter wallets with active TWAPs and flatten to show each TWAP as a row
  const twapEntries = useMemo(() => {
    const entries: Array<{ wallet: WalletStats; twap: ActiveTwap }> = [];
    
    wallets.forEach(wallet => {
      if (wallet.activeTwaps && wallet.activeTwaps.length > 0) {
        wallet.activeTwaps.forEach(twap => {
          entries.push({ wallet, twap });
        });
      }
    });

    // Sort by time remaining (ascending - soonest first)
    return entries.sort((a, b) => 
      a.twap.minutesRemaining - b.twap.minutesRemaining
    );
  }, [wallets]);

  return (
    <div className="flex flex-col h-screen bg-base-900">
      {/* Header */}
      <div className="border-b border-gunmetal-700 bg-base-900/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-mono text-gray-400 hover:text-electric-lime transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                Active TWAP Orders
              </h1>
            </div>
            <div className="text-sm font-mono text-gray-400">
              {twapEntries.length} Active TWAP{twapEntries.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-electric-lime animate-spin mb-4" />
            <div className="text-sm font-mono text-gray-400">
              Loading TWAP data...
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="text-red-400 font-mono text-sm mb-2">Error</div>
            <div className="text-gray-400 text-sm text-center max-w-md">{error}</div>
          </div>
        )}

        {/* TWAP Table */}
        {!isLoading && !error && (
          <>
            {twapEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <Clock className="w-12 h-12 text-gray-600 mb-4" />
                <div className="text-gray-400 font-mono text-sm text-center max-w-md">
                  No active TWAP orders found
                </div>
              </div>
            ) : (
              <div className="px-6 py-4">
                <motion.table
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-full border-collapse"
                >
                  <thead>
                    <tr className="border-b border-gunmetal-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Wallet
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Token
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Side
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Time Remaining
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {twapEntries.map((entry, index) => (
                      <TwapRow
                        key={`${entry.wallet.address}-${entry.twap.coin}-${index}`}
                        wallet={entry.wallet}
                        twap={entry.twap}
                        index={index}
                      />
                    ))}
                  </tbody>
                </motion.table>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-gunmetal-700 bg-base-900/80 backdrop-blur-sm px-4 py-2 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span>Smart-HL</span>
            <span className="text-gunmetal-600">|</span>
            <span>TWAP Tracker</span>
            <span className="text-gunmetal-600">|</span>
            <span>{twapEntries.length} Active Orders</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono">
            <a 
              href="https://hypurrscan.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-electric-lime transition-colors"
            >
              hypurrscan.io
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
