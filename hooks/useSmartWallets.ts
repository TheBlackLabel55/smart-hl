'use client';

/**
 * useSmartWallets Hook
 * Fetches wallet statistics and handles client-side sorting, filtering, and pagination
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { WalletStats, SortField, SortDirection } from '@/types';

interface UseSmartWalletsState {
  wallets: WalletStats[];
  isLoading: boolean;
  error: string | null;
  progress: number; // 0-100
  totalLong: number;
  totalShort: number;
}

const INITIAL_DISPLAY_LIMIT = 20; // Show 20 wallets initially
const LOAD_MORE_INCREMENT = 20; // Load 20 more at a time

export function useSmartWallets() {
  const [state, setState] = useState<UseSmartWalletsState>({
    wallets: [],
    isLoading: true,
    error: null,
    progress: 0,
    totalLong: 0,
    totalShort: 0,
  });

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_LIMIT);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

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
        totalLong: result.metadata?.totalLong || 0,
        totalShort: result.metadata?.totalShort || 0,
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
  }, [selectedToken]);

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

  // Derive available tokens from all wallets
  const availableTokens = useMemo(() => {
    const tokenSet = new Set<string>();
    state.wallets.forEach(wallet => {
      wallet.positions?.forEach(pos => {
        tokenSet.add(pos.coin);
      });
    });
    return Array.from(tokenSet).sort();
  }, [state.wallets]);

  // Filter, sort, and paginate wallets
  const filteredAndSortedWallets = useMemo(() => {
    let filtered = state.wallets;

    // Filter by selected token (if set)
    if (selectedToken) {
      filtered = filtered.filter(wallet => 
        wallet.positions?.some(pos => pos.coin === selectedToken)
      );
    }

    // Sort wallets
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        // Handle error states (put them at the end)
        if (a.error && !b.error) return 1;
        if (!a.error && b.error) return -1;
        if (a.error && b.error) return 0;

        // Compare values
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

  return {
    ...state,
    wallets: filteredAndSortedWallets,
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
  };
}
