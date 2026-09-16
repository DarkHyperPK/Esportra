/**
 * useHubGroupJoin — reliable SignalR group membership with retry/monitor.
 * Pattern extracted from useMatchChat (conn.start + backoff + 1s monitor).
 */

import { useEffect, useRef, useState } from 'react';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';

export interface UseHubGroupJoinOptions {
  enabled?: boolean;
  /** Hub invoke for joining the scoped group, e.g. () => conn.invoke('JoinMatch', id) */
  join: () => Promise<void>;
  /** Optional leave on cleanup */
  leave?: () => Promise<void>;
  /** Use SignalRProvider's shared start lock instead of calling conn.start() directly. */
  ensureConnected?: () => Promise<void>;
  onJoinError?: (error: unknown) => void;
}

function isBenignConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('stopped during negotiation')
    || message.includes('Connection was stopped')
    || message.includes('AbortError');
}

export function useHubGroupJoin(
  conn: HubConnection,
  options: UseHubGroupJoinOptions,
): { joined: boolean; connectionState: HubConnectionState } {
  const { enabled = true, join, leave, ensureConnected, onJoinError } = options;
  const joinRef = useRef(join);
  joinRef.current = join;
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  const ensureConnectedRef = useRef(ensureConnected);
  ensureConnectedRef.current = ensureConnected;
  const onJoinErrorRef = useRef(onJoinError);
  onJoinErrorRef.current = onJoinError;
  const [joined, setJoined] = useState(false);
  const [connectionState, setConnectionState] = useState(conn.state);

  useEffect(() => {
    if (!enabled) {
      setJoined(false);
      return;
    }

    let active = true;
    let localJoined = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let monitorTimer: ReturnType<typeof setInterval> | null = null;

    const syncConnectionState = () => {
      if (!active) return;
      setConnectionState(conn.state);
    };

    const clearRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };

    const setJoinedState = (value: boolean) => {
      localJoined = value;
      if (active) setJoined(value);
    };

    const scheduleJoin = (delayMs = 250) => {
      clearRetry();
      retryTimer = setTimeout(() => void attemptJoin(), delayMs);
    };

    const attemptJoin = async () => {
      if (!active) return;
      syncConnectionState();

      if (conn.state === HubConnectionState.Disconnected) {
        if (ensureConnectedRef.current) {
          try {
            await ensureConnectedRef.current();
          } catch (error) {
            if (!isBenignConnectionError(error)) {
              onJoinErrorRef.current?.(error);
            }
            if (active) scheduleJoin(isBenignConnectionError(error) ? 500 : 1500);
            return;
          }
        } else if (active) {
          scheduleJoin(500);
          return;
        }
      }

      if (conn.state !== HubConnectionState.Connected) {
        if (active) scheduleJoin(500);
        return;
      }

      try {
        await joinRef.current();
        if (!active) return;
        setJoinedState(true);
      } catch (error) {
        if (!active) return;
        setJoinedState(false);
        onJoinErrorRef.current?.(error);
        scheduleJoin(1500);
      }
    };

    void attemptJoin();

    monitorTimer = setInterval(() => {
      if (!active) return;
      syncConnectionState();
      if (conn.state !== HubConnectionState.Connected && localJoined) {
        setJoinedState(false);
      }
      if (conn.state === HubConnectionState.Connected && !localJoined) {
        void attemptJoin();
      }
    }, 1000);

    return () => {
      active = false;
      clearRetry();
      if (monitorTimer) clearInterval(monitorTimer);
      setJoinedState(false);
      if (leaveRef.current && conn.state === HubConnectionState.Connected) {
        void leaveRef.current().catch(() => {});
      }
    };
  }, [conn, enabled]);

  return { joined, connectionState };
}

export default useHubGroupJoin;
