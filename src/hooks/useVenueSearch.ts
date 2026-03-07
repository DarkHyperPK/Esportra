/**
 * useVenueSearch — Domain 8: Venue Search
 *
 * Migrated from Supabase direct queries + find_nearby_venues RPC to .NET API.
 * Public interface (venues, loading, error, searchVenues, searchParams) is unchanged.
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Venue } from '@/types/venue';

export interface NearMeParams {
  lat: number;
  lng: number;
  radiusKm?: number;
}

export interface VenueSearchParams {
  query?: string;
  city?: string;
  distance?: string;
  latitude?: number | null;
  longitude?: number | null;
  page?: number;
  pageSize?: number;
  nearMe?: NearMeParams;
}

export interface VenueSearchOptions {
  includeOwned?: boolean;
}

const transformVenue = (venue: any): Venue => ({
  ...venue,
  amenities: venue.games?.split(',')?.map((g: string) => g.trim()) || [],
  location:  `${venue.city || ''}, ${venue.address || ''}`,
  priceRange: venue.price_range || '$10-20/hr',
  openNow:    venue.open_now !== undefined ? venue.open_now : true,
});

export const useVenueSearch = (options: VenueSearchOptions = {}) => {
  const [venues, setVenues]           = useState<Venue[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const { toast }                     = useToast();
  const [searchParams, setSearchParams] = useState<VenueSearchParams>({ page: 1, pageSize: 10 });

  const searchVenues = async (params: VenueSearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const updatedParams = { ...searchParams, ...params };
      setSearchParams(updatedParams);

      let rawData: any[];

      if (updatedParams.nearMe) {
        const { lat, lng, radiusKm = 50 } = updatedParams.nearMe;
        rawData = await apiClient.get<any[]>(
          `/api/venues/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`
        );
      } else {
        const qs = new URLSearchParams();
        if (updatedParams.query)        qs.set('q', updatedParams.query);
        if (updatedParams.city)         qs.set('city', updatedParams.city);
        if (options.includeOwned)       qs.set('includeOwned', 'true');
        qs.set('limit',  String(updatedParams.pageSize ?? 20));
        qs.set('offset', String(((updatedParams.page ?? 1) - 1) * (updatedParams.pageSize ?? 20)));

        rawData = await apiClient.get<any[]>(`/api/venues?${qs}`);
      }

      setVenues((rawData ?? []).map(transformVenue));
    } catch (err: any) {
      setError(err.message || 'Failed to search venues');
      toast({ title: 'Error', description: `Failed to search venues: ${err.message}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { searchVenues(); }, []);

  return { venues, loading, error, searchVenues, searchParams };
};
