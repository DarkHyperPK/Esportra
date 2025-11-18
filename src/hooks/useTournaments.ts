import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';

export interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string | null;
  max_participants: number;
  prize_pool: string;
  entry_fee: string | null;
  description: string;
  user_id: string;
  is_online: boolean;
  created_at: string;
  updated_at?: string;
  image_url?: string | null;
  team_size?: number;
  status?: 'upcoming' | 'ongoing' | 'completed';
  current_participants?: number;
  organizer_id?: string;
  slug?: string;
}

type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';

interface DbTournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string | null;
  max_participants: number;
  prize_pool: string;
  entry_fee: string | null;
  description: string;
  user_id: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  status: string;
  image_url: string | null;
  team_size: number;
  tournament_participants: { count: number }[];
}

export function useTournaments(status?: TournamentStatus) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function fetchTournaments() {
      try {
        setLoading(true);
        setError(null);

        // Fetch tournaments by status (e.g., 'ongoing' for live tournaments)
        const { data: tournamentsData, error } = await supabase
          .from('tournaments')
          .select('id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organizer_id, entry_fee, is_public, banner_url, logo_url, slug, description, created_at, updated_at')
          .order('start_date', { ascending: true });

        if (error) throw error;

        // Get participant counts for each tournament
        const tournamentsWithCounts = await Promise.all((tournamentsData || []).map(async (item: any) => {
          // Determine status dynamically
          const now = new Date();
          const start = new Date(item.start_date);
          const end = item.end_date ? new Date(item.end_date) : null;
          
          let status: TournamentStatus = 'upcoming';
          if (now >= start) {
            if (end && now > end) {
              status = 'completed';
            } else {
              status = 'ongoing';
            }
          }
          
          // Get participant count
          const { count, error: countError } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', item.id);
          if (countError) throw countError;
          
          return {
            id: item.id,
            name: item.name,
            game: item.game,
            date: item.start_date ? new Date(item.start_date).toISOString().split('T')[0] : '',
            time: item.start_date ? new Date(item.start_date).toTimeString().split(' ')[0] : '',
            venue: item.venue_id ? `Venue ${item.venue_id}` : 'Online',
            max_participants: item.max_teams,
            prize_pool: item.prize_pool?.toString() || '0',
            entry_fee: item.entry_fee?.toString() || 'Free',
            description: item.description || '',
            user_id: item.organizer_id,
            is_online: !item.venue_id,
            created_at: item.created_at,
            updated_at: item.updated_at,
            image_url: item.banner_url || item.logo_url,
            team_size: 1,
            status,
            current_participants: count || 0,
            organizer_id: item.organizer_id,
            slug: item.slug
          };
        }));

        // Filter by status if provided
        const filteredTournaments = status
          ? tournamentsWithCounts.filter(t => t.status === status)
          : tournamentsWithCounts;

        setTournaments(filteredTournaments);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching tournaments:', err);
        setError(err.message);
        toast({
          title: 'Error',
          description: 'Failed to load tournaments',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTournaments();

    return () => {
      isMounted = false;
    };
  }, [status, toast]);

  return { tournaments, loading, error };
} 