/**
 * API Route: Get Wallet Statistics
 * Batches requests to Hyperliquid API with rate limiting and caching
 */

import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { STATIC_SMART_WALLETS } from '@/lib/data/static-wallets';
import type { WalletStats, WalletStatsResponse } from '@/types';

// Configuration
const CHUNK_SIZE = 8; // Process 8 wallets at a time
const DELAY_MS = 300; // 300ms delay between chunks
const CACHE_TTL = 5 * 60; // 5 minutes in seconds

// Hyperliquid API URL
const HYPERLIQUID_API_URL = process.env.HYPERLIQUID_API_URL || 'https://api.hyperliquid.xyz/info';

// Hyperliquid API Types
interface HyperliquidAssetPosition {
  position: {
    coin: string;
    szi: string; // Position size (positive = Long, negative = Short)
    entryPx: string;
    positionValue: string; // USD value
    unrealizedPnl: string;
    liquidationPx?: string;
  };
}

interface HyperliquidMarginSummary {
  accountValue: string;
  totalMarginUsed: string;
  totalNtlPos: string;
  totalRawUsd: string;
}

interface HyperliquidState {
  assetPositions: HyperliquidAssetPosition[];
  marginSummary: HyperliquidMarginSummary;
}

interface HyperliquidFill {
  coin: string;
  px: string; // Price
  sz: string; // Size
  side: 'A' | 'B'; // 'A' = Ask (Sell), 'B' = Bid (Buy)
  time: number; // Epoch milliseconds
  startPosition: string;
  dir: string;
  closedPnl: string | null; // Realized PnL if closing a position
  hash: string;
  oid: number;
  tid: number;
}

/**
 * Fetch clearinghouse state from Hyperliquid API
 * Returns current positions and margin summary
 */
async function fetchClearinghouseState(address: string): Promise<HyperliquidState | null> {
  try {
    const response = await fetch(HYPERLIQUID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API returned ${response.status}`);
    }

    const data = await response.json();
    return data as HyperliquidState;
  } catch (error) {
    console.error(`[API] Failed to fetch clearinghouse state for ${address}:`, error);
    return null;
  }
}

/**
 * Fetch user fills (trade history) from Hyperliquid API
 * Returns array of all fills for the user
 */
async function fetchUserFills(address: string): Promise<HyperliquidFill[]> {
  try {
    const response = await fetch(HYPERLIQUID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'userFills',
        user: address,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout (fills can be large)
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API returned ${response.status}`);
    }

    const data = await response.json();
    return (data || []) as HyperliquidFill[];
  } catch (error) {
    console.error(`[API] Failed to fetch user fills for ${address}:`, error);
    return [];
  }
}

/**
 * Calculate PnL for a specific time period from fills
 */
function calculatePnL(fills: HyperliquidFill[], periodMs: number): number {
  const now = Date.now();
  const cutoffTime = now - periodMs;
  
  return fills
    .filter(fill => fill.time >= cutoffTime && fill.closedPnl !== null)
    .reduce((sum, fill) => {
      const closedPnl = parseFloat(fill.closedPnl || '0');
      return sum + closedPnl;
    }, 0);
}

/**
 * Calculate trading volume for a specific time period from fills
 */
function calculateVolume(fills: HyperliquidFill[], periodMs: number): number {
  const now = Date.now();
  const cutoffTime = now - periodMs;
  
  return fills
    .filter(fill => fill.time >= cutoffTime)
    .reduce((sum, fill) => {
      const price = parseFloat(fill.px);
      const size = parseFloat(fill.sz);
      return sum + (price * size);
    }, 0);
}

/**
 * Calculate win rate for a specific time period from fills
 * Win rate = (Winning trades / Total trades) * 100
 */
function calculateWinRate(fills: HyperliquidFill[], periodMs: number): number {
  const now = Date.now();
  const cutoffTime = now - periodMs;
  
  const relevantFills = fills.filter(
    fill => fill.time >= cutoffTime && fill.closedPnl !== null
  );
  
  if (relevantFills.length === 0) return 0;
  
  const winningTrades = relevantFills.filter(
    fill => parseFloat(fill.closedPnl || '0') > 0
  ).length;
  
  return (winningTrades / relevantFills.length) * 100;
}

/**
 * Map Hyperliquid positions to our TokenPosition format
 */
function mapPositions(assetPositions: HyperliquidAssetPosition[]) {
  const positions = assetPositions.map(pos => {
    const sizeSigned = parseFloat(pos.position.szi);
    const positionValue = parseFloat(pos.position.positionValue);
    const absSize = Math.abs(sizeSigned);
    const entryPrice = parseFloat(pos.position.entryPx);
    const currentPrice = absSize > 0 ? positionValue / absSize : 0;
    const pnl = parseFloat(pos.position.unrealizedPnl || '0');
    const liquidationPrice = pos.position.liquidationPx
      ? parseFloat(pos.position.liquidationPx)
      : null;

    return {
      coin: pos.position.coin,
      sizeUsd: positionValue,
      side: sizeSigned > 0 ? 'Long' as const : 'Short' as const,
      entryPrice,
      currentPrice,
      pnl,
      liquidationPrice,
    };
  });
  
  const longPosition = positions
    .filter(p => p.side === 'Long')
    .reduce((sum, p) => sum + p.sizeUsd, 0);
    
  const shortPosition = positions
    .filter(p => p.side === 'Short')
    .reduce((sum, p) => sum + p.sizeUsd, 0);
  
  return { positions, longPosition, shortPosition };
}

/**
 * Generate mock data for development
 * Keep as fallback when API fails or USE_MOCK_DATA=true
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

  // Top cryptocurrencies by market cap from CoinMarketCap (excluding stablecoins)
  // Sorted by market cap ranking
  const tokens = [
    'BTC', 'ETH', 'XRP', 'BNB', 'SOL', 'DOGE', 'ADA', 'TRX', 'BCH', 'HYPE',
    'LINK', 'XLM', 'XMR', 'LTC', 'APT', 'UNI', 'ICP', 'TON', 'ARB', 'OP',
    'AVAX', 'SUI', 'ATOM', 'DOT', 'NEAR', 'MATIC', 'ALGO', 'ETC', 'VET', 'FIL',
    'AAVE', 'INJ', 'STX', 'XTZ', 'TIA', 'GRT', 'RENDER', 'FET', 'STRK', 'LDO',
    'CRV', 'MORPHO', 'ETHFI', 'FLOKI', 'PEPE', 'BONK', 'JUP', 'SEI', 'IMX', 'CRO',
    'QNT', 'FLR', 'XDC', 'NEXO', 'DASH', 'ZEC', 'HBAR', 'ONE', 'FTM', 'MANA',
    'SAND', 'AXS', 'GALA', 'CHZ', 'FLOW', 'THETA', 'EOS', 'ENJ', 'BAT', 'ZRX',
    'SNX', 'COMP', 'MKR', 'YFI', 'SUSHI', '1INCH', 'GMX', 'GNS', 'RAY', 'WIF',
    'BLUR', 'JUP', 'PURR', 'HFUN', 'CATBAL', 'SLAY', 'RZR', 'BUDDY', 'PIP', 'RAGE',
  ];
  
  // Generate positions (1-4 positions per wallet)
  const numPositions = 1 + (seedNum % 4);
  const positions = [];
  for (let i = 0; i < numPositions; i++) {
    const tokenIndex = (seedNum + i) % tokens.length;
    const positionSize = (seedNum % 500000) + 10000;
    const side = (seedNum + i) % 2 === 0 ? 'Long' : 'Short';
    const entryPrice = 100 + ((seedNum % 5000) / 100);
    const currentPrice = entryPrice * (1 + ((seedNum % 2000) - 1000) / 50000);
    const pnl = positionSize * ((currentPrice - entryPrice) / entryPrice);
    const liquidationPrice = entryPrice * (side === 'Long' ? 0.7 : 1.3);
    positions.push({
      coin: tokens[tokenIndex],
      sizeUsd: positionSize,
      side: side as 'Long' | 'Short',
      entryPrice,
      currentPrice,
      pnl,
      liquidationPrice,
    });
  }

  // Calculate longPosition and shortPosition from generated positions
  const longPosition = positions
    .filter(p => p.side === 'Long')
    .reduce((sum, p) => sum + p.sizeUsd, 0);
  const shortPosition = positions
    .filter(p => p.side === 'Short')
    .reduce((sum, p) => sum + p.sizeUsd, 0);

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
 * Fetch stats for a single wallet from Hyperliquid API
 * Returns error state object if request fails
 */
async function fetchWalletStats(address: string): Promise<WalletStats> {
  // DEVELOPMENT MODE: Use mock data if explicitly enabled
  // Set USE_MOCK_DATA=true in environment to use mock data
  const useMockData = process.env.USE_MOCK_DATA === 'true';
  
  if (useMockData) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));
    return generateMockStats(address);
  }

  try {
    // Fetch both clearinghouse state and user fills in parallel
    const [state, fills] = await Promise.all([
      fetchClearinghouseState(address),
      fetchUserFills(address),
    ]);

    // If we couldn't fetch state, return error
    if (!state) {
      throw new Error('Failed to fetch clearinghouse state');
    }

    // Map positions from clearinghouse state
    const { positions, longPosition, shortPosition } = mapPositions(state.assetPositions || []);

    // Calculate time-based metrics from fills
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;
    const thirtyDaysMs = 30 * oneDayMs;

    const pnl1d = calculatePnL(fills, oneDayMs);
    const pnl7d = calculatePnL(fills, sevenDaysMs);
    const pnl30d = calculatePnL(fills, thirtyDaysMs);

    const volume7d = calculateVolume(fills, sevenDaysMs);
    const volume30d = calculateVolume(fills, thirtyDaysMs);

    const winRate7d = calculateWinRate(fills, sevenDaysMs);
    const winRate30d = calculateWinRate(fills, thirtyDaysMs);

    // TWAP: Calculate Time-Weighted Average Price from current positions
    // For now, use average entry price weighted by position size
    let twap = 0;
    if (state.assetPositions.length > 0) {
      const totalValue = state.assetPositions.reduce(
        (sum, pos) => sum + parseFloat(pos.position.positionValue),
        0
      );
      if (totalValue > 0) {
        const weightedPrice = state.assetPositions.reduce((sum, pos) => {
          const value = parseFloat(pos.position.positionValue);
          const entryPrice = parseFloat(pos.position.entryPx);
          return sum + (entryPrice * value);
        }, 0);
        twap = weightedPrice / totalValue;
      }
    }

    // Active TWAPs: Hyperliquid doesn't expose TWAP orders directly via this API
    // For now, return empty array (can be enhanced later with a different endpoint)
    const activeTwaps: WalletStats['activeTwaps'] = [];

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
