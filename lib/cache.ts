/**
 * Cache Management
 * Handles storing/retrieving the Smart Money map
 * Supports: Vercel KV (primary) or File-based fallback
 */

import { kv } from '@vercel/kv';
import type { SmartMoneyCache } from './nansen';

const CACHE_KEY = 'smart-money-cache';
const CACHE_TIMESTAMP_KEY = 'smart-money-cache-timestamp';
const CACHE_TTL_SECONDS = 60 * 60 * 25; // 25 hours (buffer for 24h cron)

export interface CacheMetadata {
  lastUpdated: number;
  walletCount: number;
  source: 'kv' | 'file' | 'memory';
}

// In-memory fallback for development
let memoryCache: SmartMoneyCache | null = null;
let memoryCacheTimestamp: number | null = null;

/**
 * Store Smart Money cache in Vercel KV
 */
export async function setSmartMoneyCache(data: SmartMoneyCache): Promise<boolean> {
  try {
    // Try Vercel KV first
    if (process.env.KV_REST_API_URL) {
      await kv.set(CACHE_KEY, JSON.stringify(data), { ex: CACHE_TTL_SECONDS });
      await kv.set(CACHE_TIMESTAMP_KEY, Date.now().toString(), { ex: CACHE_TTL_SECONDS });
      console.log(`[Cache] Stored ${Object.keys(data).length} wallets in Vercel KV`);
      return true;
    }
    
    // Fallback to memory cache
    memoryCache = data;
    memoryCacheTimestamp = Date.now();
    console.log(`[Cache] Stored ${Object.keys(data).length} wallets in memory`);
    return true;
  } catch (error) {
    console.error('[Cache] Failed to store cache:', error);
    
    // Last resort: memory cache
    memoryCache = data;
    memoryCacheTimestamp = Date.now();
    return false;
  }
}

/**
 * Retrieve Smart Money cache
 */
export async function getSmartMoneyCache(): Promise<{
  data: SmartMoneyCache | null;
  metadata: CacheMetadata | null;
}> {
  try {
    // Try Vercel KV first
    if (process.env.KV_REST_API_URL) {
      const [cached, timestamp] = await Promise.all([
        kv.get<string>(CACHE_KEY),
        kv.get<string>(CACHE_TIMESTAMP_KEY),
      ]);

      if (cached) {
        const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return {
          data,
          metadata: {
            lastUpdated: timestamp ? parseInt(timestamp, 10) : Date.now(),
            walletCount: Object.keys(data).length,
            source: 'kv',
          },
        };
      }
    }

    // Fallback to memory cache
    if (memoryCache) {
      return {
        data: memoryCache,
        metadata: {
          lastUpdated: memoryCacheTimestamp || Date.now(),
          walletCount: Object.keys(memoryCache).length,
          source: 'memory',
        },
      };
    }

    return { data: null, metadata: null };
  } catch (error) {
    console.error('[Cache] Failed to retrieve cache:', error);
    
    // Try memory fallback
    if (memoryCache) {
      return {
        data: memoryCache,
        metadata: {
          lastUpdated: memoryCacheTimestamp || Date.now(),
          walletCount: Object.keys(memoryCache).length,
          source: 'memory',
        },
      };
    }

    return { data: null, metadata: null };
  }
}

/**
 * Check if cache is stale (older than 25 hours)
 */
export async function isCacheStale(): Promise<boolean> {
  try {
    if (process.env.KV_REST_API_URL) {
      const timestamp = await kv.get<string>(CACHE_TIMESTAMP_KEY);
      if (!timestamp) return true;
      
      const age = Date.now() - parseInt(timestamp, 10);
      return age > CACHE_TTL_SECONDS * 1000;
    }

    if (memoryCacheTimestamp) {
      const age = Date.now() - memoryCacheTimestamp;
      return age > CACHE_TTL_SECONDS * 1000;
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheMetadata | null> {
  const { metadata } = await getSmartMoneyCache();
  return metadata;
}

