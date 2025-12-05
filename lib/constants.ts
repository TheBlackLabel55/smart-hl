/**
 * Application Constants
 * Centralized configuration values
 */

export const EXPLORER_URL = 'https://hypurrscan.io';
export const HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';
export const NANSEN_API_BASE_URL = 'https://api.nansen.ai/api/v1';

// Chain IDs
export const CHAIN_ID_ARBITRUM = 42161;
export const CHAIN_ID_ETHEREUM = 1;

/**
 * Token list ordered by CoinMarketCap market cap ranking (highest to lowest)
 * Used for sorting tokens in filter dropdowns
 * Based on CoinMarketCap rankings as of 2024-2025
 */
export const TOKEN_MARKET_CAP_ORDER = [
  // Top 10
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'TRX', 'AVAX', 'SHIB',
  // Top 20
  'TON', 'DOT', 'MATIC', 'LINK', 'BCH', 'NEAR', 'LTC', 'UNI', 'ICP', 'APT',
  // Top 30
  'SUI', 'ATOM', 'ALGO', 'ETC', 'VET', 'FIL', 'AAVE', 'INJ', 'STX', 'XTZ',
  // Top 40
  'TIA', 'GRT', 'RENDER', 'FET', 'STRK', 'LDO', 'CRV', 'MORPHO', 'ETHFI', 'FLOKI',
  // Top 50
  'PEPE', 'BONK', 'JUP', 'SEI', 'IMX', 'CRO', 'QNT', 'FLR', 'XDC', 'NEXO',
  // Top 60
  'DASH', 'ZEC', 'HBAR', 'ONE', 'FTM', 'MANA', 'SAND', 'AXS', 'GALA', 'CHZ',
  // Top 70
  'FLOW', 'THETA', 'EOS', 'ENJ', 'BAT', 'ZRX', 'SNX', 'COMP', 'MKR', 'YFI',
  // Top 80
  'SUSHI', '1INCH', 'GMX', 'GNS', 'RAY', 'WIF', 'BLUR', 'PURR', 'HFUN', 'CATBAL',
  // Top 90+
  'SLAY', 'RZR', 'BUDDY', 'PIP', 'RAGE', 'HYPE', 'XLM', 'XMR',
] as const;

/**
 * Create a map for O(1) lookup of token market cap rank
 */
export const TOKEN_MARKET_CAP_RANK = new Map<string, number>(
  TOKEN_MARKET_CAP_ORDER.map((token, index) => [token, index])
);

/**
 * Sort tokens by market cap order (highest market cap first)
 * Tokens not in the list will appear at the end, sorted alphabetically
 */
export function sortTokensByMarketCap(tokens: string[]): string[] {
  return [...tokens].sort((a, b) => {
    const rankA = TOKEN_MARKET_CAP_RANK.get(a) ?? Infinity;
    const rankB = TOKEN_MARKET_CAP_RANK.get(b) ?? Infinity;
    
    // If both are in the list, sort by rank
    if (rankA !== Infinity && rankB !== Infinity) {
      return rankA - rankB;
    }
    
    // If only one is in the list, prioritize it
    if (rankA !== Infinity) return -1;
    if (rankB !== Infinity) return 1;
    
    // If neither is in the list, sort alphabetically
    return a.localeCompare(b);
  });
}

