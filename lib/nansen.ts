/**
 * Nansen API Client
 * Handles all interactions with Nansen Pro API endpoints
 * Rate limited - use with caching strategy only
 */

import type { NansenSmartMoneyResponse, NansenSmartMoneyItem } from '@/types';

const NANSEN_API_BASE = process.env.NANSEN_API_BASE_URL || 'https://api.nansen.ai/v1';
const NANSEN_API_KEY = process.env.NANSEN_API_KEY || '';

interface NansenClientOptions {
  timeout?: number;
}

class NansenClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(options: NansenClientOptions = {}) {
    this.baseUrl = NANSEN_API_BASE;
    this.apiKey = NANSEN_API_KEY;
    this.timeout = options.timeout || 30000;
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nansen API error: ${response.status} ${response.statusText}`);
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
   * This includes wallets labeled as "Smart DEX Traders", "Funds", etc.
   */
  async getSmartMoneyWallets(chain: string = 'arbitrum'): Promise<NansenSmartMoneyItem[]> {
    const allWallets: NansenSmartMoneyItem[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, string> = { chain };
      if (cursor) {
        params.cursor = cursor;
      }

      const response = await this.request<NansenSmartMoneyResponse>(
        '/smart-money/wallets',
        params
      );

      allWallets.push(...response.data);
      cursor = response.next_cursor;
    } while (cursor);

    return allWallets;
  }

  /**
   * Fetch leaderboard data - Top performing wallets
   */
  async getLeaderboard(
    chain: string = 'arbitrum',
    timeframe: '24h' | '7d' | '30d' = '24h'
  ): Promise<NansenSmartMoneyItem[]> {
    const response = await this.request<NansenSmartMoneyResponse>(
      '/leaderboard/traders',
      { chain, timeframe }
    );

    return response.data;
  }

  /**
   * Get wallet profile details
   */
  async getWalletProfile(address: string): Promise<NansenSmartMoneyItem | null> {
    try {
      const response = await this.request<{ data: NansenSmartMoneyItem }>(
        `/wallet/${address}/profile`
      );
      return response.data;
    } catch {
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

