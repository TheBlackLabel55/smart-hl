'use client';

/**
 * Hyperliquid WebSocket Hook
 * Re-render Safe Implementation
 * 
 * Key fixes:
 * 1. Ref-based guards to prevent redundant store updates
 * 2. Empty dependency array on main useEffect
 * 3. Refs for mutable values accessed inside effect
 */

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import type { HyperliquidTrade } from '@/types';

const WS_URL = 'wss://api.hyperliquid.xyz/ws';
const RECONNECT_DELAY_BASE = 3000;
const HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseHyperliquidWSOptions {
  coins?: string[];
  autoConnect?: boolean;
}

export function useHyperliquidWS(
  onTrade: (trade: HyperliquidTrade) => void,
  options: UseHyperliquidWSOptions = {}
) {
  const { coins = [], autoConnect = true } = options;

  // ============================================
  // REFS: Mutable values that don't trigger re-renders
  // ============================================
  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<ConnectionStatus>('disconnected');
  const reconnectAttemptsRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Store the callback in a ref so we always have the latest version
  const onTradeRef = useRef(onTrade);
  const coinsRef = useRef(coins);

  // Keep refs updated with latest values
  onTradeRef.current = onTrade;
  coinsRef.current = coins;

  // ============================================
  // GET STORE ACTIONS ONCE (stable references)
  // ============================================
  const setConnectionStatus = useStore((s) => s.setConnectionStatus);
  const setErrorMessage = useStore((s) => s.setErrorMessage);
  const updateLastMessageTime = useStore((s) => s.updateLastMessageTime);
  const incrementMessageCount = useStore((s) => s.incrementMessageCount);

  // ============================================
  // MAIN EFFECT: Runs ONCE on mount
  // ============================================
  useEffect(() => {
    // Guard function: Only update store if status actually changed
    const updateStatus = (newStatus: ConnectionStatus) => {
      if (statusRef.current !== newStatus) {
        statusRef.current = newStatus;
        setConnectionStatus(newStatus);
      }
    };

    const clearTimers = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const sendHeartbeat = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ method: 'ping' }));
      }
    };

    const subscribe = (ws: WebSocket) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      ws.send(JSON.stringify({
        method: 'subscribe',
        subscription: { type: 'trades' },
      }));
      console.log('[WS] Subscribed to trades channel');
    };

    const connect = () => {
      // Guard: Don't connect if already open or connecting
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) {
        return;
      }

      updateStatus('connecting');
      setErrorMessage(null);

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WS] Connected to Hyperliquid');
          updateStatus('connected');
          reconnectAttemptsRef.current = 0;

          // Subscribe to trades
          subscribe(ws);

          // Start heartbeat
          heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Ignore pong
            if (message.channel === 'pong') return;

            // Handle trade data
            if (message.channel === 'trades' && message.data) {
              updateLastMessageTime();
              incrementMessageCount();

              const trades: HyperliquidTrade[] = Array.isArray(message.data)
                ? message.data
                : [message.data];

              for (const trade of trades) {
                // Filter by coin if specified (use ref for latest value)
                if (coinsRef.current.length > 0 && !coinsRef.current.includes(trade.coin)) {
                  continue;
                }
                // Call the callback via ref (always latest)
                onTradeRef.current(trade);
              }
            }
          } catch (err) {
            console.error('[WS] Error parsing message:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('[WS] WebSocket error:', err);
          updateStatus('error');
          setErrorMessage('WebSocket connection error');
        };

        ws.onclose = (event) => {
          console.log(`[WS] Disconnected: ${event.code} - ${event.reason}`);
          clearTimers();
          wsRef.current = null;

          // Clean close = don't reconnect
          if (event.code === 1000) {
            updateStatus('disconnected');
            return;
          }

          // Auto-reconnect with exponential backoff
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            const delay = RECONNECT_DELAY_BASE * reconnectAttemptsRef.current;

            console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
            setErrorMessage(`Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

            reconnectTimeoutRef.current = setTimeout(connect, delay);
          } else {
            updateStatus('error');
            setErrorMessage('Max reconnection attempts reached. Please refresh.');
          }
        };
      } catch (err) {
        console.error('[WS] Failed to create WebSocket:', err);
        updateStatus('error');
        setErrorMessage('Failed to connect to Hyperliquid');
      }
    };

    // ============================================
    // INIT: Connect on mount if autoConnect is true
    // ============================================
    if (autoConnect) {
      connect();
    }

    // ============================================
    // CLEANUP: Close WS on unmount
    // ============================================
    return () => {
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
      statusRef.current = 'disconnected';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- CRITICAL: Empty array = run ONCE on mount

  // ============================================
  // MANUAL CONTROLS (optional)
  // ============================================
  const manualConnect = () => {
    // This is a simplified version for manual triggering
    // The main logic is inside the effect
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Force a remount by closing existing
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual reconnect');
    }
  };

  const manualDisconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    
    if (statusRef.current !== 'disconnected') {
      statusRef.current = 'disconnected';
      setConnectionStatus('disconnected');
    }
  };

  return {
    connect: manualConnect,
    disconnect: manualDisconnect,
  };
}
