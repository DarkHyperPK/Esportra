import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, MapPin, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import PlayerTournaments from '@/components/player/PlayerTournaments';

interface VenueBooking {
  id: string;
  venue_id: string;
  venue_name: string;
  booking_date: string;
  booking_time: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  registered_at: string;
}

const UserDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !authLoading) {
      navigate('/auth/signin');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('venue_bookings')
          .select(`
            id,
            venue_id,
            venues(name),
            booking_date,
            booking_time,
            amount,
            status,
            created_at
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bookingsError) throw bookingsError;
        
        const formattedBookings = bookingsData.map(booking => ({
          id: booking.id,
          venue_id: booking.venue_id,
          venue_name: booking.venues?.name || 'Unknown venue',
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          amount: booking.amount,
          status: booking.status,
          created_at: booking.created_at
        }));
        
        setBookings(formattedBookings);

        const { data: participationData, error: participationError } = await supabase
          .from('tournament_participants')
          .select(`
            tournaments(
              id,
              name,
              game,
              date,
              time,
              venue
            ),
            registered_at
          `)
          .eq('user_id', user.id)
          .order('registered_at', { ascending: false });

        if (participationError) throw participationError;
        
        const formattedTournaments = participationData.map(participation => ({
          id: participation.tournaments.id,
          name: participation.tournaments.name,
          game: participation.tournaments.game,
          date: participation.tournaments.date,
          time: participation.tournaments.time,
          venue: participation.tournaments.venue,
          registered_at: participation.registered_at
        }));
        
        setTournaments(formattedTournaments);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
          <p>Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">My Dashboard</h1>
              <p className="text-gray-400">Welcome back, {profile?.full_name || profile?.username || 'Gamer'}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Button asChild variant="outline" className="mr-2">
                <Link to="/auth/profile">Edit Profile</Link>
              </Button>
              <Button asChild className="bg-gaming-purple hover:bg-gaming-purple/80">
                <Link to="/venues/search">Book Venue</Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="bookings">
            <TabsList className="mb-6">
              <TabsTrigger value="bookings">Venue Bookings</TabsTrigger>
              <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="bookings">
              <h2 className="text-xl font-semibold mb-4">My Venue Bookings</h2>
              {loading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, index) => (
                    <Card key={index} className="bg-gaming-dark border-gaming-gray/30">
                      <CardHeader className="pb-2">
                        <Skeleton className="h-6 w-1/3 bg-gaming-gray/30" />
                        <Skeleton className="h-4 w-1/4 bg-gaming-gray/30" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between">
                          <Skeleton className="h-5 w-1/4 bg-gaming-gray/30" />
                          <Skeleton className="h-5 w-1/5 bg-gaming-gray/30" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <Card className="bg-gaming-dark border-gaming-gray/30">
                  <CardHeader>
                    <CardTitle>No Bookings Yet</CardTitle>
                    <CardDescription>You haven't made any venue bookings yet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="bg-gaming-purple hover:bg-gaming-purple/80">
                      <Link to="/venues/search">Find and Book a Venue</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {bookings.map(booking => (
                    <Card key={booking.id} className="bg-gaming-dark border-gaming-gray/30">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle>{booking.venue_name}</CardTitle>
                          <Badge 
                            variant={booking.status === 'completed' ? 'default' : 
                                    booking.status === 'confirmed' ? 'secondary' : 
                                    booking.status === 'pending' ? 'outline' : 
                                    'destructive'}
                          >
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </div>
                        <CardDescription>
                          Booked on {new Date(booking.created_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gaming-purple" />
                            <span>Date: {booking.booking_date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-gaming-purple" />
                            <span>Time: {booking.booking_time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Amount:</span>
                            <span>${booking.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="tournaments">
              <h2 className="text-xl font-semibold mb-4">My Tournament Registrations</h2>
              <PlayerTournaments />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserDashboard;
