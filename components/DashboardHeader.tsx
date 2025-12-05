'use client';

/**
 * DashboardHeader Component
 * Global market dashboard showing Long vs Short positions
 */

import { memo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Clock } from './icons';
import { cn, formatUSD } from '@/lib/utils';

interface DashboardHeaderProps {
  totalLong: number;
  totalShort: number;
  isLoading?: boolean;
}

export const DashboardHeader = memo(function DashboardHeader({
  totalLong,
  totalShort,
  isLoading = false,
}: DashboardHeaderProps) {
  const total = totalLong + totalShort;
  const longPercentage = total > 0 ? (totalLong / total) * 100 : 50;
  const shortPercentage = total > 0 ? (totalShort / total) * 100 : 50;
  const netPosition = totalLong - totalShort;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b border-gunmetal-700 bg-base-900/80 backdrop-blur-sm md:max-h-none max-h-[30vh] overflow-hidden md:overflow-visible"
    >
      <div className="px-4 sm:px-6 py-2 md:py-4 lg:py-5">
        <div className="flex flex-col gap-2 md:gap-3 md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
          <h1 className="text-lg md:text-2xl font-display font-bold text-white tracking-tight">
            Smart-HL Dashboard
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 md:gap-3">
            <Link
              href="/twap"
              className={cn(
                'flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-mono font-semibold min-h-[36px] md:min-h-[44px]',
                'border border-electric-lime/30 rounded transition-all',
                'text-electric-lime hover:bg-electric-lime/10 hover:border-electric-lime/50',
                'hover:shadow-neon-green w-full sm:w-auto'
              )}
            >
              <Clock className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">TWAP Tracker</span>
              <span className="sm:hidden">TWAP</span>
            </Link>
            {isLoading && (
              <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-400 font-mono min-h-[36px] md:min-h-[44px]">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-electric-lime animate-pulse" />
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Long vs Short Visualization */}
        <div className="space-y-2 md:space-y-4">
          {/* Polarized Bar Chart */}
          <div className="relative h-8 md:h-10 lg:h-12 bg-gunmetal-800/50 rounded-lg overflow-hidden border border-gunmetal-700">
            {/* Long Bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${longPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'absolute left-0 top-0 h-full bg-gradient-to-r',
                'from-electric-lime/80 to-electric-lime/40',
                'flex items-center justify-start pl-2 md:pl-4'
              )}
            >
              <div className="flex items-center gap-1 md:gap-2">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-base-900" />
                <span className="font-mono text-[10px] md:text-xs font-semibold text-base-900">
                  LONG {longPercentage.toFixed(1)}%
                </span>
              </div>
            </motion.div>

            {/* Short Bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${shortPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className={cn(
                'absolute right-0 top-0 h-full bg-gradient-to-l',
                'from-hyper-violet/80 to-hyper-violet/40',
                'flex items-center justify-end pr-2 md:pr-4'
              )}
            >
              <div className="flex items-center gap-1 md:gap-2">
                <span className="font-mono text-[10px] md:text-xs font-semibold text-white">
                  SHORT {shortPercentage.toFixed(1)}%
                </span>
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </div>
            </motion.div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-1.5 md:gap-3 lg:gap-4">
            {/* Total Long */}
            <div className="bg-gunmetal-800/30 rounded-lg p-2 md:p-3 border border-electric-lime/20">
              <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-0.5 md:mb-1">
                Total Long
              </div>
              <div className="text-sm md:text-lg font-mono font-bold text-electric-lime mono-nums">
                {formatUSD(totalLong)}
              </div>
            </div>

            {/* Net Position */}
            <div className={cn(
              'bg-gunmetal-800/30 rounded-lg p-2 md:p-3 border',
              netPosition > 0 
                ? 'border-electric-lime/20' 
                : netPosition < 0 
                ? 'border-hyper-violet/20' 
                : 'border-gunmetal-700'
            )}>
              <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-0.5 md:mb-1">
                Net Position
              </div>
              <div className={cn(
                'text-sm md:text-lg font-mono font-bold mono-nums',
                netPosition > 0 
                  ? 'text-electric-lime' 
                  : netPosition < 0 
                  ? 'text-hyper-violet' 
                  : 'text-gray-400'
              )}>
                {formatUSD(Math.abs(netPosition))}
                <span className="hidden md:inline">{netPosition > 0 ? ' ↗' : netPosition < 0 ? ' ↘' : ''}</span>
              </div>
            </div>

            {/* Total Short */}
            <div className="bg-gunmetal-800/30 rounded-lg p-2 md:p-3 border border-hyper-violet/20">
              <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider mb-0.5 md:mb-1">
                Total Short
              </div>
              <div className="text-sm md:text-lg font-mono font-bold text-hyper-violet mono-nums">
                {formatUSD(totalShort)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
