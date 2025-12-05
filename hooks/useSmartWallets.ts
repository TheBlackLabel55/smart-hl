'use client';

/**
 * useSmartWallets Hook
 * Fetches wallet statistics and handles client-side sorting, filtering, and pagination
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WalletStats, SortField, SortDirection } from '@/types';
import { sortTokensByMarketCap } from '@/lib/constants';

interface UseSmartWalletsState {
  wallets: WalletStats[];
  isLoading: boolean;
  error: string | null;
  progress: number; // 0-100
}

const INITIAL_DISPLAY_LIMIT = 20; // Show 20 wallets initially
const LOAD_MORE_INCREMENT = 20; // Load 20 more at a time

export function useSmartWallets() {
  const [state, setState] = useState<UseSmartWalletsState>({
    wallets: [],
    isLoading: true,
    error: null,
    progress: 0,
  });

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_LIMIT);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState<'all' | '10k' | '50k' | '250k' | '1m'>('all');
  const [pnlFilter, setPnlFilter] = useState<'all' | '0' | '10k' | '50k' | '250k'>('all');

  // Fetch wallet stats
  const fetchWallets = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }));

    try {
      const response = await fetch('/api/wallets/stats');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch wallet stats: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      setState({
        wallets: result.data || [],
        isLoading: false,
        error: null,
        progress: 100,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useSmartWallets] Error:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        progress: 0,
      }));
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  // Reset display limit when filter changes
  useEffect(() => {
    setDisplayLimit(INITIAL_DISPLAY_LIMIT);
  }, [selectedToken, sizeFilter, pnlFilter]);

  // Handle column header click for sorting
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // Load more wallets (infinite scroll)
  const loadMore = useCallback(() => {
    setDisplayLimit(prev => prev + LOAD_MORE_INCREMENT);
  }, []);

  // Derive available tokens from all wallets, sorted by market cap (highest first)
  const availableTokens = useMemo(() => {
    const tokenSet = new Set<string>();
    state.wallets.forEach(wallet => {
      wallet.positions?.forEach(pos => {
        tokenSet.add(pos.coin);
      });
    });
    return sortTokensByMarketCap(Array.from(tokenSet));
  }, [state.wallets]);

  const getSizeValue = useCallback((wallet: WalletStats) => {
    if (selectedToken) {
      const position = wallet.positions?.find(p => p.coin === selectedToken);
      return position?.sizeUsd || 0;
    }
    return (wallet.longPosition || 0) + (wallet.shortPosition || 0);
  }, [selectedToken]);

  const getPnlValue = useCallback((wallet: WalletStats) => {
    // Use 7D PnL as primary filter metric
    return wallet.pnl7d || 0;
  }, []);

  // Filter, sort, and paginate wallets
  const filteredAndSortedWallets = useMemo(() => {
    let filtered = state.wallets;

    // Filter by selected token (if set)
    if (selectedToken) {
      filtered = filtered.filter(wallet => 
        wallet.positions?.some(pos => pos.coin === selectedToken)
      );
    }

    // Filter by position size thresholds
    if (sizeFilter !== 'all') {
      const thresholds = {
        '10k': 10_000,
        '50k': 50_000,
        '250k': 250_000,
        '1m': 1_000_000,
      } as const;
      const threshold = thresholds[sizeFilter];
      filtered = filtered.filter(wallet => getSizeValue(wallet) >= threshold);
    }

    // Filter by PnL thresholds (using 7D PnL)
    if (pnlFilter !== 'all') {
      const thresholds = {
        '0': 0,
        '10k': 10_000,
        '50k': 50_000,
        '250k': 250_000,
      } as const;
      const threshold = thresholds[pnlFilter];
      filtered = filtered.filter(wallet => getPnlValue(wallet) >= threshold);
    }

    // Sort wallets
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        // Handle error states (put them at the end)
        if (a.error && !b.error) return 1;
        if (!a.error && b.error) return -1;
        if (a.error && b.error) return 0;

        // Handle special sort fields: 'side' and 'size'
        if (sortField === 'side') {
          const getSideValue = (wallet: WalletStats): number => {
            if (selectedToken) {
              // Find position for selected token
              const position = wallet.positions?.find(p => p.coin === selectedToken);
              if (!position) return 0; // No position = neutral
              return position.side === 'Long' ? 1 : -1;
            } else {
              // Net direction: Long if longPosition > shortPosition
              const net = (wallet.longPosition || 0) - (wallet.shortPosition || 0);
              return net > 0 ? 1 : net < 0 ? -1 : 0;
            }
          };
          const aSide = getSideValue(a);
          const bSide = getSideValue(b);
          return sortDirection === 'asc' 
            ? aSide - bSide 
            : bSide - aSide;
        }

        if (sortField === 'size') {
          const aSize = getSizeValue(a);
          const bSize = getSizeValue(b);
          return sortDirection === 'asc' 
            ? aSize - bSize 
            : bSize - aSize;
        }

        // Standard numeric field sorting
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' 
            ? aValue - bValue 
            : bValue - aValue;
        }

        return 0;
      });
    }

    // Slice by display limit (pagination)
    return filtered.slice(0, displayLimit);
  }, [state.wallets, selectedToken, sortField, sortDirection, displayLimit]);

  // Check if there are more wallets to load
  const hasMore = useMemo(() => {
    let filtered = state.wallets;
    if (selectedToken) {
      filtered = filtered.filter(wallet => 
        wallet.positions?.some(pos => pos.coin === selectedToken)
      );
    }
    return filtered.length > displayLimit;
  }, [state.wallets, selectedToken, displayLimit]);

  // Calculate totalLong and totalShort dynamically based on selectedToken
  const { totalLong, totalShort } = useMemo(() => {
    if (!selectedToken) {
      // No token filter: sum all wallets' aggregate positions
      const totalLong = state.wallets.reduce((sum, wallet) => sum + (wallet.longPosition || 0), 0);
      const totalShort = state.wallets.reduce((sum, wallet) => sum + (wallet.shortPosition || 0), 0);
      return { totalLong, totalShort };
    } else {
      // Token filter active: sum positions matching the selected token
      let totalLong = 0;
      let totalShort = 0;
      
      state.wallets.forEach(wallet => {
        if (wallet.positions) {
          wallet.positions.forEach(position => {
            if (position.coin === selectedToken) {
              if (position.side === 'Long') {
                totalLong += position.sizeUsd;
              } else {
                totalShort += position.sizeUsd;
              }
            }
          });
        }
      });
      
      return { totalLong, totalShort };
    }
  }, [state.wallets, selectedToken]);

  return {
    ...state,
    wallets: filteredAndSortedWallets,
    totalLong,
    totalShort,
    sortField,
    sortDirection,
    handleSort,
    refetch: fetchWallets,
    // New properties
    displayLimit,
    loadMore,
    hasMore,
    selectedToken,
    setSelectedToken,
    availableTokens,
    sizeFilter,
    setSizeFilter,
    pnlFilter,
    setPnlFilter,
  };
}
