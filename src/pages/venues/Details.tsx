import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import VenueBooking from '@/components/VenueBooking';
import {
  MapPin,
  Clock,
  Users,
  Monitor,
  Mail,
  Phone,
  Star,
  DollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VenueDetails {
  id: string;
  name: string;
  address: string;
  city: string;
  description: string;
  hours: string;
  games: string;
  stations: number;
  contact_email: string;
  contact_phone: string;
  image_url: string | null;
  price_range: string;
  rating: number;
  open_now: boolean;
}

const VenueDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [venue, setVenue] = useState<VenueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVenueDetails = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        
        setVenue(data);
      } catch (error: any) {
        console.error('Error fetching venue details:', error);
        toast({
          title: "Error",
          description: "Failed to load venue details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVenueDetails();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <p>Loading venue details...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Venue Not Found</h2>
            <p className="text-gray-400">The requested venue could not be found.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Extract price from price range for booking component
  const pricePerHour = parseInt(venue.price_range.replace(/[^0-9]/g, '')) || 15;

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Venue Image */}
            <div className="w-full md:w-2/5">
              <div className="bg-gaming-dark rounded-lg overflow-hidden border border-gaming-gray/30">
                {venue.image_url ? (
                  <img 
                    src={venue.image_url} 
                    alt={venue.name} 
                    className="w-full h-72 object-cover"
                  />
                ) : (
                  <div className="w-full h-72 bg-gaming-gray/20 flex items-center justify-center">
                    <span className="text-gray-500">No image available</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Venue Info */}
            <div className="w-full md:w-3/5">
              <div className="flex flex-wrap justify-between items-start mb-4">
                <h1 className="text-3xl font-bold">{venue.name}</h1>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="fill-yellow-500 stroke-yellow-500 h-5 w-5" />
                  <span className="font-semibold">{venue.rating}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-3 text-gray-300">
                <MapPin className="h-4 w-4 text-gaming-purple" />
                <span>{venue.address}, {venue.city}</span>
              </div>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Badge variant={venue.open_now ? 'default' : 'destructive'} className="px-2">
                    {venue.open_now ? 'Open Now' : 'Closed'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-gaming-purple" />
                  <span>{venue.price_range}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-gaming-purple" />
                  <span>{venue.stations} Stations</span>
                </div>
              </div>
              
              <p className="mb-6 text-gray-300">{venue.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-gaming-purple mt-1" />
                  <div>
                    <p className="font-semibold">Hours</p>
                    <p className="text-gray-300">{venue.hours}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Monitor className="h-4 w-4 text-gaming-purple mt-1" />
                  <div>
                    <p className="font-semibold">Games Available</p>
                    <p className="text-gray-300">{venue.games}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-gaming-purple mt-1" />
                  <div>
                    <p className="font-semibold">Contact Email</p>
                    <a href={`mailto:${venue.contact_email}`} className="text-gaming-purple hover:underline">
                      {venue.contact_email}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-gaming-purple mt-1" />
                  <div>
                    <p className="font-semibold">Contact Phone</p>
                    <a href={`tel:${venue.contact_phone}`} className="text-gaming-purple hover:underline">
                      {venue.contact_phone}
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <VenueBooking 
                  venueId={venue.id}
                  venueName={venue.name}
                  pricePerHour={pricePerHour}
                  availableStations={venue.stations}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default VenueDetails;
