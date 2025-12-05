'use client';

/**
 * useSmartWallets Hook
 * Fetches wallet statistics and handles client-side sorting
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

  // Sort wallets based on current sort settings
  const sortedWallets = useMemo(() => {
    if (!sortField) return state.wallets;

    return [...state.wallets].sort((a, b) => {
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
  }, [state.wallets, sortField, sortDirection]);

  return {
    ...state,
    wallets: sortedWallets,
    sortField,
    sortDirection,
    handleSort,
    refetch: fetchWallets,
  };
}
