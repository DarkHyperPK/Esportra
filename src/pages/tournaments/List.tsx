import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, CheckCircle2 } from 'lucide-react';
import { Tournament } from '@/types/tournament';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const TournamentList = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch user's registrations
  const fetchUserRegistrations = useCallback(async () => {
    if (!user || !user.id) {
      setRegisteredTournaments([]);
      console.log('[RegisteredState] No user loaded yet. Skipping fetch.');
      return;
    }

    try {
      console.log('[RegisteredState] Fetching registrations for user:', user.id, typeof user.id);
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('tournament_participants')
        .select('tournament_id, user_id')
        .eq('user_id', user.id.toString());

      if (registrationsError) {
        console.error('[RegisteredState] Error fetching registrations:', registrationsError);
        throw registrationsError;
      }

      const userRegistrations = (registrationsData || []).map(reg => reg.tournament_id.toString());
      console.log('[RegisteredState] Found registrations:', userRegistrations);
      setRegisteredTournaments(userRegistrations);
    } catch (error) {
      console.error('[RegisteredState] Error fetching registrations:', error);
    }
  }, [user]);

  // Fetch tournaments
  const fetchTournaments = useCallback(async () => {
    try {
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      if (tournamentsError) {
        console.error('[TournamentList] Error fetching tournaments:', tournamentsError);
        throw tournamentsError;
      }

      const mappedTournaments = (tournamentsData || []).map(tournament => ({
        ...tournament,
        current_participants: 0,
        status: 'upcoming' as const,
        team_size: 1
      }));

      setTournaments(mappedTournaments);
    } catch (error) {
      console.error('[TournamentList] Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTournaments(),
        fetchUserRegistrations()
      ]);
    } catch (error) {
      console.error('[TournamentList] Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchTournaments, fetchUserRegistrations]);

  // Set up real-time subscription for registration changes
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('tournament_registrations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('[TournamentList] Registration change detected:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRegistration = payload.new as { tournament_id: string };
            setRegisteredTournaments(prev => [...new Set([...prev, newRegistration.tournament_id])]);
          } else if (payload.eventType === 'DELETE') {
            const oldRegistration = payload.old as { tournament_id: string };
            setRegisteredTournaments(prev => prev.filter(id => id !== oldRegistration.tournament_id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    console.log('[TournamentList] User changed:', user?.id);
    fetchData();
  }, [user, fetchData]);

  // Check if user is registered for a tournament
  const isRegistered = (tournamentId: string) => {
    const registered = registeredTournaments.includes(tournamentId.toString());
    console.log('[RegisteredState] Checking registration for tournament:', tournamentId, typeof tournamentId, 'Result:', registered);
    return registered;
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Browse Tournaments</h1>
            <p className="text-gray-400">Find and join upcoming tournaments</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gaming-dark border-gaming-gray/30">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gaming-gray/20 rounded w-3/4"></div>
                    <div className="h-4 bg-gaming-gray/20 rounded w-1/2"></div>
                    <div className="h-4 bg-gaming-gray/20 rounded w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Link key={tournament.id} to={`/tournaments/${tournament.slug || tournament.id}`}>
                <Card className={`bg-gaming-dark border-gaming-gray/30 hover:border-gaming-purple transition-colors ${isRegistered(tournament.id) ? 'border-gaming-purple' : ''}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{tournament.name}</CardTitle>
                        <p className="text-gray-400">{tournament.game}</p>
                      </div>
                      {isRegistered(tournament.id) && (
                        <CheckCircle2 className="h-5 w-5 text-gaming-purple" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center text-gray-400">
                        <Calendar className="mr-2 h-4 w-4" />
                        {new Date(tournament.date).toLocaleDateString()} at {tournament.time}
                      </div>
                      <div className="flex items-center text-gray-400">
                        <Users className="mr-2 h-4 w-4" />
                        {tournament.current_participants} / {tournament.max_participants} Participants
                      </div>
                      <div className="flex items-center text-gaming-green">
                        <Trophy className="mr-2 h-4 w-4" />
                        Prize Pool: {tournament.prize_pool}
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-sm text-gray-400">
                          {tournament.is_online ? 'Online' : 'LAN'}
                        </span>
                        <Button className="bg-gaming-purple hover:bg-gaming-purple/80">
                          {isRegistered(tournament.id) ? 'View Details' : 'Join Tournament'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default TournamentList; 