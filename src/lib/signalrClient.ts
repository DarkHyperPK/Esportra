/**
 * signalrClient.ts
 *
 * Factory for creating SignalR hub connections to the Esportra .NET backend.
 * Automatically attaches the Supabase session JWT via query string
 * (required for WebSocket upgrades which cannot set custom headers).
 *
 * Usage:
 *   import { buildHubConnection } from '@/lib/signalrClient';
 *
 *   // In a React context or hook:
 *   const connection = buildHubConnection('/hubs/notification');
 *   await connection.start();
 *   connection.on('NewNotification', (payload) => { ... });
 *
 * Phase 0 — client factory only. Hubs are registered in Phase 3 (Real-time migration).
 */

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
const VENUE_HUB_URL = import.meta.env.VITE_VENUE_HUB_URL ?? '';

// ── Hub connection factory ────────────────────────────────────────────────────

/**
 * Build a SignalR hub connection for the given hub path.
 * The JWT is refreshed on every reconnect attempt so it never expires mid-session.
 *
 * @param hubPath  Path relative to API base, e.g. '/hubs/notification'
 * @returns A configured HubConnection (not yet started)
 */
export function buildHubConnection(hubPath: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}${hubPath}`, {
      // Supabase JWT passed as query string (WS handshake cannot set headers)
      accessTokenFactory: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? '';
      },
    })
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(
      import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning,
    )
    .build();
}

/**
 * Build a SignalR connection to the venue-hub service (separate from main API).
 * Used for real-time seat availability. No auth required (public read-only).
 */
export function buildVenueHubConnection(hubPath: string): HubConnection {
  const base = VENUE_HUB_URL || API_BASE_URL;
  return new HubConnectionBuilder()
    .withUrl(`${base}${hubPath}`)
    .withAutomaticReconnect([0, 2_000, 5_000, 10_000, 30_000])
    .configureLogging(
      import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning,
    )
    .build();
}

// ── Convenience helpers ───────────────────────────────────────────────────────

/** Start a connection with exponential-backoff retry (up to 10 attempts). */
export async function startWithRetry(
  connection: HubConnection,
  maxAttempts = 10,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (connection.state === HubConnectionState.Connected) return;

    try {
      await connection.start();
      console.log(`[SignalR] Connected: ${connection.connectionId}`);
      return;
    } catch (err) {
      const delay = Math.min(1_000 * 2 ** attempt, 30_000);
      console.warn(`[SignalR] Attempt ${attempt}/${maxAttempts} failed — retrying in ${delay}ms`, err);
      if (attempt < maxAttempts) await sleep(delay);
    }
  }
  throw new Error('[SignalR] Failed to connect after max attempts');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Hub names (Phase 3 registry) ─────────────────────────────────────────────

/** Known hub paths — add more as Phase 3 progresses. */
export const HubPaths = {
  Notification  : '/hubs/notifications',
  Bracket       : '/hubs/bracket',
  Match         : '/hubs/match',
  Veto          : '/hubs/veto',
  Chat          : '/hubs/chat',
  Conversation  : '/hubs/conversations',
  Live          : '/hubs/live',
  VenueStatus   : '/hubs/venue-status',
  BR            : '/hubs/br',
} as const;
