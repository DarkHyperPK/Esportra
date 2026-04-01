/**
 * useVenueSearch — Domain 8: Venue Search
 *
 * Migrated from Supabase direct queries + find_nearby_venues RPC to .NET API.
 * Public interface (venues, loading, error, searchVenues, searchParams) is unchanged.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  country?: string;
  distance?: string;
  amenities?: string[];
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
  amenities: Array.isArray(venue.amenities) ? venue.amenities : [],
  location:  `${venue.city || ''}, ${venue.address || ''}`,
  priceRange: venue.price_range || '$10-20/hr',
  openNow:    venue.open_now !== undefined ? venue.open_now : true,
  distance_km: venue.distance_km ?? null,
});

export const useVenueSearch = (options: VenueSearchOptions = {}) => {
  const [searchParams, setSearchParams] = useState<VenueSearchParams>({ page: 1, pageSize: 10 });
  const { toast } = useToast();

  const { data: venues = [], isFetching: loading, error: queryError } = useQuery({
    queryKey: ['venues', searchParams, options.includeOwned],
    queryFn: async () => {
      let rawData: any[];

      if (searchParams.nearMe) {
        const { lat, lng, radiusKm = 50 } = searchParams.nearMe;
        rawData = await apiClient.get<any[]>(
          `/api/venues/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`
        );
      } else {
        const qs = new URLSearchParams();
        if (searchParams.query)        qs.set('q', searchParams.query);
        if (searchParams.city)         qs.set('city', searchParams.city);
        if (searchParams.country)      qs.set('country', searchParams.country);
        if (options.includeOwned)      qs.set('includeOwned', 'true');
        qs.set('limit',  String(searchParams.pageSize ?? 20));
        qs.set('offset', String(((searchParams.page ?? 1) - 1) * (searchParams.pageSize ?? 20)));

        rawData = await apiClient.get<any[]>(`/api/venues?${qs}`);
      }

      // Client-side amenities filter
      let results = (rawData ?? []).map(transformVenue);
      if (searchParams.amenities && searchParams.amenities.length > 0) {
        results = results.filter(v =>
          searchParams.amenities!.every(a => v.amenities?.includes(a))
        );
      }
      return results;
    },
    staleTime: 3 * 60 * 1000,
  });

  const error = queryError ? (queryError as Error).message || 'Failed to search venues' : null;

  // Show toast when a query error occurs
  useEffect(() => {
    if (queryError) {
      toast({ title: 'Error', description: `Failed to search venues: ${(queryError as Error).message}`, variant: 'destructive' });
    }
  }, [queryError, toast]);

  const searchVenues = async (params: VenueSearchParams = {}) => {
    setSearchParams(prev => ({ ...prev, ...params }));
  };

  return { venues, loading, error, searchVenues, searchParams };
};
