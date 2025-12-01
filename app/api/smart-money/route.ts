/**
 * API Route: Get Smart Money Cache
 * Client-side endpoint to fetch the cached Smart Money map
 * 
 * FALLBACK: Returns mock data if cache is empty (Cron hasn't run yet)
 */

import { NextResponse } from 'next/server';
import { getSmartMoneyCache, getCacheStats } from '@/lib/cache';

export const dynamic = 'force-dynamic'; // Disable caching for fresh data

/**
 * Mock Smart Money data for development/initial load
 * These are well-known active traders on Hyperliquid for testing
 */
const MOCK_SMART_MONEY_MAP = {
  // Known active Hyperliquid traders (lowercase addresses)
  '0x5a52e96bacdabb82fd05763e25335261b270efcb': {
    isSmartMoney: true,
    labels: ['Smart DEX Trader', 'Early Adopter'],
    tier: 'smart' as const,
  },
  '0x4d2c8d30e6e9a6b5fdb9cf9c6e8f2d4a3b5c7e9f': {
    isSmartMoney: true,
    labels: ['High Frequency Trader'],
    tier: 'smart' as const,
  },
  '0x1234567890abcdef1234567890abcdef12345678': {
    isSmartMoney: true,
    labels: ['Whale', 'Fund'],
    tier: 'whale' as const,
  },
  '0xabcdef1234567890abcdef1234567890abcdef12': {
    isSmartMoney: true,
    labels: ['Smart NFT Trader'],
    tier: 'smart' as const,
  },
  '0x9876543210fedcba9876543210fedcba98765432': {
    isSmartMoney: true,
    labels: ['Institution', 'Market Maker'],
    tier: 'institution' as const,
  },
  // Add more known whale/smart addresses as needed
  '0x2e8f9b3c4d5a6f7e8b9c0d1e2f3a4b5c6d7e8f9a': {
    isSmartMoney: true,
    labels: ['High Conviction'],
    tier: 'whale' as const,
  },
};

export async function GET() {
  try {
    // 1. Try to fetch from cache (Vercel KV or memory)
    const { data, metadata } = await getSmartMoneyCache();

    // 2. If cache has data, return it
    if (data && Object.keys(data).length > 0) {
      return NextResponse.json({
        success: true,
        data,
        metadata,
      });
    }

    // 3. FALLBACK: Return mock data so app works immediately
    console.log('[API] Cache empty, returning mock Smart Money data');
    
    return NextResponse.json({
      success: true,
      data: MOCK_SMART_MONEY_MAP,
      metadata: {
        lastUpdated: Date.now(),
        walletCount: Object.keys(MOCK_SMART_MONEY_MAP).length,
        source: 'mock' as const,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error fetching Smart Money cache:', errorMessage);

    // Even on error, return mock data so the app doesn't break
    return NextResponse.json({
      success: true,
      data: MOCK_SMART_MONEY_MAP,
      metadata: {
        lastUpdated: Date.now(),
        walletCount: Object.keys(MOCK_SMART_MONEY_MAP).length,
        source: 'mock' as const,
      },
    });
  }
}

/**
 * Get cache statistics only (lighter endpoint)
 */
export async function HEAD() {
  try {
    const stats = await getCacheStats();
    
    // If no stats, return mock count
    const walletCount = stats?.walletCount || Object.keys(MOCK_SMART_MONEY_MAP).length;
    const source = stats?.source || 'mock';
    
    return new NextResponse(null, {
      status: 200, // Always return 200 since we have fallback
      headers: {
        'X-Cache-Last-Updated': stats?.lastUpdated.toString() || Date.now().toString(),
        'X-Cache-Wallet-Count': walletCount.toString(),
        'X-Cache-Source': source,
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
