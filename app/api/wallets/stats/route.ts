/**
 * API Route: Get Wallet Statistics
 * Batches requests to Hypurrscan API with rate limiting and caching
 */

import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { STATIC_SMART_WALLETS } from '@/lib/data/static-wallets';
import type { WalletStats, WalletStatsResponse } from '@/types';

// Configuration
const CHUNK_SIZE = 8; // Process 8 wallets at a time
const DELAY_MS = 300; // 300ms delay between chunks
const CACHE_TTL = 5 * 60; // 5 minutes in seconds

// Hypurrscan API base URL (adjust if needed)
// Set HYPURRSCAN_API_BASE environment variable to override
const HYPURRSCAN_API_BASE = process.env.HYPURRSCAN_API_BASE || 'https://hypurrscan.io/api';

/**
 * Generate mock data for development
 * Remove this when real API is available
 */
function generateMockStats(address: string): WalletStats {
  // Generate realistic-looking mock data
  const seed = address.slice(2, 10); // Use address as seed for consistency
  const seedNum = parseInt(seed, 16);
  
  const pnl1d = (seedNum % 100000) - 50000;
  const pnl7d = (seedNum % 500000) - 250000;
  const pnl30d = (seedNum % 2000000) - 1000000;
  const winRate7d = 30 + (seedNum % 50);
  const winRate30d = 35 + (seedNum % 45);
  const volume7d = (seedNum % 5000000) + 100000;
  const volume30d = volume7d * 4 + (seedNum % 10000000);
  const twap = 50000 + (seedNum % 20000);
  const longPosition = (seedNum % 2000000) + 50000;
  const shortPosition = (seedNum % 1500000) + 30000;

  // Common tokens for mock data
  const tokens = ['BTC', 'ETH', 'SOL', 'ARB', 'MATIC', 'AVAX', 'LINK', 'UNI'];
  
  // Generate positions (1-4 positions per wallet)
  const numPositions = 1 + (seedNum % 4);
  const positions = [];
  for (let i = 0; i < numPositions; i++) {
    const tokenIndex = (seedNum + i) % tokens.length;
    const positionSize = (seedNum % 500000) + 10000;
    const side = (seedNum + i) % 2 === 0 ? 'Long' : 'Short';
    positions.push({
      coin: tokens[tokenIndex],
      sizeUsd: positionSize,
      side: side as 'Long' | 'Short',
    });
  }

  // Generate active TWAPs (0-2 TWAPs per wallet, ~30% chance)
  const activeTwaps = [];
  if ((seedNum % 10) < 3) {
    const numTwaps = 1 + (seedNum % 2);
    for (let i = 0; i < numTwaps; i++) {
      const tokenIndex = (seedNum + i + 5) % tokens.length;
      const twapSize = (seedNum % 300000) + 5000;
      const side = (seedNum + i + 3) % 2 === 0 ? 'Long' : 'Short';
      const minutesRemaining = 5 + (seedNum % 55); // 5-60 minutes
      activeTwaps.push({
        coin: tokens[tokenIndex],
        sizeUsd: twapSize,
        side: side as 'Long' | 'Short',
        minutesRemaining,
      });
    }
  }

  return {
    address: address.toLowerCase(),
    pnl1d,
    pnl7d,
    pnl30d,
    winRate7d,
    winRate30d,
    volume7d,
    volume30d,
    twap,
    longPosition,
    shortPosition,
    positions,
    activeTwaps,
    error: false,
  };
}

/**
 * Fetch stats for a single wallet from Hypurrscan API
 * Returns error state object if request fails
 */
async function fetchWalletStats(address: string): Promise<WalletStats> {
  // DEVELOPMENT MODE: Use mock data if API is not configured
  // Set USE_MOCK_DATA=false in environment to use real API
  const useMockData = process.env.USE_MOCK_DATA !== 'false';
  
  if (useMockData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));
    return generateMockStats(address);
  }

  try {
    // TODO: Replace with actual Hypurrscan API endpoint
    // Example: https://hypurrscan.io/api/v1/wallet/{address}/stats
    const response = await fetch(`${HYPURRSCAN_API_BASE}/wallet/${address}/stats`, {
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    // Map API response to WalletStats format
    // Adjust these mappings based on actual API response structure
    return {
      address: address.toLowerCase(),
      pnl1d: data.pnl_1d || data.pnl1d || 0,
      pnl7d: data.pnl_7d || data.pnl7d || 0,
      pnl30d: data.pnl_30d || data.pnl30d || 0,
      winRate7d: data.win_rate_7d || data.winRate7d || 0,
      winRate30d: data.win_rate_30d || data.winRate30d || 0,
      volume7d: data.volume_7d || data.volume7d || 0,
      volume30d: data.volume_30d || data.volume30d || 0,
      twap: data.twap || 0,
      longPosition: data.long_position || data.longPosition || 0,
      shortPosition: data.short_position || data.shortPosition || 0,
      positions: data.positions || [],
      activeTwaps: data.active_twaps || data.activeTwaps || [],
      error: false,
    };
  } catch (error) {
    console.error(`[API] Failed to fetch stats for ${address}:`, error);
    
    // Return error state object instead of crashing
    return {
      address: address.toLowerCase(),
      pnl1d: 0,
      pnl7d: 0,
      pnl30d: 0,
      winRate7d: 0,
      winRate30d: 0,
      volume7d: 0,
      volume30d: 0,
      twap: 0,
      longPosition: 0,
      shortPosition: 0,
      positions: [],
      activeTwaps: [],
      error: true,
    };
  }
}

/**
 * Process wallets in chunks with delays
 */
async function processWalletsInBatches(
  addresses: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<WalletStats[]> {
  const results: WalletStats[] = [];
  const chunks: string[][] = [];

  // Split addresses into chunks
  for (let i = 0; i < addresses.length; i += CHUNK_SIZE) {
    chunks.push(addresses.slice(i, i + CHUNK_SIZE));
  }

  // Process chunks sequentially
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Process chunk in parallel
    const chunkResults = await Promise.all(
      chunk.map(addr => fetchWalletStats(addr))
    );
    
    results.push(...chunkResults);
    
    // Report progress
    if (onProgress) {
      onProgress(results.length, addresses.length);
    }

    // Delay before next chunk (except for last chunk)
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}

/**
 * Cached function to fetch all wallet stats
 */
const getCachedWalletStats = unstable_cache(
  async (): Promise<WalletStats[]> => {
    const addresses = Object.keys(STATIC_SMART_WALLETS);
    console.log(`[API] Processing ${addresses.length} wallets in batches...`);
    
    return await processWalletsInBatches(addresses);
  },
  ['wallet-stats'],
  {
    revalidate: CACHE_TTL,
    tags: ['wallet-stats'],
  }
);

/**
 * GET handler - Returns cached wallet stats
 */
export async function GET() {
  try {
    const stats = await getCachedWalletStats();
    
    // Calculate aggregate metrics
    const totalLong = stats.reduce((sum, s) => sum + s.longPosition, 0);
    const totalShort = stats.reduce((sum, s) => sum + s.shortPosition, 0);

    return NextResponse.json({
      success: true,
      data: stats,
      metadata: {
        totalWallets: stats.length,
        totalLong,
        totalShort,
        cached: true,
        timestamp: Date.now(),
      },
    } satisfies WalletStatsResponse);
  } catch (error) {
    console.error('[API] Error fetching wallet stats:', error);
    
    return NextResponse.json(
      {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      } satisfies WalletStatsResponse,
      { status: 500 }
    );
  }
}
