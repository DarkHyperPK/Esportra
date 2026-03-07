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
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { buildHubConnection } from '@/lib/signalrClient';
import { supabase } from '@/lib/supabase';

// ── Context ───────────────────────────────────────────────────────────────────

interface SignalRContextValue {
  /** Returns (creating + starting if needed) a singleton connection for the hub. */
  getConnection: (hubPath: string) => HubConnection;
}

const SignalRContext = createContext<SignalRContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SignalRProvider({ children }: { children: ReactNode }) {
  // Map<hubPath, HubConnection> — never triggers re-renders, just a stable registry
  const registry = useRef<Map<string, HubConnection>>(new Map());

  const stopAll = useCallback(async () => {
    const connections = [...registry.current.values()];
    registry.current.clear();
    await Promise.allSettled(
      connections
        .filter((c) => c.state !== HubConnectionState.Disconnected)
        .map((c) => c.stop()),
    );
  }, []);

  // Stop all connections on sign-out to prevent reconnect loops with an expired token
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') stopAll();
    });
    return () => subscription.unsubscribe();
  }, [stopAll]);

  // Cleanup on unmount (HMR / app teardown)
  useEffect(() => () => { stopAll(); }, [stopAll]);

  const getConnection = useCallback((hubPath: string): HubConnection => {
    const existing = registry.current.get(hubPath);
    if (existing) return existing;

    const conn = buildHubConnection(hubPath);
    registry.current.set(hubPath, conn);

    // Start asynchronously — hooks handle the not-yet-connected state
    conn.start().catch((err) => {
      console.warn(`[SignalR] Initial connect failed for ${hubPath}:`, err);
    });

    return conn;
  }, []);

  return (
    <SignalRContext.Provider value={{ getConnection }}>
      {children}
    </SignalRContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSignalR(): SignalRContextValue {
  const ctx = useContext(SignalRContext);
  if (!ctx) throw new Error('useSignalR must be used inside <SignalRProvider>');
  return ctx;
}

/**
 * Returns a singleton HubConnection for the given hub path.
 * The connection is created + started on first call per path.
 */
export function useHub(hubPath: string): HubConnection {
  const { getConnection } = useSignalR();
  return getConnection(hubPath);
}
