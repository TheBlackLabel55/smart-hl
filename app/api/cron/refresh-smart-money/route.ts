/**
 * Cron Job: Refresh Smart Money Cache
 * Runs every 12 hours via Vercel Cron
 * 
 * Vercel Cron Schedule: 0 */12 * * *
 */

import { NextResponse } from 'next/server';
import { nansenClient, transformToCache } from '@/lib/nansen';
import { setSmartMoneyCache, getSmartMoneyCache } from '@/lib/cache';

// Verify cron secret to prevent unauthorized calls
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // In development, allow without auth
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // Vercel automatically adds this header for cron jobs
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  
  return false;
}

export async function GET(request: Request) {
  const startTime = Date.now();
  
  console.log('[Cron] Starting Smart Money refresh job...');

  // Verify authorization
  if (!verifyCronSecret(request)) {
    console.error('[Cron] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Fetch Smart Money wallets from Nansen
    console.log('[Cron] Fetching Smart Money wallets...');
    const smartMoneyWallets = await nansenClient.getSmartMoneyWallets('arbitrum');
    console.log(`[Cron] Fetched ${smartMoneyWallets.length} Smart Money wallets`);

    // Fetch Leaderboard data
    console.log('[Cron] Fetching leaderboard data...');
    const leaderboardWallets = await nansenClient.getLeaderboard('arbitrum', '24h');
    console.log(`[Cron] Fetched ${leaderboardWallets.length} leaderboard wallets`);

    // Merge and deduplicate
    const allWallets = [...smartMoneyWallets];
    const existingAddresses = new Set(allWallets.map(w => w.address.toLowerCase()));
    
    for (const wallet of leaderboardWallets) {
      if (!existingAddresses.has(wallet.address.toLowerCase())) {
        allWallets.push(wallet);
      }
    }

    console.log(`[Cron] Total unique wallets: ${allWallets.length}`);

    // Transform to cache format
    const cacheData = transformToCache(allWallets);

    // Store in cache
    const success = await setSmartMoneyCache(cacheData);

    const duration = Date.now() - startTime;

    if (success) {
      console.log(`[Cron] Cache refreshed successfully in ${duration}ms`);
      return NextResponse.json({
        success: true,
        walletCount: Object.keys(cacheData).length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    } else {
      throw new Error('Failed to store cache');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] Error refreshing Smart Money cache:', errorMessage);

    // Try to serve stale data as fallback
    const { data: fallbackData } = await getSmartMoneyCache();
    
    if (fallbackData) {
      console.log('[Cron] Serving stale cache as fallback');
      return NextResponse.json({
        success: false,
        error: errorMessage,
        fallback: true,
        walletCount: Object.keys(fallbackData).length,
        message: 'Using stale cache data',
      }, { status: 207 }); // Multi-Status: partial success
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      fallback: false,
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}

