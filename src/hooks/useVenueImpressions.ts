import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type ImpressionEventType = 'view' | 'card_view' | 'booking_click' | 'contact_click';

export interface DailyImpressions {
  date: string;
  views: number;
  booking_clicks: number;
}

/** Fire-and-forget: log a single impression event. */
export function useTrackImpression() {
  return useMutation({
    mutationFn: async ({
      venueId,
      eventType,
      userId,
    }: {
      venueId: string;
      eventType: ImpressionEventType;
      userId?: string;
    }) => {
      await supabase.from('venue_impressions').insert({
        venue_id: venueId,
        event_type: eventType,
        user_id: userId ?? null,
      });
    },
  });
}

/** Fetch daily impressions (views + booking_clicks) for a venue over the past N days. */
export function useVenueImpressionsData(venueId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ['venue-impressions', venueId, days],
    enabled: !!venueId,
    queryFn: async (): Promise<DailyImpressions[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('venue_impressions')
        .select('event_type, created_at')
        .eq('venue_id', venueId!)
        .in('event_type', ['view', 'booking_click'])
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Aggregate by date
      const map = new Map<string, DailyImpressions>();
      for (const row of data ?? []) {
        const date = row.created_at.slice(0, 10); // YYYY-MM-DD
        if (!map.has(date)) map.set(date, { date, views: 0, booking_clicks: 0 });
        const entry = map.get(date)!;
        if (row.event_type === 'view') entry.views++;
        else if (row.event_type === 'booking_click') entry.booking_clicks++;
      }
      return Array.from(map.values());
    },
  });
}

/** Totals for stat cards. */
export function useVenueImpressionTotals(venueId: string | undefined) {
  return useQuery({
    queryKey: ['venue-impression-totals', venueId],
    enabled: !!venueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venue_impressions')
        .select('event_type')
        .eq('venue_id', venueId!);

      if (error) throw error;

      const totals = { views: 0, card_views: 0, booking_clicks: 0, contact_clicks: 0 };
      for (const row of data ?? []) {
        if (row.event_type === 'view') totals.views++;
        else if (row.event_type === 'card_view') totals.card_views++;
        else if (row.event_type === 'booking_click') totals.booking_clicks++;
        else if (row.event_type === 'contact_click') totals.contact_clicks++;
      }
      return totals;
    },
  });
}
