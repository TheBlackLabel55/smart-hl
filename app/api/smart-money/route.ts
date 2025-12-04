/**
 * API Route: Get Smart Money Wallets
 * Returns the static list of Smart Money wallet addresses
 * 
 * DATA SOURCE: lib/data/static-wallets.ts (STATIC_SMART_WALLETS)
 */

import { NextResponse } from 'next/server';
import { STATIC_SMART_WALLETS } from '@/lib/data/static-wallets';

// Force static generation for instant response
export const dynamic = 'force-static';

export async function GET() {
  const walletCount = Object.keys(STATIC_SMART_WALLETS).length;
  
  return NextResponse.json({
    success: true,
    data: STATIC_SMART_WALLETS,
    metadata: {
      lastUpdated: Date.now(),
      walletCount,
      source: 'static' as const,
    },
  });
}

/**
 * Get wallet count only (lighter endpoint)
 */
export async function HEAD() {
  const walletCount = Object.keys(STATIC_SMART_WALLETS).length;
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Cache-Last-Updated': Date.now().toString(),
      'X-Cache-Wallet-Count': walletCount.toString(),
      'X-Cache-Source': 'static',
    },
  });
}
