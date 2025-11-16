// OrganizerTournamentsList.tsx
// This file is for organizers to view and manage a list of all their tournaments.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import esportsGames from '@/data/esportsGames.json';
import { Badge } from '@/components/ui/badge';

import { TournamentCard } from '@/components/TournamentCard';

interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  current_participants: number;
  prize_pool: string;
  user_id: string;
  entry_fee: string | null;
  is_online: boolean | null;
  image_url: string | null;
  slug: string | null;
}

const TournamentList = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<(Tournament & { status: 'upcoming' | 'ongoing' | 'completed', team_size: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTournaments();
  }, [user]);

  const fetchTournaments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organizer_id, entry_fee, is_public, banner_url, logo_url, slug, description')
        .eq('organizer_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Fetch participant count for each tournament
      const tournamentsWithCounts = await Promise.all(
        (data || []).map(async (tournament) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);

          // Compute status dynamically
          const now = new Date();
          const start = new Date(tournament.start_date);
          const end = tournament.end_date ? new Date(tournament.end_date) : null;
          
          let computedStatus: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
          if (now >= start) {
            if (end && now > end) {
              computedStatus = 'completed';
            } else {
              computedStatus = 'ongoing';
            }
          }

          return {
            id: tournament.id,
            name: tournament.name,
            game: tournament.game,
            date: tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : '',
            time: tournament.start_date ? new Date(tournament.start_date).toTimeString().split(' ')[0] : '',
            venue: tournament.venue_id ? `Venue ${tournament.venue_id}` : 'Online',
            max_participants: tournament.max_teams,
            current_participants: count || 0,
            prize_pool: tournament.prize_pool?.toString() || '0',
            user_id: tournament.organizer_id,
            entry_fee: tournament.entry_fee?.toString() || 'Free',
            is_online: !tournament.venue_id,
            image_url: tournament.banner_url || tournament.logo_url,
            slug: tournament.slug,
            status: computedStatus,
            team_size: 1, // fallback default
          };
        })
      );

      setTournaments(tournamentsWithCounts as (Tournament & { status: 'upcoming' | 'ongoing' | 'completed', team_size: number })[]);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Tournaments</h1>
            <p className="text-gray-400">Manage your tournaments</p>
          </div>
          <Link to="/organizer/tournaments/new">
            <Button>Create Tournament</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              id={tournament.id}
              name={tournament.name}
              game={tournament.game}
              date={tournament.date}
              time={tournament.time}
              venue={tournament.venue}
              max_participants={tournament.max_participants}
              current_participants={tournament.current_participants}
              status={tournament.status}
              team_size={tournament.team_size}
              prize_pool={tournament.prize_pool}
              user_id={tournament.user_id}
              entry_fee={tournament.entry_fee || 'Free'}
              is_online={tournament.is_online ?? false}
              image_url={tournament.image_url || undefined}
              currentUserId={user?.id}
              slug={tournament.slug || ''}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TournamentList; 
