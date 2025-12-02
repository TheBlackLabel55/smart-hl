/**
 * Nansen API Client
 * Handles all interactions with Nansen Pro API endpoints
 * Rate limited - use with caching strategy only
 * 
 * FIXED: Uses POST requests with proper headers as per Nansen API spec
 */

import type { NansenSmartMoneyResponse, NansenSmartMoneyItem } from '@/types';
import { NANSEN_API_BASE_URL, CHAIN_ID_ARBITRUM } from './constants';

const NANSEN_API_KEY = process.env.NANSEN_API_KEY || '';

interface NansenClientOptions {
  timeout?: number;
}

interface NansenPostRequest {
  min_balance_usd?: number;
  chain_id?: number;
  cursor?: string;
  limit?: number;
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
    body?: NansenPostRequest
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey, // Nansen uses 'api-key' header, not 'Authorization'
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
   * Fetch Smart Money wallets from Nansen
   * Uses POST with JSON body as per Nansen API specification
   */
  async getSmartMoneyWallets(chain: string = 'arbitrum'): Promise<NansenSmartMoneyItem[]> {
    const allWallets: NansenSmartMoneyItem[] = [];
    let cursor: string | undefined;

    // Map chain name to chain ID
    const chainId = chain === 'arbitrum' ? CHAIN_ID_ARBITRUM : CHAIN_ID_ARBITRUM; // Default to Arbitrum

    do {
      const body: NansenPostRequest = {
        min_balance_usd: 100000, // Minimum balance filter
        chain_id: chainId,
        limit: 100, // Max per page
      };

      if (cursor) {
        body.cursor = cursor;
      }

      try {
        const response = await this.request<NansenSmartMoneyResponse>(
          '/smart-money/holdings', // Using holdings endpoint
          body
        );

        allWallets.push(...response.data);
        cursor = response.next_cursor;
      } catch (error) {
        console.error('[Nansen] Error fetching Smart Money wallets:', error);
        // If first request fails, try alternative endpoint
        if (allWallets.length === 0) {
          console.log('[Nansen] Trying alternative endpoint: /token_flows');
          try {
            const altResponse = await this.request<NansenSmartMoneyResponse>(
              '/token_flows',
              { chain_id: chainId }
            );
            allWallets.push(...altResponse.data);
            cursor = altResponse.next_cursor;
          } catch (altError) {
            console.error('[Nansen] Alternative endpoint also failed:', altError);
            throw error; // Throw original error
          }
        } else {
          // If we have some data, break and return what we have
          break;
        }
      }
    } while (cursor);

    return allWallets;
  }

  /**
   * Fetch leaderboard data - Top performing wallets
   * Uses POST with JSON body
   */
  async getLeaderboard(
    chain: string = 'arbitrum',
    timeframe: '24h' | '7d' | '30d' = '24h'
  ): Promise<NansenSmartMoneyItem[]> {
    const chainId = chain === 'arbitrum' ? CHAIN_ID_ARBITRUM : CHAIN_ID_ARBITRUM;

    try {
      const response = await this.request<NansenSmartMoneyResponse>(
        '/leaderboard/traders',
        {
          chain_id: chainId,
          timeframe,
          min_balance_usd: 50000, // Lower threshold for leaderboard
        }
      );

      return response.data;
    } catch (error) {
      console.error('[Nansen] Error fetching leaderboard:', error);
      // Return empty array on error rather than crashing
      return [];
    }
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
