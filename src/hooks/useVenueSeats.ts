/**
 * useVenueSeats — real-time per-station seat availability via venue-hub SignalR.
 *
 * Connects to /hubs/venue-status on the venue-hub service (separate from main API).
 * Returns individual station statuses with free/occupied/reserved state.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
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

  const subscribe = useCallback(async (conn: HubConnection, vid: string) => {
    if (conn.state === HubConnectionState.Connected) {
      try {
        await conn.invoke('SubscribeToVenue', vid);
      } catch (err) {
        console.warn('[useVenueSeats] Subscribe failed', err);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!venueId) {
      setSeats([]);
      setIsOnline(false);
      setIsLoading(false);
      return;
    }

    let aborted = false;
    const conn = buildVenueHubConnection('/hubs/venue-status');

    conn.on('VenueSeatsSnapshot', (incomingVenueId: string, snapshot: SeatStatus[]) => {
      if (!aborted && incomingVenueId === venueId) {
        setSeats(snapshot);
        setIsLoading(false);
      }
    });

    conn.on('SeatStatusChanged', (seat: SeatStatus) => {
      if (!aborted && seat.venueId === venueId) {
        setSeats(prev => {
          const idx = prev.findIndex(s => s.stationId === seat.stationId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = seat;
            return next;
          }
          return [...prev, seat];
        });
      }
    });

    conn.on('VenueOnlineStatusChanged', (incomingVenueId: string, online: boolean) => {
      if (!aborted && incomingVenueId === venueId) {
        setIsOnline(online);
        if (!online) setSeats([]);
      }
    });

    startWithRetry(conn)
      .then(() => { if (!aborted) subscribe(conn, venueId); })
      .catch(() => { if (!aborted) setIsLoading(false); });

    conn.onreconnected(() => { if (!aborted) subscribe(conn, venueId); });

    return () => {
      aborted = true;
      conn.off('VenueSeatsSnapshot');
      conn.off('SeatStatusChanged');
      conn.off('VenueOnlineStatusChanged');
      if (conn.state === HubConnectionState.Connected) {
        conn.invoke('UnsubscribeFromVenue', venueId).catch(() => {});
      }
      conn.stop().catch(() => {});
    };
  }, [venueId, subscribe]);

  const { freeCount, occupiedCount, reservedCount } = useMemo(() => ({
    freeCount: seats.filter(s => s.status === 'free').length,
    occupiedCount: seats.filter(s => s.status === 'occupied').length,
    reservedCount: seats.filter(s => s.status === 'reserved').length,
  }), [seats]);

  return { seats, isOnline, isLoading, freeCount, occupiedCount, reservedCount };
}
