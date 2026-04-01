import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import {
  MapPin,
  Clock,
  Users,
  Monitor,
  Mail,
  Phone,
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
  images: string[] | null;
  card_image: string | null;
  price_per_hour: number;
  status: string;
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
        const data = await apiClient.get<any>(`/api/venues/${id}`);
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

  // Use price_per_hour directly
  const pricePerHour = venue.price_per_hour || 15;

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Venue Image */}
            <div className="w-full md:w-2/5">
              <div className="bg-gaming-dark rounded-lg overflow-hidden border border-gaming-gray/30">
                {(venue.card_image || venue.images?.[0]) ? (
                  <img
                    src={venue.card_image || venue.images![0]}
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
              </div>

              <div className="flex items-center gap-2 mb-3 text-gray-300">
                <MapPin className="h-4 w-4 text-gaming-purple" />
                <span>{venue.address}, {venue.city}</span>
              </div>

              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <Badge variant={venue.status === 'published' ? 'default' : 'secondary'} className="px-2">
                    {venue.status === 'published' ? 'Published' : venue.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-gaming-purple" />
                  <span>${venue.price_per_hour}/hr</span>
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
