import React, { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import { VenueCardV2 } from '@/components/venues/VenueCardV2';
import { Venue } from '@/types/venue';
import { apiClient } from '@/lib/apiClient';

const FeaturedVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const data = await apiClient.get<Venue[]>('/api/venues');
        setVenues(data || []);
      } catch (error) {
        console.error('Error fetching venues:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVenues();
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Featured Venues</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-zinc-800/20 rounded-lg h-64"></div>
            ))
          ) : venues.length > 0 ? (
            venues.map((venue) => (
              <VenueCardV2 key={venue.id} venue={venue} />
            ))
          ) : (
            <p className="col-span-3 text-center text-gray-400">No venues available</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FeaturedVenues;

