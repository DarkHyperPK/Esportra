
import React, { useState, useEffect } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useToast } from "@/hooks/use-toast";

interface LocationFilterProps { 
  className?: string;
  onSearch?: (query: string) => void;
  onLocationChange?: (location: { latitude: number | null, longitude: number | null }) => void;
}

const LocationFilter = ({ 
  className,
  onSearch,
  onLocationChange,
}: LocationFilterProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { latitude, longitude, error, loading } = useGeolocation();
  const { toast } = useToast();
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(false);

  useEffect(() => {
    if (latitude && longitude && onLocationChange && usingCurrentLocation) {
      onLocationChange({ latitude, longitude });
    }
  }, [latitude, longitude, onLocationChange, usingCurrentLocation]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const handleUseLocation = () => {
    if (error) {
      toast({
        title: "Location Error",
        description: error,
        variant: "destructive"
      });
      return;
    }

    setUsingCurrentLocation(true);

    if (latitude && longitude) {
      if (onLocationChange) {
        onLocationChange({ latitude, longitude });
      }
      
      toast({
        title: "Location Found",
        description: "Using your current location to find nearby venues.",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  return (
    <div className={`bg-esports-dark/80 backdrop-blur-md p-4 md:p-6 rounded-xl border border-gray-600/30 ${className}`}>
      <h2 className="text-xl font-bold text-white mb-4">Find Gaming Venues Near You</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="relative">
            <Input
              placeholder="Search by city or venue name"
              className="bg-esports-dark border-gray-600/30 pl-10 text-white"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>
        
        <div>
          <Button 
            className="w-full btn-esports-blue"
            onClick={handleUseLocation}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="mr-2 animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <MapPin size={18} className="mr-2" />
                {usingCurrentLocation ? "Using Location" : "Use My Location"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LocationFilter;
