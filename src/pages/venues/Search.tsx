
import React, { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import LocationFilter from '@/components/LocationFilter';
import { VenueCard } from '@/components/venues/VenueCard';
import { Button } from '@/components/ui/button';
import { Filter, MapPin, Loader2, X, ChevronDown } from 'lucide-react';
import { useVenueSearch, NearMeParams } from '@/hooks/useVenueSearch';
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface VenueFilters {
  cities: string[];
  countries: string[];
}

const VenueSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const { toast } = useToast();
  const { venues, loading, searchVenues } = useVenueSearch();

  const { data: filters } = useQuery<VenueFilters>({
    queryKey: ['venue-filters'],
    queryFn: () => apiClient.get<VenueFilters>('/api/venues/filters'),
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setNearMeActive(false);
    searchVenues({ query, country: selectedCountry || undefined, city: selectedCity || undefined });
  };

  const handleLocationChange = (location: { latitude: number | null; longitude: number | null }) => {
    searchVenues({ latitude: location.latitude, longitude: location.longitude });
  };

  const handleDistanceChange = (distance: string) => {
    searchVenues({ distance });
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedCity('');
    setNearMeActive(false);
    searchVenues({ query: searchQuery || undefined, country: country || undefined, city: undefined });
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setNearMeActive(false);
    searchVenues({ query: searchQuery || undefined, country: selectedCountry || undefined, city: city || undefined });
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
        setSelectedCountry('');
        setSelectedCity('');
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

  const handleClearFilters = () => {
    setSelectedCountry('');
    setSelectedCity('');
    setNearMeActive(false);
    setSearchQuery('');
    searchVenues({});
  };

  const hasActiveFilters = selectedCountry || selectedCity || nearMeActive;

  // Filter cities by selected country if available
  const availableCities = filters?.cities?.filter(city => {
    if (!selectedCountry) return true;
    // If country is selected, we show all cities from the API
    // (The API returns all cities from published venues — city filtering is server-side)
    return true;
  }) ?? [];

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

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Country Dropdown */}
          {filters?.countries && filters.countries.length > 0 && (
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg px-4 py-2.5 pr-9 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <option value="">All Countries</option>
                {filters.countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          )}

          {/* City Dropdown */}
          {availableCities.length > 0 && (
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="appearance-none bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg px-4 py-2.5 pr-9 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <option value="">All Cities</option>
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          )}

          {/* Near Me */}
          {nearMeActive ? (
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
              onClick={handleClearNearMe}
            >
              <MapPin className="w-4 h-4 mr-2 fill-emerald-400" />
              Near Me &nbsp;✕
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-800 hover:border-zinc-700"
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

          {/* Clear All */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-white"
              onClick={handleClearFilters}
            >
              <X className="w-4 h-4 mr-1" /> Clear filters
            </Button>
          )}

          {/* Count */}
          <div className="ml-auto text-sm text-zinc-500">
            {venues.length} venue{venues.length !== 1 ? 's' : ''}
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
                : hasActiveFilters
                  ? 'No venues match your filters. Try broadening your search.'
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
