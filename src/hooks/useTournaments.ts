import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

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
  is_public?: boolean;
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
  return useQuery({
    queryKey: ['tournaments', status],
    queryFn: async () => {
      // Fetch tournaments
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organizer_id, entry_fee, is_public, banner_url, logo_url, slug, description, created_at, updated_at, status')
        .eq('is_public', true)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Get participant counts for each tournament
      const tournamentsWithCounts = await Promise.all((tournamentsData || []).map(async (item: any) => {
        // Use DB status if available, otherwise fall back to date logic (for legacy data)
        let tournamentStatus: TournamentStatus = 'upcoming';

        if (item.status === 'ongoing') {
          tournamentStatus = 'ongoing';
        } else if (item.status === 'completed') {
          tournamentStatus = 'completed';
        } else {
          // Fallback to date logic if status is 'open' (default) or unknown
          const now = new Date();
          const start = new Date(item.start_date);
          const end = item.end_date ? new Date(item.end_date) : null;

          if (now >= start) {
            if (end && now > end) {
              tournamentStatus = 'completed';
            } else {
              tournamentStatus = 'ongoing';
            }
          } else {
            // If not started yet, it's upcoming
            tournamentStatus = 'upcoming';
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
          status: tournamentStatus,
          current_participants: count || 0,
          organizer_id: item.organizer_id,
          slug: item.slug
        } as Tournament;
      }));

      // Filter by status if provided
      return status
        ? tournamentsWithCounts.filter(t => t.status === status)
        : tournamentsWithCounts;
    },
  });
}
