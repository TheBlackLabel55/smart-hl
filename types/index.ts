// types/index.ts

// --- NANSEN API TYPES (Server Side Source) ---

export interface NansenSmartMoneyItem {
    address: string;
    label: string; // e.g., "Smart DEX Trader", "Fund", "Flash Boy"
    tags: string[];
    win_rate_24h?: number; // Optional, might come from profiler
    pnl_24h?: number;
  }
  
  // The response structure from Nansen "Smart Money" endpoints
  export interface NansenSmartMoneyResponse {
    data: NansenSmartMoneyItem[];
    next_cursor?: string;
  }
  
  // --- HYPERLIQUID WS TYPES (Client Side Source) ---
  
  // The raw payload from Hyperliquid WebSocket -> channel: "trades"
  export interface HyperliquidTrade {
    coin: string;      // e.g., "BTC", "ETH"
    side: "A" | "B";   // "A" = Ask (Sell), "B" = Bid (Buy) - *Need to map this to Long/Short*
    px: string;        // Price (String to preserve precision)
    sz: string;        // Size (Amount of tokens)
    time: number;      // Epoch millis
    hash: string;      // Transaction hash
    tid: number;       // Trade ID
    users: [string, string]; // [Maker, Taker] addresses - CRITICAL for matching
  }
  
  // --- APP INTERNAL STATE (Frontend) ---
  
  // The optimized map we send to the client to avoid iterating arrays
  // Key = Wallet Address (lowercase), Value = Data
  export interface SmartWalletMap {
    [address: string]: {
      isSmartMoney: boolean;
      labels: string[];
      tier: "whale" | "smart" | "institution";
    };
  }
  
  // The normalized object used for the <TradeRow /> component
  export interface UnifiedTradeLog {
    id: string;        // Unique key (tid + hash)
    timestamp: number;
    ticker: string;
    side: "Long" | "Short"; // Derived from 'side' + context
    price: number;
    sizeUsd: number;   // px * sz
    walletAddress: string;
    walletLabel?: string; // "Nansen Smart Money" or "High Value Whale"
    isWhale: boolean;     // Trade > $100k
    isSmart: boolean;     // Found in Nansen Map
    txHash: string;
  }

  // --- WALLET STATS TYPES (For Dashboard) ---
  
  export interface WalletStats {
    address: string;
    pnl1d: number;
    pnl7d: number;
    pnl30d: number;
    winRate7d: number;  // Percentage (0-100)
    winRate30d: number; // Percentage (0-100)
    volume7d: number;
    volume30d: number;
    twap: number;       // Time-Weighted Average Price
    longPosition: number; // USD value
    shortPosition: number; // USD value
    error?: boolean;
  }

  export interface WalletStatsResponse {
    success: boolean;
    data: WalletStats[];
    progress?: {
      processed: number;
      total: number;
      percentage: number;
    };
    error?: string;
  }

  export type SortField = 'pnl1d' | 'pnl7d' | 'pnl30d' | 'winRate7d' | 'winRate30d' | 'volume7d' | 'volume30d' | 'twap';
  export type SortDirection = 'asc' | 'desc';