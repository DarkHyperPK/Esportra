
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
  /** Pass geo coords directly to use Haversine search in this call */
  nearMe?: NearMeParams;
}

import { Venue } from '@/types/venue';

export interface VenueSearchOptions {
  /** When true, skips the published filter (for owner dashboards) */
  includeOwned?: boolean;
}

const transformVenue = (venue: any): Venue => ({
  ...venue,
  amenities: venue.games?.split(',')?.map((g: string) => g.trim()) || [],
  location: `${venue.city || ''}, ${venue.address || ''}`,
  priceRange: venue.price_range || '$10-20/hr',
  openNow: venue.open_now !== undefined ? venue.open_now : true,
});

export const useVenueSearch = (options: VenueSearchOptions = {}) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState<VenueSearchParams>({
    page: 1,
    pageSize: 10,
  });

  const searchVenues = async (params: VenueSearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const updatedParams = { ...searchParams, ...params };
      setSearchParams(updatedParams);

      let rawData: any[] | null = null;

      // ── Geo branch: use Haversine RPC when nearMe coords are provided ────────
      if (updatedParams.nearMe) {
        const { lat, lng, radiusKm = 50 } = updatedParams.nearMe;
        const { data, error: rpcError } = await supabase.rpc('find_nearby_venues', {
          user_lat: lat,
          user_lng: lng,
          radius_km: radiusKm,
        });
        if (rpcError) throw rpcError;
        rawData = data;
      } else {
        // ── Regular text/city search ─────────────────────────────────────────
        let query = supabase.from('venues').select('*');

        if (!options.includeOwned) {
          query = query.eq('status', 'published');
        }

        if (updatedParams.query) {
          query = query.or(
            `name.ilike.%${updatedParams.query}%,description.ilike.%${updatedParams.query}%`,
          );
        }

        if (updatedParams.city) {
          query = query.ilike('city', `%${updatedParams.city}%`);
        }

        const { data, error: queryError } = await query.limit(updatedParams.pageSize ?? 20);
        if (queryError) throw queryError;
        rawData = data;
      }

      setVenues((rawData ?? []).map(transformVenue));
    } catch (err: any) {
      console.error('Error searching venues:', err);
      setError(err.message || 'Failed to search venues');
      toast({
        title: 'Error',
        description: `Failed to search venues: ${err.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchVenues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    venues,
    loading,
    error,
    searchVenues,
    searchParams,
  };
};
