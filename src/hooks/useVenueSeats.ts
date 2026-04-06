/**
 * useVenueSeats — real-time per-station seat availability via venue-hub SignalR.
 *
 * Connects to /hubs/venue-status on the venue-hub service (separate from main API).
 * Returns individual station statuses with free/occupied/reserved state.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { buildVenueHubConnection, startWithRetry } from '@/lib/signalrClient';
import type { SeatStatus } from '@/types/venue';

interface UseVenueSeatsReturn {
  seats: SeatStatus[];
  isOnline: boolean;
  isLoading: boolean;
  freeCount: number;
  occupiedCount: number;
  reservedCount: number;
}

export function useVenueSeats(venueId: string | undefined): UseVenueSeatsReturn {
  const [seats, setSeats] = useState<SeatStatus[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const connRef = useRef<HubConnection | null>(null);

  const subscribe = useCallback(async (conn: HubConnection, vid: string) => {
    if (conn.state === HubConnectionState.Connected) {
      await conn.invoke('SubscribeToVenue', vid).catch(console.warn);
    }
  }, []);

  useEffect(() => {
    if (!venueId) {
      setSeats([]);
      setIsOnline(false);
      setIsLoading(false);
      return;
    }

    const conn = buildVenueHubConnection('/hubs/venue-status');
    connRef.current = conn;

    // Handle full seat snapshot (on subscribe + full syncs)
    conn.on('VenueSeatsSnapshot', (_venueId: string, snapshot: SeatStatus[]) => {
      setSeats(snapshot);
      setIsLoading(false);
    });

    // Handle single station status change
    conn.on('SeatStatusChanged', (seat: SeatStatus) => {
      setSeats(prev => {
        const idx = prev.findIndex(s => s.stationId === seat.stationId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = seat;
          return next;
        }
        return [...prev, seat];
      });
    });

    // Handle venue online/offline status
    conn.on('VenueOnlineStatusChanged', (_venueId: string, online: boolean) => {
      setIsOnline(online);
      if (!online) {
        setSeats([]);
      }
    });

    // Start connection and subscribe
    startWithRetry(conn)
      .then(() => subscribe(conn, venueId))
      .catch(() => {
        setIsLoading(false);
      });

    // Re-subscribe on reconnect
    conn.onreconnected(() => subscribe(conn, venueId));

    return () => {
      conn.off('VenueSeatsSnapshot');
      conn.off('SeatStatusChanged');
      conn.off('VenueOnlineStatusChanged');
      if (conn.state === HubConnectionState.Connected) {
        conn.invoke('UnsubscribeFromVenue', venueId).catch(() => {});
      }
      conn.stop().catch(() => {});
      connRef.current = null;
    };
  }, [venueId, subscribe]);

  const freeCount = seats.filter(s => s.status === 'free').length;
  const occupiedCount = seats.filter(s => s.status === 'occupied').length;
  const reservedCount = seats.filter(s => s.status === 'reserved').length;

  return { seats, isOnline, isLoading, freeCount, occupiedCount, reservedCount };
}
