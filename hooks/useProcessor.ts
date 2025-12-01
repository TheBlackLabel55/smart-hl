'use client';

/**
 * Trade Processor Hook
 * The "Brain" - Processes raw Hyperliquid trades and enriches with Smart Money data
 */

import { useCallback, useRef } from 'react';
import { useStore, useSmartMoneyMap } from '@/store/useStore';
import type { HyperliquidTrade, UnifiedTradeLog } from '@/types';
import { generateTradeId } from '@/lib/utils';

// Thresholds
const WHALE_THRESHOLD_USD = 100_000;
const NOISE_THRESHOLD_USD = 1_000; // Ignore trades under $1k from unknown wallets
const BATCH_INTERVAL_MS = 100; // Batch trades every 100ms for performance

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

    // Parse price and size
    const price = parseFloat(rawTrade.px);
    const size = parseFloat(rawTrade.sz);
    const sizeUsd = price * size;

    // Extract wallet addresses (Maker and Taker)
    const [maker, taker] = rawTrade.users;
    
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
    if (!isSmart && !isWhale && sizeUsd < NOISE_THRESHOLD_USD) {
      stats.current.filtered++;
      return null;
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
    }

    return trade;
  }, [smartMoneyMap]);

  /**
   * Main handler for incoming trades
   * Batches trades for efficient store updates
   */
  const handleTrade = useCallback((rawTrade: HyperliquidTrade) => {
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

