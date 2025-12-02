/**
 * Nansen API Client
 * Handles all interactions with Nansen Pro API endpoints
 * 
 * CREDIT OPTIMIZED: Uses perp-trades endpoint to discover active Smart Money wallets
 * Runs once monthly to preserve API credits (10k limit)
 */

import type { NansenSmartMoneyResponse, NansenSmartMoneyItem } from '@/types';
import { NANSEN_API_BASE_URL } from './constants';

const NANSEN_API_KEY = process.env.NANSEN_API_KEY || '';

interface NansenClientOptions {
  timeout?: number;
}

interface NansenPostRequest {
  min_balance_usd?: number;
  chain_id?: number;
  cursor?: string;
  limit?: number;
  timeframe?: '24h' | '7d' | '30d';
}

/**
 * Nansen Perp Trade Response Type
 * The perp-trades endpoint returns an array of trades
 */
interface NansenPerpTrade {
  wallet_address: string;
  smart_money_labels: string[];
  // Other fields we ignore: exchange, timestamp, amount, etc.
}

/**
 * Perp Trades Request Body - Correct Nansen V1 Schema
 */
interface PerpTradesRequest {
  chain: string;
  filters: {
    include_smart_money_labels: string[];
  };
  pagination: {
    limit: number;
  };
  date?: {
    from?: string; // YYYY-MM-DD format
    to?: string; // YYYY-MM-DD format
  };
}

class NansenClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(options: NansenClientOptions = {}) {
    this.baseUrl = NANSEN_API_BASE_URL;
    this.apiKey = NANSEN_API_KEY;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Make a POST request to Nansen API
   * Nansen requires POST with JSON body, not GET with query params
   */
  private async request<T>(
    endpoint: string, 
    body?: NansenPostRequest | PerpTradesRequest
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey, // Nansen uses 'api-key' header
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // CRITICAL: Log full response for debugging
        const responseText = await response.text();
        console.error(`[Nansen] API Error ${response.status} ${response.statusText}:`, responseText);
        
        throw new Error(
          `Nansen API error: ${response.status} ${response.statusText}. Response: ${responseText}`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Nansen API request timeout');
      }
      throw error;
    }
  }

  /**
   * Fetch Smart Money wallets from Hyperliquid perp trades
   * 
   * Uses the perp-trades endpoint to discover active Smart Money wallets
   * Uses correct Nansen V1 API schema
   * 
   * @returns SmartMoneyCache - Map of wallet addresses to their metadata
   */
  async fetchSmartMoneyWallets(): Promise<Record<string, SimplifiedSmartWallet>> {
    if (!this.apiKey) {
      throw new Error('Missing NANSEN_API_KEY environment variable');
    }

    console.log('[Nansen] Fetching active Hyperliquid Smart Money from perp-trades...');

    try {
      // Calculate date range for last 30 days (optional - omit if API doesn't support)
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);

      const payload: PerpTradesRequest = {
        chain: 'hyperliquid',
        filters: {
          include_smart_money_labels: [
            'Smart Money',
            'Smart Trader',
            'Fund',
            'Whale'
          ],
        },
        pagination: {
          limit: 100, // Nansen typically limits to 100 per request
        },
        // Optional: Add date range if supported
        // date: {
        //   from: fromDate.toISOString().split('T')[0], // YYYY-MM-DD
        //   to: toDate.toISOString().split('T')[0],
        // },
      };

      console.log('[Nansen] Request payload:', JSON.stringify(payload, null, 2));

      const response = await this.request<any>(
        '/smart-money/perp-trades',
        payload
      );

      // Log response structure for debugging
      console.log('[Nansen] Response type:', typeof response);
      console.log('[Nansen] Response structure:', response ? Object.keys(response) : 'null');
      
      // Handle different response structures
      // Response might be: { data: [...], pagination: {...} } or directly [...]
      let trades: NansenPerpTrade[] = [];
      
      if (Array.isArray(response)) {
        trades = response;
        console.log(`[Nansen] Response is array with ${trades.length} items`);
      } else if (response?.data && Array.isArray(response.data)) {
        trades = response.data;
        console.log(`[Nansen] Response has data array with ${trades.length} items`);
      } else if (response?.trades && Array.isArray(response.trades)) {
        trades = response.trades;
        console.log(`[Nansen] Response has trades array with ${trades.length} items`);
      } else {
        console.error('[Nansen] Unexpected response structure:', JSON.stringify(response, null, 2));
        throw new Error('Unexpected response structure from Nansen API. Check logs for details.');
      }

      // Transform Trades -> Unique Wallets
      const walletMap: Record<string, SimplifiedSmartWallet> = {};

      trades.forEach((trade) => {
        const address = trade.wallet_address.toLowerCase();
        
        if (!walletMap[address]) {
          // Determine tier based on labels
          let tier: 'smart' | 'whale' | 'institution' = 'smart';
          const labels = trade.smart_money_labels || ['Smart Trader'];
          
          if (labels.some(l => 
            l.toLowerCase().includes('fund') || 
            l.toLowerCase().includes('institution')
          )) {
            tier = 'institution';
          } else if (labels.some(l => l.toLowerCase().includes('whale'))) {
            tier = 'whale';
          }

          walletMap[address] = {
            label: labels[0] || 'Smart Trader',
            tags: labels,
            winRate: 0, // Not available from perp-trades endpoint
            tier,
          };
        } else {
          // Merge labels if wallet already exists
          const existing = walletMap[address];
          const newLabels = trade.smart_money_labels || [];
          const mergedLabels = Array.from(new Set([...existing.tags, ...newLabels]));
          walletMap[address].tags = mergedLabels;
          walletMap[address].label = mergedLabels[0] || existing.label;
        }
      });

      const count = Object.keys(walletMap).length;
      console.log(`[Nansen] ✅ Found ${count} unique active Smart Money wallets from Hyperliquid`);

      return walletMap;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Nansen] ❌ Failed to fetch Smart Money wallets:', errorMessage);
      throw error;
    }
  }

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use fetchSmartMoneyWallets() instead
   */
  async getSmartMoneyWallets(chain: string = 'arbitrum'): Promise<NansenSmartMoneyItem[]> {
    console.warn('[Nansen] getSmartMoneyWallets() is deprecated. Use fetchSmartMoneyWallets() instead.');
    // Return empty array to avoid breaking existing code
    return [];
  }

  /**
   * Fetch leaderboard data - Top performing wallets
   * Uses POST with JSON body
   */
  async getLeaderboard(
    chain: string = 'arbitrum',
    timeframe: '24h' | '7d' | '30d' = '24h'
  ): Promise<NansenSmartMoneyItem[]> {
    // Return empty array - we're using perp-trades endpoint instead
    console.warn('[Nansen] getLeaderboard() is deprecated. Use fetchSmartMoneyWallets() instead.');
    return [];
  }

  /**
   * Get wallet profile details
   */
  async getWalletProfile(address: string): Promise<NansenSmartMoneyItem | null> {
    try {
      const response = await this.request<{ data: NansenSmartMoneyItem }>(
        `/wallet/${address}/profile`,
        {} // Empty body for profile endpoint
      );
      return response.data;
    } catch (error) {
      console.error(`[Nansen] Error fetching wallet profile for ${address}:`, error);
      return null;
    }
  }
}

// Singleton export
export const nansenClient = new NansenClient();

// Type for the simplified map we cache
export interface SimplifiedSmartWallet {
  label: string;
  tags: string[];
  winRate: number;
  tier: 'smart' | 'whale' | 'institution';
}

export type SmartMoneyCache = Record<string, SimplifiedSmartWallet>;

/**
 * Transform Nansen response into optimized lookup map
 * @deprecated Use fetchSmartMoneyWallets() which returns SmartMoneyCache directly
 */
export function transformToCache(wallets: NansenSmartMoneyItem[]): SmartMoneyCache {
  const cache: SmartMoneyCache = {};

  for (const wallet of wallets) {
    const address = wallet.address.toLowerCase();
    
    // Determine tier based on tags
    let tier: 'smart' | 'whale' | 'institution' = 'smart';
    if (wallet.tags.some(t => t.toLowerCase().includes('fund') || t.toLowerCase().includes('institution'))) {
      tier = 'institution';
    } else if (wallet.tags.some(t => t.toLowerCase().includes('whale'))) {
      tier = 'whale';
    }

    cache[address] = {
      label: wallet.label,
      tags: wallet.tags,
      winRate: wallet.win_rate_24h || 0,
      tier,
    };
  }

  return cache;
}
