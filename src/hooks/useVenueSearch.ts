
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface VenueSearchParams {
  query?: string;
  city?: string;
  distance?: string;
  latitude?: number | null;
  longitude?: number | null;
  page?: number;
  pageSize?: number;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  stations: number;
  hours: string;
  games: string;
  contact_email: string;
  contact_phone: string;
  image_url: string | null;
  price_range: string;
  rating: number;
  // For UI display
  amenities?: string[];
  location?: string;
  openNow?: boolean;
  priceRange?: string;
}

export const useVenueSearch = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useState<VenueSearchParams>({
    page: 1,
    pageSize: 10
  });

  const searchVenues = async (params: VenueSearchParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Merge with current search params
      const updatedParams = { ...searchParams, ...params };
      setSearchParams(updatedParams);

      // Build the query
      let query = supabase.from('venues').select('*');

      // Apply filters if they exist
      if (updatedParams.query) {
        query = query.or(`name.ilike.%${updatedParams.query}%,description.ilike.%${updatedParams.query}%`);
      }

      if (updatedParams.city) {
        query = query.ilike('city', `%${updatedParams.city}%`);
      }

      // For now, we don't have latitude/longitude in our db
      // In the future, we would calculate distance here

      // Execute the query
      const { data, error } = await query;

      if (error) throw error;

      // Transform the data for UI display
      const transformedVenues: Venue[] = (data || []).map(venue => ({
        ...venue,
        amenities: venue.games?.split(',')?.map(game => game.trim()) || [],
        location: `${venue.city || ''}, ${venue.address || ''}`,
        priceRange: venue.price_range || '$10-20/hr',
        openNow: venue.open_now !== undefined ? venue.open_now : true,
      }));

      setVenues(transformedVenues);
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
    // Initial search when component mounts
    searchVenues();
  }, []);

  return {
    venues,
    loading,
    error,
    searchVenues,
    searchParams
  };
};
