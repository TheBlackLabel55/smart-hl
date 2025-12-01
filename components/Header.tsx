'use client';

/**
 * Header Component
 * Main navigation and branding
 */

import { motion } from 'framer-motion';
import { useConnectionStatus, useStats } from '@/store/useStore';
import { cn, formatUSD } from '@/lib/utils';

export function Header() {
  const connectionStatus = useConnectionStatus();
  const stats = useStats();

  return (
    <header className="relative border-b border-gunmetal-700 bg-base-900/80 backdrop-blur-md">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
      
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-4">
          {/* Logo mark */}
          <motion.div
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative w-10 h-10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/20 to-neon-cyan/20 rounded-lg" />
            <div className="absolute inset-[2px] bg-base-900 rounded-lg flex items-center justify-center">
              <span className="text-neon-green text-xl font-bold">⚡</span>
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 bg-neon-green/20 rounded-lg blur-md -z-10" />
          </motion.div>

          <div>
            <motion.h1
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-display text-xl font-bold tracking-tight"
            >
              <span className="text-white">SMART</span>
              <span className="text-neon-green">-</span>
              <span className="text-neon-cyan">PERP</span>
              <span className="text-gray-500 font-normal text-sm ml-2">v2</span>
            </motion.h1>
            <motion.p
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-mono text-gray-500 tracking-wider"
            >
              HYPERLIQUID SMART MONEY TRACKER
            </motion.p>
          </div>
        </div>

        {/* Live Stats */}
        <div className="flex items-center gap-8">
          {/* Volume */}
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-right"
          >
            <p className="text-xs font-mono uppercase tracking-wider text-gray-500">
              Session Volume
            </p>
            <p className="text-lg font-mono font-bold text-white mono-nums">
              {formatUSD(stats.totalVolume)}
            </p>
          </motion.div>

          {/* Connection Status Pill */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full border',
              connectionStatus === 'connected' && 'border-neon-green/50 bg-neon-green/10',
              connectionStatus === 'connecting' && 'border-yellow-500/50 bg-yellow-500/10',
              connectionStatus === 'error' && 'border-red-500/50 bg-red-500/10',
              connectionStatus === 'disconnected' && 'border-gray-500/50 bg-gray-500/10'
            )}
          >
            <div className={cn(
              'w-2 h-2 rounded-full',
              connectionStatus === 'connected' && 'bg-neon-green animate-pulse',
              connectionStatus === 'connecting' && 'bg-yellow-500 animate-ping',
              connectionStatus === 'error' && 'bg-red-500',
              connectionStatus === 'disconnected' && 'bg-gray-500'
            )} />
            <span className={cn(
              'text-xs font-mono uppercase tracking-wider',
              connectionStatus === 'connected' && 'text-neon-green',
              connectionStatus === 'connecting' && 'text-yellow-500',
              connectionStatus === 'error' && 'text-red-500',
              connectionStatus === 'disconnected' && 'text-gray-500'
            )}>
              {connectionStatus}
            </span>
          </motion.div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-neon-green/30 via-neon-cyan/30 to-neon-pink/30" />
    </header>
  );
}

