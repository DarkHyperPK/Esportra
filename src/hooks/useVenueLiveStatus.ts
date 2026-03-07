/**
 * useVenueLiveStatus — real-time venue seat status via SignalR LiveHub.
 * Replaces Supabase postgres_changes on venue_live_status.
 *
 * Initial state: fetched from Supabase once (single row, no polling).
 * Updates: SignalR LiveHub SeatUpdate / StatusChange events.
 */

import { useEffect, useState } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { supabase } from '@/lib/supabase';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

export interface LiveStatus {
  seats_total: number;
  seats_occupied: number;
  is_open: boolean;
  updated_at: string;
}

/**
 * Returns live seating status for a venue, or null if not available.
 * Null means the venue is not connected to the Esportra Desktop Agent.
 */
export function useVenueLiveStatus(venueId: string | undefined): LiveStatus | null {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const conn = useHub(HubPaths.Live);

  // Initial fetch from Supabase
  useEffect(() => {
    if (!venueId) return;
    supabase
      .from('venue_live_status')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle()
      .then(({ data }) => { if (data) setStatus(data as LiveStatus); });
  }, [venueId]);

  // SignalR live updates
  useEffect(() => {
    if (!venueId) return;

    let active = true;

    const handleSeatUpdate = (payload: Partial<LiveStatus> & { venueId?: string }) => {
      if (!active) return;
      setStatus((prev) => prev ? { ...prev, ...payload } : null);
    };

    const handleStatusChange = (payload: Partial<LiveStatus> & { venueId?: string }) => {
      if (!active) return;
      setStatus((prev) => prev ? { ...prev, ...payload } : null);
    };

    conn.on('SeatUpdate', handleSeatUpdate);
    conn.on('StatusChange', handleStatusChange);

    const join = () => {
      if (!active || conn.state !== HubConnectionState.Connected) return;
      conn.invoke('JoinVenue', venueId).catch(console.warn);
    };
    join();
    conn.onreconnected(join);

    return () => {
      active = false;
      conn.off('SeatUpdate', handleSeatUpdate);
      conn.off('StatusChange', handleStatusChange);
      if (conn.state === HubConnectionState.Connected)
        conn.invoke('LeaveVenue', venueId).catch(() => {});
    };
  }, [conn, venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  return status;
}
