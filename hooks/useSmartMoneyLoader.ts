'use client';

/**
 * Smart Money Loader Hook
 * Fetches the Smart Money cache on app initialization
 */

import { useEffect, useCallback, useState } from 'react';
import { useStore } from '@/store/useStore';
import type { SmartMoneyCache } from '@/lib/nansen';

interface LoaderState {
  isLoading: boolean;
  error: string | null;
  walletCount: number;
  lastUpdated: number | null;
}

export function useSmartMoneyLoader() {
  const { setSmartMoneyMap, setLoadingSmartMoney } = useStore();
  
  const [state, setState] = useState<LoaderState>({
    isLoading: true,
    error: null,
    walletCount: 0,
    lastUpdated: null,
  });

  const loadSmartMoneyCache = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    setLoadingSmartMoney(true);

    try {
      const response = await fetch('/api/smart-money', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Smart Money cache: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Unknown error fetching cache');
      }

      const data = result.data as SmartMoneyCache;
      const walletCount = Object.keys(data).length;

      // Update store
      setSmartMoneyMap(data);

      setState({
        isLoading: false,
        error: null,
        walletCount,
        lastUpdated: result.metadata?.lastUpdated || Date.now(),
      });

      console.log(`[Loader] Loaded ${walletCount} Smart Money wallets`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Loader] Failed to load Smart Money cache:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      // Still continue with empty map - app should work without Smart Money labels
      setSmartMoneyMap({});
    } finally {
      setLoadingSmartMoney(false);
    }
  }, [setSmartMoneyMap, setLoadingSmartMoney]);

  // Load on mount
  useEffect(() => {
    loadSmartMoneyCache();
  }, [loadSmartMoneyCache]);

  return {
    ...state,
    reload: loadSmartMoneyCache,
  };
}

