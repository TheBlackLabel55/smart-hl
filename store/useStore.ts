/**
 * Global State Management with Zustand
 * Manages: Trade feed, Smart Money cache, WebSocket connection state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UnifiedTradeLog, SmartWalletMap } from '@/types';

// Connection states
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Filter options
export interface FilterOptions {
  showSmartOnly: boolean;
  showWhalesOnly: boolean;
  minTradeSize: number;
  selectedCoins: string[];
}

// Store state interface
interface StoreState {
  // Smart Money Cache
  smartMoneyMap: SmartWalletMap;
  smartMoneyCacheTimestamp: number | null;
  isLoadingSmartMoney: boolean;

  // Live Trade Feed
  trades: UnifiedTradeLog[];
  maxTrades: number;

  // WebSocket Connection
  connectionStatus: ConnectionStatus;
  lastMessageTime: number | null;
  messageCount: number;
  errorMessage: string | null;

  // Filters
  filters: FilterOptions;

  // Statistics
  stats: {
    totalTrades: number;
    smartTrades: number;
    whaleTrades: number;
    totalVolume: number;
  };

  // Actions
  setSmartMoneyMap: (map: SmartWalletMap) => void;
  setLoadingSmartMoney: (loading: boolean) => void;
  addTrade: (trade: UnifiedTradeLog) => void;
  addTrades: (trades: UnifiedTradeLog[]) => void;
  clearTrades: () => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setErrorMessage: (message: string | null) => void;
  updateLastMessageTime: () => void;
  setFilters: (filters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  incrementMessageCount: () => void;
}

// Default filter values
const defaultFilters: FilterOptions = {
  showSmartOnly: false,
  showWhalesOnly: false,
  minTradeSize: 0,
  selectedCoins: [],
};

// Create the store with selector subscription support
export const useStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    smartMoneyMap: {},
    smartMoneyCacheTimestamp: null,
    isLoadingSmartMoney: false,

    trades: [],
    maxTrades: 100, // Keep last 100 trades in memory

    connectionStatus: 'disconnected',
    lastMessageTime: null,
    messageCount: 0,
    errorMessage: null,

    filters: defaultFilters,

    stats: {
      totalTrades: 0,
      smartTrades: 0,
      whaleTrades: 0,
      totalVolume: 0,
    },

    // Actions
    setSmartMoneyMap: (map) => {
      // Direct assignment - API now returns SmartWalletMap format
      set({
        smartMoneyMap: map,
        smartMoneyCacheTimestamp: Date.now(),
      });
    },

    setLoadingSmartMoney: (loading) => {
      set({ isLoadingSmartMoney: loading });
    },

    addTrade: (trade) => {
      const { trades, maxTrades, stats } = get();
      
      // Update statistics
      const newStats = {
        totalTrades: stats.totalTrades + 1,
        smartTrades: stats.smartTrades + (trade.isSmart ? 1 : 0),
        whaleTrades: stats.whaleTrades + (trade.isWhale ? 1 : 0),
        totalVolume: stats.totalVolume + trade.sizeUsd,
      };

      // Add trade to front, maintain max limit
      const newTrades = [trade, ...trades].slice(0, maxTrades);

      set({
        trades: newTrades,
        stats: newStats,
      });
    },

    addTrades: (newTrades) => {
      const { trades, maxTrades, stats } = get();
      
      // Batch update statistics
      let smartCount = 0;
      let whaleCount = 0;
      let volume = 0;

      for (const trade of newTrades) {
        if (trade.isSmart) smartCount++;
        if (trade.isWhale) whaleCount++;
        volume += trade.sizeUsd;
      }

      const newStats = {
        totalTrades: stats.totalTrades + newTrades.length,
        smartTrades: stats.smartTrades + smartCount,
        whaleTrades: stats.whaleTrades + whaleCount,
        totalVolume: stats.totalVolume + volume,
      };

      // Merge and dedupe by ID
      const existingIds = new Set(trades.map(t => t.id));
      const uniqueNewTrades = newTrades.filter(t => !existingIds.has(t.id));
      const mergedTrades = [...uniqueNewTrades, ...trades].slice(0, maxTrades);

      set({
        trades: mergedTrades,
        stats: newStats,
      });
    },

    clearTrades: () => {
      set({
        trades: [],
        stats: {
          totalTrades: 0,
          smartTrades: 0,
          whaleTrades: 0,
          totalVolume: 0,
        },
      });
    },

    setConnectionStatus: (status) => {
      set({ connectionStatus: status });
    },

    setErrorMessage: (message) => {
      set({ errorMessage: message });
    },

    updateLastMessageTime: () => {
      set({ lastMessageTime: Date.now() });
    },

    incrementMessageCount: () => {
      set((state) => ({ messageCount: state.messageCount + 1 }));
    },

    setFilters: (newFilters) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      }));
    },

    resetFilters: () => {
      set({ filters: defaultFilters });
    },
  }))
);

// Selector hooks for specific state slices
export const useSmartMoneyMap = () => useStore((state) => state.smartMoneyMap);
export const useTrades = () => useStore((state) => state.trades);
export const useConnectionStatus = () => useStore((state) => state.connectionStatus);
export const useFilters = () => useStore((state) => state.filters);
export const useStats = () => useStore((state) => state.stats);

// Filtered trades selector
export const useFilteredTrades = () => {
  return useStore((state) => {
    const { trades, filters } = state;
    
    return trades.filter((trade) => {
      // Smart Money filter
      if (filters.showSmartOnly && !trade.isSmart) return false;
      
      // Whale filter
      if (filters.showWhalesOnly && !trade.isWhale) return false;
      
      // Min trade size filter
      if (trade.sizeUsd < filters.minTradeSize) return false;
      
      // Coin filter
      if (filters.selectedCoins.length > 0 && !filters.selectedCoins.includes(trade.ticker)) {
        return false;
      }
      
      return true;
    });
  });
};

