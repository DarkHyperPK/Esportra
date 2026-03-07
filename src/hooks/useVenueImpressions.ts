/**
 * useVenueImpressions — Domain 8: Venue Analytics
 *
 * Migrated from Supabase (fetched all rows + client-side GROUP BY loop) to .NET API
 * (server-side GROUP BY aggregation — single DB query per endpoint).
 *
 * Public hooks (useTrackImpression, useVenueImpressionsData, useVenueImpressionTotals)
 * are backward-compatible.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type ImpressionEventType = 'view' | 'card_view' | 'booking_click' | 'contact_click';

export interface DailyImpressions {
  date: string;
  views: number;
  booking_clicks: number;
}

/** Fire-and-forget: log a single impression event. */
export function useTrackImpression() {
  return useMutation({
    mutationFn: ({ venueId, eventType }: { venueId: string; eventType: ImpressionEventType; userId?: string }) =>
      apiClient.post(`/api/venues/${venueId}/impressions`, { eventType }),
  });
}

/** Daily impressions (views + booking_clicks) — server-side GROUP BY. */
export function useVenueImpressionsData(venueId: string | undefined, days = 30) {
  return useQuery<DailyImpressions[]>({
    queryKey: ['venue-impressions', venueId, days],
    enabled:  !!venueId,
    queryFn:  () => apiClient.get<DailyImpressions[]>(`/api/venues/${venueId}/impressions?days=${days}`),
    staleTime: 60_000,
  });
}

/** Totals for stat cards. */
export function useVenueImpressionTotals(venueId: string | undefined) {
  return useQuery<{ views: number; card_views: number; booking_clicks: number; contact_clicks: number }>({
    queryKey: ['venue-impression-totals', venueId],
    enabled:  !!venueId,
    queryFn:  () => apiClient.get(`/api/venues/${venueId}/impressions/totals`),
    staleTime: 60_000,
  });
}
