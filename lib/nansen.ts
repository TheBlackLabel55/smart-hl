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
 * Note: smart-money/perp-trades is Hyperliquid-exclusive, does NOT accept 'chain' parameter
 */
interface PerpTradesRequest {
  chain?: string; // Optional - not used by perp-trades endpoint (Hyperliquid-exclusive)
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
    
    // Debug: Log API key status at construction
    console.log('[Nansen Client] Initializing...');
    console.log('[Nansen Client] Base URL:', this.baseUrl);
    console.log('[Nansen Client] Key exists?', !!this.apiKey);
    console.log('[Nansen Client] Key length:', this.apiKey?.length || 0);
  }

  /**
   * Make a POST request to Nansen API
   * Nansen requires POST with JSON body, not GET with query params
   */
  private async request<T>(
    endpoint: string, 
    body?: NansenPostRequest | PerpTradesRequest
  ): Promise<T> {
    // CRITICAL: Get fresh API key from process.env
    const apiKey = process.env.NANSEN_API_KEY || this.apiKey;
    
    if (!apiKey) {
      console.error('[Nansen Request] API key is missing!');
      throw new Error('NANSEN_API_KEY is required for API requests');
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Log request details (without exposing full key)
    console.log(`[Nansen Request] URL: ${url}`);
    console.log(`[Nansen Request] API key present: ${!!apiKey}, length: ${apiKey.length}`);
    console.log(`[Nansen Request] Header 'api-key' will be set: ${!!apiKey}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': apiKey as string, // STRICT: camelCase 'apiKey' as per Nansen V1 docs
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
   * Uses correct Nansen V1 API schema with apiKey header (camelCase)
   * 
   * @returns SmartMoneyCache - Map of wallet addresses to their metadata
   */
  async fetchSmartMoneyWallets(): Promise<Record<string, SimplifiedSmartWallet>> {
    // CRITICAL: Get API key directly from process.env
    const apiKey = process.env.NANSEN_API_KEY;

    if (!apiKey) {
      console.error('[Nansen Fatal] Missing NANSEN_API_KEY');
      throw new Error('Missing NANSEN_API_KEY');
    }

    // Debug Log
    console.log(`[Nansen] Fetching with Key Length: ${apiKey.length}`);

    // CRITICAL: Use full URL with /api/v1 path
    const url = 'https://api.nansen.ai/api/v1/smart-money/perp-trades';

    const payload: PerpTradesRequest = {
      // REMOVED: chain - perp-trades endpoint is Hyperliquid-exclusive and doesn't accept this parameter
      filters: {
        include_smart_money_labels: [
          'Smart HL Perps Trader', // Most important - Hyperliquid specific
          'Smart Trader',
          'Fund',
          '30D Smart Trader',
          '90D Smart Trader'
        ],
      },
      pagination: {
        limit: 500, // Good sample size
      },
    };

    console.log('[Nansen] Request URL:', url);
    console.log('[Nansen] Request payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': apiKey, // THE FIX: camelCase 'apiKey' (not 'api-key')
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Nansen Error]', response.status, errorText);
        throw new Error(`Nansen Failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // DEBUG: Print what the API actually gave us
      console.log('[Nansen] Response type:', typeof data);
      console.log('[Nansen] Response structure:', data ? Object.keys(data) : 'null');
      
      // Handle different response structures
      // Response might be: { data: [...], pagination: {...} } or directly [...]
      let tradesArray: any[] = [];
      
      if (Array.isArray(data)) {
        tradesArray = data;
        console.log(`[Nansen] Response is array with ${tradesArray.length} items`);
      } else if (data?.data && Array.isArray(data.data)) {
        tradesArray = data.data;
        console.log(`[Nansen] Response has data array with ${tradesArray.length} items`);
      } else if (data?.trades && Array.isArray(data.trades)) {
        tradesArray = data.trades;
        console.log(`[Nansen] Response has trades array with ${tradesArray.length} items`);
      } else {
        console.error('[Nansen] Unexpected response structure:', JSON.stringify(data, null, 2));
        throw new Error('Unexpected response structure from Nansen API. Check logs for details.');
      }

      // DEBUG: Log first trade structure to see actual field names
      if (tradesArray.length > 0) {
        console.log('[Nansen Debug] First Trade Keys:', Object.keys(tradesArray[0]));
        console.log('[Nansen Debug] Sample Trade Data:', JSON.stringify(tradesArray[0], null, 2));
      } else {
        console.log('[Nansen Debug] API returned empty array');
        return {};
      }

      // Transform Trades -> Unique Wallets
      const walletMap: Record<string, SimplifiedSmartWallet> = {};

      tradesArray.forEach((trade, index) => {
        // 1. Extract Address using the confirmed key: trader_address
        const rawAddress = trade.trader_address;
        
        if (!rawAddress) {
          if (index === 0) {
            console.warn('[Nansen Warning] Could not find trader_address field in trade object');
            console.warn('[Nansen Warning] Available fields:', Object.keys(trade));
          }
          return; // Skip this bad record
        }

        // Safety guard: ensure rawAddress is a string before calling toLowerCase
        const address = typeof rawAddress === 'string' ? rawAddress.toLowerCase() : String(rawAddress).toLowerCase();
        
        // 2. Extract Label (Handle string vs array vs null)
        // trader_address_label is typically a single string, wrap it in array
        let labels: string[] = ['Smart HL Trader']; // Default fallback
        
        if (trade.trader_address_label) {
          // If it's a string like "Smart NFT Trader", make it ["Smart NFT Trader"]
          labels = Array.isArray(trade.trader_address_label) 
            ? trade.trader_address_label.filter(Boolean) // Filter out null/undefined
            : [trade.trader_address_label].filter(Boolean);
        }
        
        // 3. Build the Map
        if (!walletMap[address]) {
          // Determine tier based on labels
          let tier: 'smart' | 'whale' | 'institution' = 'smart';
          
          if (labels.some(l => 
            String(l).toLowerCase().includes('fund') || 
            String(l).toLowerCase().includes('institution')
          )) {
            tier = 'institution';
          } else if (labels.some(l => String(l).toLowerCase().includes('whale'))) {
            tier = 'whale';
          }

          walletMap[address] = {
            label: labels[0] || 'Smart HL Trader',
            tags: labels,
            winRate: 0, // Not available from perp-trades endpoint
            tier,
          };
        } else {
          // Optional: If we see the same wallet again with a different label, merge them
          const existing = walletMap[address];
          const existingLabels = new Set(existing.tags);
          labels.forEach(l => existingLabels.add(String(l)));
          walletMap[address].tags = Array.from(existingLabels);
          walletMap[address].label = Array.from(existingLabels)[0] || existing.label;
        }
      });

      const count = Object.keys(walletMap).length;
      console.log(`[Nansen] ✅ Successfully parsed ${count} unique Smart Wallets.`);

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
