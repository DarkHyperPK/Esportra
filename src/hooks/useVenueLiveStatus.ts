import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface LiveStatus {
  seats_total: number;
  seats_occupied: number;
  is_open: boolean;
  updated_at: string;
}

/**
 * Subscribes to real-time live seating status for a venue.
 * Returns null when no live status row exists (venue not connected to desktop).
 */
export function useVenueLiveStatus(venueId: string | undefined): LiveStatus | null {
  const [status, setStatus] = useState<LiveStatus | null>(null);

  useEffect(() => {
    if (!venueId) return;

    // Initial fetch
    supabase
      .from('venue_live_status')
      .select('*')
      .eq('venue_id', venueId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setStatus(data as LiveStatus);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`live_status:${venueId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venue_live_status',
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          setStatus(payload.new as LiveStatus);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  return status;
}
