import React, { useState } from 'react';
import Footer from '@/components/Footer';
import { VenueCardV2 } from '@/components/venues/VenueCardV2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Loader2, X, ChevronDown, Wifi, Wind, Coffee, Car, Maximize2, Zap } from 'lucide-react';
import { useVenueSearch, NearMeParams } from '@/hooks/useVenueSearch';
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface VenueFilters {
  cities: string[];
  countries: string[];
}

const AMENITY_FILTERS = [
  { id: 'wifi',    icon: Wifi,      label: 'WiFi' },
  { id: 'ac',      icon: Wind,      label: 'A/C' },
  { id: 'food',    icon: Coffee,    label: 'Food & Drinks' },
  { id: 'parking', icon: Car,       label: 'Parking' },
  { id: 'private', icon: Maximize2, label: 'Private Rooms' },
  { id: 'power',   icon: Zap,       label: 'Backup Power' },
];

const VenueSearchV2 = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const { toast } = useToast();
  const { venues, loading, searchVenues } = useVenueSearch();

  const { data: filters } = useQuery<VenueFilters>({
    queryKey: ['venue-filters'],
    queryFn: () => apiClient.get<VenueFilters>('/api/venues/filters'),
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setNearMeActive(false);
    searchVenues({ query: searchQuery || undefined, country: selectedCountry || undefined, city: selectedCity || undefined, amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined });
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedCity('');
    setNearMeActive(false);
    searchVenues({ query: searchQuery || undefined, country: country || undefined, city: undefined, amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined });
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setNearMeActive(false);
    searchVenues({ query: searchQuery || undefined, country: selectedCountry || undefined, city: city || undefined, amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined });
  };

  const toggleAmenity = (id: string) => {
    const updated = selectedAmenities.includes(id)
      ? selectedAmenities.filter(a => a !== id)
      : [...selectedAmenities, id];
    setSelectedAmenities(updated);
    searchVenues({ query: searchQuery || undefined, country: selectedCountry || undefined, city: selectedCity || undefined, amenities: updated.length > 0 ? updated : undefined });
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Not supported', description: 'Geolocation is not supported by your browser.', variant: 'destructive' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: NearMeParams = { lat: pos.coords.latitude, lng: pos.coords.longitude, radiusKm: 100 };
        setNearMeActive(true);
        setLocating(false);
        setSelectedCountry('');
        setSelectedCity('');
        searchVenues({ nearMe: coords, amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined });
      },
      () => {
        setLocating(false);
        toast({ title: 'Location denied', description: 'Allow location access to find venues near you.', variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleClearAll = () => {
    setSelectedCountry('');
    setSelectedCity('');
    setSelectedAmenities([]);
    setNearMeActive(false);
    setSearchQuery('');
    searchVenues({});
  };

  const hasActiveFilters = !!selectedCountry || !!selectedCity || nearMeActive || selectedAmenities.length > 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 md:px-6 max-w-6xl py-8 md:py-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Gaming Venues</h1>
          <p className="text-zinc-500 text-sm">Find the best LAN centers and esports arenas near you</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              className="pl-10 bg-[#0a0a0c] border-white/10 focus:border-rose-500/50 h-11 rounded-xl text-sm"
            />
          </div>
        </form>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2.5 mb-8">
          {/* Country */}
          {filters?.countries && filters.countries.length > 0 && (
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={e => handleCountryChange(e.target.value)}
                className="appearance-none bg-[#0a0a0c] border border-white/10 text-sm text-white rounded-lg px-3.5 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-rose-500/50 cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="">All Countries</option>
                {filters.countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            </div>
          )}

          {/* City */}
          {filters?.cities && filters.cities.length > 0 && (
            <div className="relative">
              <select
                value={selectedCity}
                onChange={e => handleCityChange(e.target.value)}
                className="appearance-none bg-[#0a0a0c] border border-white/10 text-sm text-white rounded-lg px-3.5 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-rose-500/50 cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="">All Cities</option>
                {filters.cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            </div>
          )}

          {/* Near Me */}
          <Button
            variant={nearMeActive ? 'default' : 'outline'}
            size="sm"
            onClick={nearMeActive ? handleClearAll : handleNearMe}
            disabled={locating}
            className={nearMeActive
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent rounded-lg'
              : 'border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded-lg'
            }
          >
            {locating
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <MapPin className={`w-3.5 h-3.5 mr-1.5 ${nearMeActive ? '' : ''}`} />
            }
            {nearMeActive ? 'Near Me ✕' : 'Near Me'}
          </Button>

          {/* Amenity filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {AMENITY_FILTERS.map(a => {
              const active = selectedAmenities.includes(a.id);
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAmenity(a.id)}
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    active
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                      : 'bg-[#0a0a0c] border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {a.label}
                </button>
              );
            })}
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button onClick={handleClearAll}
              className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          {/* Count */}
          <span className="ml-auto text-xs text-zinc-600">
            {venues.length} venue{venues.length !== 1 ? 's' : ''}
            {nearMeActive ? ' nearby' : ''}
          </span>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden">
                <Skeleton className="h-44 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : venues.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden" animate="show"
            variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          >
            {venues.map((venue, i) => (
              <motion.div key={venue.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.3 }}>
                <VenueCardV2 venue={venue} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
            <p className="text-zinc-400 mb-1">No venues found</p>
            <p className="text-sm text-zinc-600">
              {nearMeActive
                ? 'No venues within 100 km. Try clearing the filter.'
                : hasActiveFilters
                  ? 'No matches. Try broader filters.'
                  : 'Try a different search query.'}
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default VenueSearchV2;
