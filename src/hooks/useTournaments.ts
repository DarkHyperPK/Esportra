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
  tournament_registrations: { count: number }[];
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
          .select('*')
          .order('date', { ascending: true });

        if (error) throw error;

        // Get participant counts for each tournament
        const tournamentsWithCounts = await Promise.all((tournamentsData || []).map(async (item: any) => {
          // Determine status dynamically
          const now = new Date();
          const start = new Date(item.date + 'T' + item.time);
          let status: TournamentStatus = 'upcoming';
          if (now >= start) {
            status = 'ongoing';
          }
          // Get participant count
          const { count, error: countError } = await supabase
            .from('tournament_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', item.id);
          if (countError) throw countError;
          return {
            ...item,
            current_participants: count || 0,
            status,
            team_size: item.team_size || 1,
            organizer_id: item.organizer_id || ''
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