'use client';

/**
 * Main Dashboard Page
 * Smart-HL - Hyperliquid Smart Money Tracker Dashboard
 */

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { TokenFilterPanel } from '@/components/TokenFilterPanel';
import { WalletRow } from '@/components/WalletRow';
import { WalletCard } from '@/components/WalletCard';
import { SortableTableHeader } from '@/components/SortableTableHeader';
import { useSmartWallets } from '@/hooks/useSmartWallets';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const {
    wallets,
    isLoading,
    error,
    progress,
    totalLong,
    totalShort,
    sortField,
    sortDirection,
    handleSort,
    hasMore,
    loadMore,
    selectedToken,
    setSelectedToken,
    availableTokens,
  } = useSmartWallets();

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [isLoading, hasMore, loadMore]);

  return (
    <div className="flex flex-col min-h-screen bg-base-900">
      {/* Dashboard Header */}
      <DashboardHeader
        totalLong={totalLong}
        totalShort={totalShort}
        isLoading={isLoading}
      />

      {/* Token Filter Panel */}
      {!isLoading && !error && availableTokens.length > 0 && (
        <TokenFilterPanel
          availableTokens={availableTokens}
          selectedToken={selectedToken}
          onTokenChange={setSelectedToken}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-electric-lime animate-spin mb-4" />
            <div className="text-sm font-mono text-gray-400 mb-2">
              System Loading... {progress}%
            </div>
            <div className="w-64 h-1 bg-gunmetal-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-electric-lime"
              />
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

        {/* Desktop Table View (md and above) */}
        {!isLoading && !error && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
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
                      <SortableTableHeader
                        field="pnl1d"
                        label="1D PnL"
                        currentSort={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        field="pnl7d"
                        label="7D PnL"
                        currentSort={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        field="pnl30d"
                        label="30D PnL"
                        currentSort={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        field="winRate7d"
                        label="7D Win Rate"
                        currentSort={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        field="winRate30d"
                        label="30D Win Rate"
                        currentSort={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        field="volume7d"
                        label="7D Volume"
                        currentSort={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        field="volume30d"
                        label="30D Volume"
                        currentSort={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableTableHeader
                        field="twap"
                        label="TWAP"
                        currentSort={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map((wallet, index) => (
                      <WalletRow key={wallet.address} wallet={wallet} index={index} />
                    ))}
                  </tbody>
                </motion.table>
                
                {/* Infinite Scroll Sentinel */}
                {hasMore && (
                  <div ref={sentinelRef} className="h-10 flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 text-electric-lime animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Card Grid (below md) */}
            <div className="md:hidden px-4 py-4">
              <div className="grid grid-cols-1 gap-4">
                {wallets.map((wallet, index) => (
                  <WalletCard key={wallet.address} wallet={wallet} index={index} />
                ))}
              </div>
              
              {/* Infinite Scroll Sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="h-10 flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-electric-lime animate-spin" />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-gunmetal-700 bg-base-900/80 backdrop-blur-sm px-4 py-2 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span>Smart-HL</span>
            <span className="text-gunmetal-600">|</span>
            <span>Hyperliquid</span>
            <span className="text-gunmetal-600">|</span>
            <span>{wallets.length} Wallets</span>
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
            <span className="text-gunmetal-600">|</span>
            <span className="text-gray-600">
              Cache: 5min
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

