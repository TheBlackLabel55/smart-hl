'use client';

/**
 * Main Dashboard Page
 * Smart-Perp V2 - Hyperliquid Smart Money Tracker
 */

import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { FilterPanel } from '@/components/FilterPanel';
import { LiveFeed } from '@/components/LiveFeed';

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Filter Panel */}
        <FilterPanel />

        {/* Live Feed Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex-1 relative overflow-hidden card-terminal m-4 rounded-lg"
        >
          {/* Terminal Header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gunmetal-700 bg-base-900/50">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            
            {/* Terminal title */}
            <span className="ml-3 text-xs font-mono text-gray-500 tracking-wider">
              ~/hyperliquid/live-feed
            </span>
            
            {/* Blinking cursor */}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-neon-green font-mono"
            >
              █
            </motion.span>
          </div>

          {/* Live Feed */}
          <div className="flex-1 h-[calc(100%-40px)]">
            <LiveFeed />
          </div>
        </motion.div>
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-gunmetal-700 bg-base-900/80 backdrop-blur-sm px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span>Smart-Perp V2</span>
            <span className="text-gunmetal-600">|</span>
            <span>Hyperliquid</span>
            <span className="text-gunmetal-600">|</span>
            <span>Nansen Pro</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono">
            <a 
              href="https://hyperliquid.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-neon-cyan transition-colors"
            >
              hyperliquid.xyz
            </a>
            <span className="text-gunmetal-600">|</span>
            <span className="text-gray-600">
              Cache refresh: Every 12h
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

