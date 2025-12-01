'use client';

/**
 * FilterPanel Component
 * Controls for filtering the trade feed
 */

import { motion } from 'framer-motion';
import { useStore, useFilters } from '@/store/useStore';
import { cn } from '@/lib/utils';

const QUICK_FILTERS = [
  { id: 'smart', label: 'Smart Only', key: 'showSmartOnly' as const },
  { id: 'whales', label: 'Whales Only', key: 'showWhalesOnly' as const },
];

const SIZE_PRESETS = [
  { label: 'All', value: 0 },
  { label: '>$10K', value: 10_000 },
  { label: '>$50K', value: 50_000 },
  { label: '>$100K', value: 100_000 },
];

export function FilterPanel() {
  const filters = useFilters();
  const { setFilters, resetFilters, clearTrades } = useStore();

  return (
    <div className="flex items-center gap-6 px-4 py-3 border-b border-gunmetal-700 bg-base-800/50">
      {/* Quick Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono uppercase tracking-wider text-gray-500 mr-2">
          Filter:
        </span>
        {QUICK_FILTERS.map((filter) => (
          <motion.button
            key={filter.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setFilters({ [filter.key]: !filters[filter.key] })}
            className={cn(
              'px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider rounded',
              'border transition-all duration-200',
              filters[filter.key]
                ? 'bg-neon-green/20 text-neon-green border-neon-green/50 shadow-neon-green'
                : 'bg-transparent text-gray-400 border-gunmetal-600 hover:border-gray-500'
            )}
          >
            {filter.label}
          </motion.button>
        ))}
      </div>

      {/* Size Presets */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono uppercase tracking-wider text-gray-500 mr-2">
          Min Size:
        </span>
        <div className="flex rounded overflow-hidden border border-gunmetal-600">
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setFilters({ minTradeSize: preset.value })}
              className={cn(
                'px-3 py-1.5 text-xs font-mono font-semibold transition-colors duration-200',
                filters.minTradeSize === preset.value
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'bg-transparent text-gray-500 hover:text-gray-300'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={resetFilters}
          className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
        >
          Reset
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={clearTrades}
          className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-neon-pink/70 hover:text-neon-pink border border-neon-pink/30 hover:border-neon-pink/50 rounded transition-colors"
        >
          Clear Feed
        </motion.button>
      </div>
    </div>
  );
}

