'use client';

/**
 * Hyperliquid WebSocket Hook
 * Re-render Safe Implementation
 * 
 * FIXED: Proper subscription format for Hyperliquid API
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
          console.log('[HL] ✅ Socket Open - Connected to Hyperliquid');
          updateStatus('connected');
          reconnectAttemptsRef.current = 0;

          // CRITICAL: Send subscription IMMEDIATELY
          // Hyperliquid uses "allMids" for all trades or specific coin
          const subscribeMsg = {
            method: 'subscribe',
            subscription: { type: 'trades', coin: 'BTC' } // Start with BTC
          };
          
          ws.send(JSON.stringify(subscribeMsg));
          console.log('[HL] 📡 Subscribed to BTC trades:', subscribeMsg);

          // Also subscribe to ETH for more data
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              const ethSub = {
                method: 'subscribe',
                subscription: { type: 'trades', coin: 'ETH' }
              };
              ws.send(JSON.stringify(ethSub));
              console.log('[HL] 📡 Subscribed to ETH trades');
            }
          }, 500);

          // Start heartbeat
          heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Debug: Log all incoming messages
            console.log('[HL] 📨 Message received:', message.channel || 'unknown', message);

            // Ignore pong
            if (message.channel === 'pong') return;

            // Handle subscription confirmation
            if (message.channel === 'subscriptionResponse') {
              console.log('[HL] ✅ Subscription confirmed:', message);
              return;
            }

            // Handle trade data - Hyperliquid uses 'trades' channel
            if (message.channel === 'trades' && message.data) {
              updateLastMessageTime();
              incrementMessageCount();

              const trades: HyperliquidTrade[] = Array.isArray(message.data)
                ? message.data
                : [message.data];

              console.log(`[HL] 📊 Received ${trades.length} trades`);

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
            console.error('[HL] ❌ Error parsing message:', err);
          }
        };

        ws.onerror = (err) => {
          console.error('[HL] ❌ WebSocket error:', err);
          updateStatus('error');
          setErrorMessage('WebSocket connection error');
        };

        ws.onclose = (event) => {
          console.log(`[HL] 🔌 Disconnected: ${event.code} - ${event.reason}`);
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
        updateStatus('error');
        setErrorMessage('Failed to connect to Hyperliquid');
      }
    };

    // ============================================
    // INIT: Connect on mount if autoConnect is true
    // ============================================
    if (autoConnect) {
      console.log('[HL] 🚀 Auto-connecting to Hyperliquid...');
      connect();
    }

    // ============================================
    // CLEANUP: Close WS on unmount
    // ============================================
    return () => {
      console.log('[HL] 🧹 Cleaning up WebSocket connection');
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
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
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
