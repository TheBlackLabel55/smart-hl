/**
 * Cron Job: Refresh Smart Money Cache
 * Runs once monthly (1st of every month at midnight UTC) via Vercel Cron
 * 
 * CREDIT OPTIMIZED: Monthly schedule to preserve Nansen API credits (10k limit)
 * Vercel Cron Schedule: 0 0 1 * * (1st day of every month)
 */

import { NextResponse } from 'next/server';
import { nansenClient } from '@/lib/nansen';
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
  
  console.log('[Cron] 🚀 Starting monthly Smart Money refresh job...');

  // Verify authorization
  if (!verifyCronSecret(request)) {
    console.error('[Cron] ❌ Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Fetch Smart Money wallets from Hyperliquid perp trades
    console.log('[Cron] 📡 Fetching active Smart Money wallets from Hyperliquid...');
    const walletMap = await nansenClient.fetchSmartMoneyWallets();
    
    const walletCount = Object.keys(walletMap).length;
    console.log(`[Cron] ✅ Fetched ${walletCount} unique Smart Money wallets`);

    // Store in cache
    const success = await setSmartMoneyCache(walletMap);

    const duration = Date.now() - startTime;

    if (success) {
      console.log(`[Cron] ✅ Cache refreshed successfully in ${duration}ms`);
      return NextResponse.json({
        success: true,
        walletCount,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        schedule: 'Monthly (1st of every month)',
      });
    } else {
      throw new Error('Failed to store cache');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cron] ❌ Error refreshing Smart Money cache:', errorMessage);

    // Try to serve stale data as fallback
    const { data: fallbackData } = await getSmartMoneyCache();
    
    if (fallbackData) {
      console.log('[Cron] ⚠️ Serving stale cache as fallback');
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
