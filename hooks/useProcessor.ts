'use client';

/**
 * Trade Processor Hook
 * The "Brain" - Processes raw Hyperliquid trades and enriches with Smart Money data
 * 
 * DEBUG MODE: Relaxed filters to show more trades
 */

import { useCallback, useRef } from 'react';
import { useStore, useSmartMoneyMap } from '@/store/useStore';
import type { HyperliquidTrade, UnifiedTradeLog } from '@/types';
import { generateTradeId } from '@/lib/utils';

// Thresholds - RELAXED FOR DEBUGGING
const WHALE_THRESHOLD_USD = 100_000;
const NOISE_THRESHOLD_USD = 100; // Lowered from $1k to $100 for debugging
const BATCH_INTERVAL_MS = 100; // Batch trades every 100ms for performance

// DEBUG: Set to true to let ALL trades through (for testing)
const DEBUG_SHOW_ALL_TRADES = true;

export interface ProcessorStats {
  processed: number;
  filtered: number;
  enriched: number;
}

export function useProcessor() {
  const smartMoneyMap = useSmartMoneyMap();
  const { addTrades } = useStore();
  
  // Batch buffer for performance
  const batchBuffer = useRef<UnifiedTradeLog[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Stats
  const stats = useRef<ProcessorStats>({
    processed: 0,
    filtered: 0,
    enriched: 0,
  });

  /**
   * Flush batched trades to store
   */
  const flushBatch = useCallback(() => {
    if (batchBuffer.current.length > 0) {
      console.log(`[Processor] 📤 Flushing ${batchBuffer.current.length} trades to store`);
      addTrades(batchBuffer.current);
      batchBuffer.current = [];
    }
    batchTimeout.current = null;
  }, [addTrades]);

  /**
   * Process a single raw trade from Hyperliquid WS
   */
  const processTrade = useCallback((rawTrade: HyperliquidTrade): UnifiedTradeLog | null => {
    stats.current.processed++;
    
    // Debug log every 10th trade
    if (stats.current.processed % 10 === 1) {
      console.log(`[Processor] 🔍 Processing trade #${stats.current.processed}:`, rawTrade);
    }

    // Parse price and size
    const price = parseFloat(rawTrade.px);
    const size = parseFloat(rawTrade.sz);
    const sizeUsd = price * size;

    // Extract wallet addresses (Maker and Taker)
    const [maker, taker] = rawTrade.users || ['unknown', 'unknown'];
    
    // Check both addresses against Smart Money map
    const makerLower = maker.toLowerCase();
    const takerLower = taker.toLowerCase();
    
    const makerData = smartMoneyMap[makerLower];
    const takerData = smartMoneyMap[takerLower];
    
    // Determine if this is a "Smart" trade
    const isSmart = Boolean(makerData || takerData);
    const smartWalletData = makerData || takerData;
    const smartWalletAddress = makerData ? maker : taker;

    // Determine if this is a "Whale" trade
    const isWhale = sizeUsd >= WHALE_THRESHOLD_USD;

    // NOISE FILTER: Skip small trades from unknown wallets
    // DEBUG: Disabled when DEBUG_SHOW_ALL_TRADES is true
    if (!DEBUG_SHOW_ALL_TRADES) {
      if (!isSmart && !isWhale && sizeUsd < NOISE_THRESHOLD_USD) {
        stats.current.filtered++;
        return null;
      }
    }

    // Build unified trade log
    const trade: UnifiedTradeLog = {
      id: generateTradeId(rawTrade.tid, rawTrade.hash),
      timestamp: rawTrade.time,
      ticker: rawTrade.coin,
      // "B" = Bid = Buy = Long, "A" = Ask = Sell = Short
      side: rawTrade.side === 'B' ? 'Long' : 'Short',
      price,
      sizeUsd,
      walletAddress: isSmart ? smartWalletAddress : (isWhale ? taker : maker),
      walletLabel: smartWalletData?.labels?.[0] || (isWhale ? 'Whale' : undefined),
      isWhale,
      isSmart,
      txHash: rawTrade.hash,
    };

    if (isSmart) {
      stats.current.enriched++;
      console.log('[Processor] 🌟 SMART MONEY TRADE:', trade);
    }

    if (isWhale) {
      console.log('[Processor] 🐋 WHALE TRADE:', trade);
    }

    return trade;
  }, [smartMoneyMap]);

  /**
   * Main handler for incoming trades
   * Batches trades for efficient store updates
   */
  const handleTrade = useCallback((rawTrade: HyperliquidTrade) => {
    console.log('[Processor] 📥 Received raw trade:', rawTrade.coin, rawTrade.px, rawTrade.sz);
    
    const processedTrade = processTrade(rawTrade);
    
    if (processedTrade) {
      batchBuffer.current.push(processedTrade);
      
      // Set up batch flush if not already scheduled
      if (!batchTimeout.current) {
        batchTimeout.current = setTimeout(flushBatch, BATCH_INTERVAL_MS);
      }
    }
  }, [processTrade, flushBatch]);

  /**
   * Get current processor stats
   */
  const getStats = useCallback((): ProcessorStats => {
    return { ...stats.current };
  }, []);

  /**
   * Reset processor stats
   */
  const resetStats = useCallback(() => {
    stats.current = {
      processed: 0,
      filtered: 0,
      enriched: 0,
    };
  }, []);

  return {
    handleTrade,
    processTrade,
    getStats,
    resetStats,
    flushBatch,
  };
}
