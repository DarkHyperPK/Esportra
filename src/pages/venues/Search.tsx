
import React, { useState } from 'react';
import Footer from '@/components/Footer';
import LocationFilter from '@/components/LocationFilter';
import { VenueCard } from '@/components/venues/VenueCard';
import { Button } from '@/components/ui/button';
import { Filter, MapPin, Loader2 } from 'lucide-react';
import { useVenueSearch, NearMeParams } from '@/hooks/useVenueSearch';
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const VenueSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locating, setLocating] = useState(false);
  const { toast } = useToast();
  const { venues, loading, searchVenues } = useVenueSearch();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setNearMeActive(false);
    searchVenues({ query });
  };

  const handleLocationChange = (location: { latitude: number | null; longitude: number | null }) => {
    searchVenues({ latitude: location.latitude, longitude: location.longitude });
  };

  const handleDistanceChange = (distance: string) => {
    searchVenues({ distance });
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not supported',
        description: 'Geolocation is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: NearMeParams = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusKm: 50,
        };
        setNearMeActive(true);
        setLocating(false);
        // Pass nearMe directly in params — no timing issue
        searchVenues({ nearMe: coords });
      },
      () => {
        setLocating(false);
        toast({
          title: 'Location denied',
          description: 'Allow location access to find venues near you.',
          variant: 'destructive',
        });
      },
      { timeout: 10000 },
    );
  };

  const handleClearNearMe = () => {
    setNearMeActive(false);
    searchVenues({ query: searchQuery });
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Find Gaming Venues</h1>

        <div className="mb-8">
          <LocationFilter
            onSearch={handleSearch}
            onLocationChange={handleLocationChange}
            onDistanceChange={handleDistanceChange}
          />
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-gaming-purple">
              <Filter className="mr-2" />
              Filters
            </Button>

            {nearMeActive ? (
              <Button
                variant="outline"
                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                onClick={handleClearNearMe}
              >
                <MapPin className="w-4 h-4 mr-2 fill-emerald-400" />
                Near Me &nbsp;✕
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-white/20 hover:border-white/40"
                onClick={handleNearMe}
                disabled={locating}
              >
                {locating
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <MapPin className="w-4 h-4 mr-2" />
                }
                Near Me
              </Button>
            )}
          </div>
          <div className="text-gray-400">
            Showing {venues.length} venue{venues.length !== 1 ? 's' : ''}
            {nearMeActive ? ' nearby' : ''}
          </div>
        </div>

        {loading ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          >
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <motion.div
                key={index}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}
                className="bg-gaming-dark border border-gaming-gray/30 rounded-lg overflow-hidden"
              >
                <Skeleton className="h-48 w-full" />
                <div className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16 rounded" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : venues.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          >
            {venues.map((venue, index) => (
              <motion.div
                key={venue.id}
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <VenueCard venue={venue} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12 bg-gaming-dark border border-gaming-gray/30 rounded-lg">
            <p className="text-gray-400 mb-2">No venues found</p>
            <p className="text-sm text-gray-500">
              {nearMeActive
                ? 'No venues within 50 km. Try clearing the Near Me filter.'
                : 'Try adjusting your search parameters'}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default VenueSearch;
