import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/apiClient";

interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  stations: number;
  price_range: string | null;
  image_url: string | null;
  open_now: boolean | null;
  last_booking?: string;
}

const VenuesList = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchVenues = async () => {
      if (!user) return;

      try {
        const venuesData = await apiClient.get<Venue[]>('/api/venues?owned=true');
        setVenues(venuesData || []);
      } catch (error) {
        console.error('Error fetching venues:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [user]);

  const handleCreateVenue = () => {
    navigate('/venues/create');
  };

  return (
    <Card className="bg-gaming-dark border-gaming-gray/30">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Venues</h2>
          <Button onClick={handleCreateVenue} className="bg-gaming-purple hover:bg-gaming-purple/80">
            <Plus className="mr-2 h-4 w-4" />
            Add Venue
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-gaming-gray/20 p-4 rounded-lg">
                <div className="h-6 w-1/3 bg-gaming-gray/30 rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-gaming-gray/30 rounded"></div>
              </div>
            ))}
          </div>
        ) : venues.length > 0 ? (
          <div className="space-y-4">
            {venues.map((venue) => (
              <div
                key={venue.id}
                className="bg-gaming-gray/10 p-4 rounded-lg border border-gaming-gray/30 hover:border-gaming-purple/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/venues/${venue.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{venue.name}</h3>
                    <p className="text-gray-400">{venue.city}</p>
                  </div>
                  <Badge className={venue.open_now ? 'bg-green-500' : 'bg-red-500'}>
                    {venue.open_now ? 'Open' : 'Closed'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{venue.stations} stations</span>
                  <span>{venue.price_range || 'Price not set'}</span>
                </div>
                {venue.last_booking && (
                  <div className="mt-2 text-sm text-gray-500">
                    Last booking: {venue.last_booking}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>You haven't added any venues yet.</p>
            <p className="mt-2">Click the "Add Venue" button to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VenuesList;
