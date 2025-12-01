/**
 * API Route: Get Smart Money Cache
 * Client-side endpoint to fetch the cached Smart Money map
 */

import { NextResponse } from 'next/server';
import { getSmartMoneyCache, getCacheStats } from '@/lib/cache';

export const dynamic = 'force-dynamic'; // Disable caching for fresh data

export async function GET() {
  try {
    const { data, metadata } = await getSmartMoneyCache();

    if (!data) {
      return NextResponse.json({
        success: false,
        error: 'Cache not initialized',
        data: {},
        metadata: null,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data,
      metadata,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Error fetching Smart Money cache:', errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: {},
      metadata: null,
    }, { status: 500 });
  }
}

/**
 * Get cache statistics only (lighter endpoint)
 */
export async function HEAD() {
  try {
    const stats = await getCacheStats();
    
    return new NextResponse(null, {
      status: stats ? 200 : 404,
      headers: {
        'X-Cache-Last-Updated': stats?.lastUpdated.toString() || '0',
        'X-Cache-Wallet-Count': stats?.walletCount.toString() || '0',
        'X-Cache-Source': stats?.source || 'none',
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

