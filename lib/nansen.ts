/**
 * Nansen API Client
 * 
 * DEPRECATED: This file is no longer used.
 * We have switched to a static local list of Smart Money wallets.
 * 
 * See: lib/data/static-wallets.ts (STATIC_SMART_WALLETS)
 * 
 * This file is kept for reference only. All functionality has been moved to static data.
 */

// All Nansen API code has been removed.
// The application now uses STATIC_SMART_WALLETS from lib/data/static-wallets.ts

export interface SimplifiedSmartWallet {
  label: string;
  tags: string[];
  winRate: number;
  tier: 'smart' | 'whale' | 'institution';
}

export type SmartMoneyCache = Record<string, SimplifiedSmartWallet>;
