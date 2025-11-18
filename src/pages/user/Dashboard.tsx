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
  start_date: string;
  end_date: string;
  venue_name: string;
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
        // Try to fetch venue bookings (handle gracefully if table doesn't exist)
        try {
          const { data: bookingsData, error: bookingsError } = await supabase
            .from('venue_bookings')
            .select(`
              id,
              venue_id,
              venues(name),
              booking_date,
              time_slot,
              amount,
              status,
              created_at
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (bookingsError) {
            console.warn('Venue bookings query failed:', bookingsError);
            setBookings([]);
          } else {
            const formattedBookings = bookingsData?.map(booking => ({
              id: booking.id,
              venue_id: booking.venue_id,
              venue_name: booking.venues?.name || 'Unknown venue',
              booking_date: booking.booking_date,
              booking_time: booking.time_slot,
              amount: booking.amount,
              status: booking.status,
              created_at: booking.created_at
            })) || [];
            
            setBookings(formattedBookings);
          }
        } catch (err) {
          console.warn('Venue bookings table may not exist:', err);
          setBookings([]);
        }

        // Try to fetch tournament participations (handle gracefully if table doesn't exist)
        try {
          // Step 1: Get all teams the user is a member of (from team_members and team_roster_members)
          const userTeamIds = new Set<string>();
          
          // Get teams where user is owner
          const { data: ownedTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('owner_id', user.id);
          (ownedTeams || []).forEach(team => userTeamIds.add(team.id));
          
          // Get teams where user is a member
          const { data: teamMemberships } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .eq('is_active', true);
          (teamMemberships || []).forEach(membership => userTeamIds.add(membership.team_id));
          
          // Get teams where user is in a roster
          const { data: rosterMemberships } = await supabase
            .from('team_roster_members')
            .select('team_rosters!inner(team_id)')
            .eq('user_id', user.id)
            .eq('is_active', true);
          (rosterMemberships || []).forEach((rm: any) => {
            if (rm.team_rosters?.team_id) {
              userTeamIds.add(rm.team_rosters.team_id);
            }
          });
          
          const teamIdsArray = Array.from(userTeamIds);
          
          // Step 2: Fetch tournament participations
          // We'll fetch in multiple queries and combine results since Supabase .or() doesn't work well with .in()
          const allParticipations: any[] = [];
          
          // Query 1: Solo registrations
          const { data: soloData } = await supabase
            .from('tournament_participants')
            .select(`
              id,
              tournament_id,
              participant_type,
              user_id,
              team_id,
              team_captain_id,
              team_members,
              tournaments(
                id,
                name,
                game,
                start_date,
                end_date,
                venue_id,
                venues(name)
              ),
              created_at
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (soloData) allParticipations.push(...soloData);
          
          // Query 2: Team captain registrations
          const { data: captainData } = await supabase
            .from('tournament_participants')
            .select(`
              id,
              tournament_id,
              participant_type,
              user_id,
              team_id,
              team_captain_id,
              team_members,
              tournaments(
                id,
                name,
                game,
                start_date,
                end_date,
                venue_id,
                venues(name)
              ),
              created_at
            `)
            .eq('team_captain_id', user.id)
            .order('created_at', { ascending: false });
          if (captainData) allParticipations.push(...captainData);
          
          // Query 3: Team member registrations (if user has teams)
          let teamMemberData: any[] = [];
          if (teamIdsArray.length > 0) {
            const { data: memberData } = await supabase
              .from('tournament_participants')
              .select(`
                id,
                tournament_id,
                participant_type,
                user_id,
                team_id,
                team_captain_id,
                team_members,
                tournaments(
                  id,
                  name,
                  game,
                  start_date,
                  end_date,
                  venue_id,
                  venues(name)
                ),
                created_at
              `)
              .in('team_id', teamIdsArray)
              .order('created_at', { ascending: false });
            if (memberData) teamMemberData = memberData;
          }
          
          // Combine and deduplicate by participation id
          const participationMap = new Map<string, any>();
          [...allParticipations, ...teamMemberData].forEach(p => {
            if (p.id) participationMap.set(p.id, p);
          });
          const participationData = Array.from(participationMap.values());
          const participationError = null; // No error since we're combining results

          if (participationError) {
            console.warn('Tournament participants query failed:', participationError);
            setTournaments([]);
          } else {
            // Filter to ensure we only include relevant participations
            const userParticipations = (participationData || []).filter(participation => {
              // Solo registration
              if (participation.user_id === user.id) {
                return true;
              }
              
              // Team captain
              if (participation.team_captain_id === user.id) {
                return true;
              }
              
              // Team member - check if team_id is in user's teams
              if (participation.team_id && userTeamIds.has(participation.team_id)) {
                return true;
              }
              
              return false;
            });

            const formattedTournaments = userParticipations
              .map(participation => ({
                id: participation.tournaments?.id,
                name: participation.tournaments?.name,
                game: participation.tournaments?.game,
                start_date: participation.tournaments?.start_date,
                end_date: participation.tournaments?.end_date,
                venue_name: participation.tournaments?.venues?.name || 'TBD',
                registered_at: participation.created_at
              }))
              .filter(t => t.id != null); // Filter out any null/undefined tournament IDs
            
            console.log('[Dashboard] Found tournament registrations:', {
              userTeams: userTeamIds.size,
              totalParticipations: participationData?.length || 0,
              userParticipations: userParticipations.length,
              formattedTournaments: formattedTournaments.length
            });
            
            setTournaments(formattedTournaments);
          }
        } catch (err) {
          console.warn('Tournament participants table may not exist:', err);
          setTournaments([]);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Set empty arrays as fallback
        setBookings([]);
        setTournaments([]);
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
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-gaming-dark border-gaming-gray/30">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <Skeleton className="h-5 w-3/4 bg-gaming-gray/30" />
                          <Skeleton className="h-4 w-1/2 bg-gaming-gray/30" />
                          <Skeleton className="h-4 w-1/3 bg-gaming-gray/30" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : tournaments.length === 0 ? (
                <Card className="bg-gaming-dark border-gaming-gray/30">
                  <CardHeader>
                    <CardTitle>No Tournament Registrations</CardTitle>
                    <CardDescription>You haven't registered for any tournaments yet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="bg-gaming-purple hover:bg-gaming-purple/80">
                      <Link to="/tournaments">Browse Tournaments</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {tournaments.map(tournament => (
                    <Card key={tournament.id} className="bg-gaming-dark border-gaming-gray/30">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle>{tournament.name}</CardTitle>
                          <Badge variant="outline">
                            {tournament.game}
                          </Badge>
                        </div>
                        <CardDescription>
                          Registered on {new Date(tournament.registered_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gaming-purple" />
                            <span>Start: {new Date(tournament.start_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-gaming-purple" />
                            <span>End: {new Date(tournament.end_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gaming-purple" />
                            <span>Venue: {tournament.venue_name}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserDashboard;
