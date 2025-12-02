'use client';

/**
 * Hyperliquid WebSocket Hook
 * Re-render Safe Implementation
 * 
 * CRITICAL: This hook ALWAYS connects on mount - no dependencies on cache
 * Hardcoded WS URL to rule out env var issues
 */

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import type { HyperliquidTrade } from '@/types';
import { HYPERLIQUID_WS_URL } from '@/lib/constants';

// Use constant from lib/constants.ts
const WS_URL = HYPERLIQUID_WS_URL;
const RECONNECT_DELAY_BASE = 3000;
const HEARTBEAT_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 5;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useHyperliquidWS(
  onTrade?: (trade: HyperliquidTrade) => void
) {
  // ============================================
  // REFS: Mutable values that don't trigger re-renders
  // ============================================
  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<ConnectionStatus>('disconnected');
  const reconnectAttemptsRef = useRef(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  
  // Store the callback in a ref so we always have the latest version
  const onTradeRef = useRef(onTrade);

  // Keep ref updated with latest callback
  onTradeRef.current = onTrade;

  // ============================================
  // GET STORE ACTIONS ONCE (stable references)
  // ============================================
  const setConnectionStatus = useStore((s) => s.setConnectionStatus);
  const setErrorMessage = useStore((s) => s.setErrorMessage);
  const updateLastMessageTime = useStore((s) => s.updateLastMessageTime);
  const incrementMessageCount = useStore((s) => s.incrementMessageCount);

  // ============================================
  // MAIN EFFECT: Runs ONCE on mount - ALWAYS CONNECTS
  // ============================================
  useEffect(() => {
    mountedRef.current = true;
    
    console.log('[HL] 🚀 Hook mounted - initiating connection...');

    // Guard function: Only update store if status actually changed
    const updateStatus = (newStatus: ConnectionStatus) => {
      if (!mountedRef.current) return;
      if (statusRef.current !== newStatus) {
        console.log(`[HL] Status: ${statusRef.current} → ${newStatus}`);
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

    const connect = () => {
      if (!mountedRef.current) return;
      
      // Guard: Don't connect if already open or connecting
      if (
        wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING
      ) {
        console.log('[HL] Already connected or connecting, skipping...');
        return;
      }

      console.log('[HL] 📡 Creating WebSocket connection to:', WS_URL);
      updateStatus('connecting');
      setErrorMessage(null);

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) return;
          
          console.log('[HL] ✅ Socket OPEN - Connected to Hyperliquid!');
          updateStatus('connected');
          reconnectAttemptsRef.current = 0;

          // CRITICAL: Send subscription IMMEDIATELY
          const btcSub = {
            method: 'subscribe',
            subscription: { type: 'trades', coin: 'BTC' }
          };
          
          ws.send(JSON.stringify(btcSub));
          console.log('[HL] 📡 Sent BTC subscription:', JSON.stringify(btcSub));

          // Also subscribe to ETH for more data
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN && mountedRef.current) {
              const ethSub = {
                method: 'subscribe',
                subscription: { type: 'trades', coin: 'ETH' }
              };
              ws.send(JSON.stringify(ethSub));
              console.log('[HL] 📡 Sent ETH subscription');
            }
          }, 500);

          // Start heartbeat
          heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          
          try {
            const message = JSON.parse(event.data);
            
            // Log first few messages for debugging
            if (message.channel !== 'pong') {
              console.log('[HL] 📨 Message:', message.channel, message);
            }

            // Ignore pong
            if (message.channel === 'pong') return;

            // Handle subscription confirmation
            if (message.channel === 'subscriptionResponse') {
              console.log('[HL] ✅ Subscription confirmed!');
              return;
            }

            // Handle trade data
            if (message.channel === 'trades' && message.data) {
              updateLastMessageTime();
              incrementMessageCount();

              const trades: HyperliquidTrade[] = Array.isArray(message.data)
                ? message.data
                : [message.data];

              console.log(`[HL] 📊 Got ${trades.length} trade(s)`);

              // Call the callback if provided
              if (onTradeRef.current) {
                for (const trade of trades) {
                  onTradeRef.current(trade);
                }
              }
            }
          } catch (err) {
            console.error('[HL] ❌ Parse error:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('[HL] ❌ WebSocket ERROR:', err);
          if (mountedRef.current) {
            updateStatus('error');
            setErrorMessage('WebSocket connection error');
          }
        };

        ws.onclose = (event) => {
          console.log(`[HL] 🔌 Socket CLOSED: code=${event.code}, reason=${event.reason}`);
          clearTimers();
          wsRef.current = null;

          if (!mountedRef.current) return;

          // Clean close = don't reconnect
          if (event.code === 1000) {
            updateStatus('disconnected');
            return;
          }

          // Auto-reconnect with exponential backoff
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            const delay = RECONNECT_DELAY_BASE * reconnectAttemptsRef.current;

            console.log(`[HL] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
            setErrorMessage(`Reconnecting... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

            reconnectTimeoutRef.current = setTimeout(connect, delay);
          } else {
            updateStatus('error');
            setErrorMessage('Max reconnection attempts reached. Please refresh.');
          }
        };
      } catch (err) {
        console.error('[HL] ❌ Failed to create WebSocket:', err);
        if (mountedRef.current) {
          updateStatus('error');
          setErrorMessage('Failed to connect to Hyperliquid');
        }
      }
    };

    // ============================================
    // INIT: ALWAYS connect immediately on mount
    // ============================================
    connect();

    // ============================================
    // CLEANUP: Close WS on unmount
    // ============================================
    return () => {
      console.log('[HL] 🧹 Unmounting - cleaning up...');
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- EMPTY: Run ONCE on mount, no conditions

  // ============================================
  // MANUAL CONTROLS
  // ============================================
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
    disconnect: manualDisconnect,
  };
}
