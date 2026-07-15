/**
 * SignalRContext — global hub connection manager.
 *
 * One HubConnection per hub path, shared across all hooks.
 * Connections are created + started lazily on first `getConnection()` call.
 * On Supabase SIGNED_OUT, all connections are stopped and cleared.
 *
 * Mount <SignalRProvider> inside <AuthProvider> so it reacts to auth events.
 */

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { buildHubConnection } from '@/lib/signalrClient';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { SignalRContext } from '@/contexts/signalr-context';

// ── Provider ──────────────────────────────────────────────────────────────────

export function SignalRProvider({ children }: { children: ReactNode }) {
  const { loading: authLoading } = useAuth();
  // Map<hubPath, HubConnection> — never triggers re-renders, just a stable registry
  const registry = useRef<Map<string, HubConnection>>(new Map());
  const startPromises = useRef<Map<string, Promise<void>>>(new Map());
  const lastStartFailure = useRef<Map<string, number>>(new Map());

  const START_FAILURE_COOLDOWN_MS = 10_000;

  const getOrCreateConnection = useCallback((hubPath: string): HubConnection => {
    const existing = registry.current.get(hubPath);
    if (existing) return existing;

    const conn = buildHubConnection(hubPath);
    registry.current.set(hubPath, conn);
    return conn;
  }, []);

  const isBenignStartError = (err: unknown): boolean => {
    const message = err instanceof Error ? err.message : String(err);
    return message.includes('stopped during negotiation')
      || message.includes('Connection was stopped')
      || message.includes('AbortError');
  };

  const startConnection = useCallback((hubPath: string) => {
    if (authLoading) {
      return Promise.resolve();
    }

    const conn = getOrCreateConnection(hubPath);

    if (conn.state === HubConnectionState.Connected || conn.state === HubConnectionState.Connecting) {
      return Promise.resolve();
    }

    if (conn.state === HubConnectionState.Reconnecting) {
      return Promise.resolve();
    }

    const existingPromise = startPromises.current.get(hubPath);
    if (existingPromise) {
      return existingPromise;
    }

    const lastFailureAt = lastStartFailure.current.get(hubPath) ?? 0;
    if (Date.now() - lastFailureAt < START_FAILURE_COOLDOWN_MS) {
      return Promise.resolve();
    }

    const startPromise = conn.start()
      .catch((err) => {
        if (!isBenignStartError(err)) {
          lastStartFailure.current.set(hubPath, Date.now());
          console.warn(`[SignalR] Connect failed for ${hubPath}:`, err);
        }
      })
      .finally(() => {
        startPromises.current.delete(hubPath);
      });

    startPromises.current.set(hubPath, startPromise);
    return startPromise;
  }, [authLoading, getOrCreateConnection]);

  const stopAll = useCallback(async () => {
    const connections = [...registry.current.values()];
    registry.current.clear();
    startPromises.current.clear();
    lastStartFailure.current.clear();
    await Promise.allSettled(
      connections
        .filter((c) => c.state !== HubConnectionState.Disconnected)
        .map((c) => c.stop()),
    );
  }, []);

  // Connections created while auth was loading are not auto-started — kick them off once ready.
  useEffect(() => {
    if (authLoading) return;
    for (const hubPath of registry.current.keys()) {
      void startConnection(hubPath);
    }
  }, [authLoading, startConnection]);

  // Stop all connections on sign-out to prevent reconnect loops with an expired token
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') stopAll();
    });
    return () => subscription.unsubscribe();
  }, [stopAll]);

  // Cleanup on unmount (HMR / app teardown)
  useEffect(() => () => { stopAll(); }, [stopAll]);

  const getConnection = useCallback((hubPath: string, options?: { autoStart?: boolean }): HubConnection => {
    const conn = getOrCreateConnection(hubPath);

    if (options?.autoStart !== false) {
      void startConnection(hubPath);
    }

    return conn;
  }, [getOrCreateConnection, startConnection]);

  const ensureHubStarted = useCallback(
    (hubPath: string) => startConnection(hubPath),
    [startConnection],
  );

  return (
    <SignalRContext.Provider value={{ getConnection, ensureHubStarted }}>
      {children}
    </SignalRContext.Provider>
  );
}
