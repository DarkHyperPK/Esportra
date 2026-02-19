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
  status?: 'draft' | 'open' | 'closed' | 'check_in' | 'ongoing' | 'completed' | 'cancelled';
  current_participants?: number;
  organizer_id?: string;
  slug?: string;
  is_public?: boolean;
  organizer_name?: string; // New: organization name or profile name
  organization_slug?: string; // For linking to org profile
}

type TournamentStatus = 'draft' | 'open' | 'closed' | 'check_in' | 'ongoing' | 'completed' | 'cancelled';

export function useTournaments(status?: TournamentStatus) {
  return useQuery({
    queryKey: ['tournaments', status],
    queryFn: async () => {
      // Fetch tournaments
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organizer_id, entry_fee, is_public, banner_url, logo_url, slug, description, created_at, updated_at, status')
        .eq('is_public', true)
        .is('deleted_at', null)
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Get all unique organizer IDs
      const organizerIds = [...new Set((tournamentsData || []).map((t: any) => t.organizer_id).filter(Boolean))];

      // Fetch organizations for these organizers
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('owner_id, name, slug')
        .in('owner_id', organizerIds);

      // Create a map of organizer_id -> organization
      const orgMap = new Map((orgsData || []).map((org: any) => [org.owner_id, org]));

      // Also fetch profile names as fallback
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', organizerIds);

      const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]));

      // Get participant counts and build final result
      const tournamentsWithCounts = await Promise.all((tournamentsData || []).map(async (item: any) => {
        const tournamentStatus = (item.status as TournamentStatus) || 'draft';

        // Get participant count
        const { count } = await supabase
          .from('tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', item.id);

        // Get organizer display name - prefer organization name
        const org = orgMap.get(item.organizer_id);
        const profile = profileMap.get(item.organizer_id);
        const organizer_name = org?.name || profile?.full_name || profile?.username || 'Unknown';
        const organization_slug = org?.slug;

        return {
          id: item.id,
          name: item.name,
          game: item.game,
          date: item.start_date ? new Date(item.start_date).toLocaleDateString('en-CA') : '',
          time: item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
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
          slug: item.slug,
          organizer_name,
          organization_slug,
        } as Tournament;
      }));

      // Filter by status if provided
      return status
        ? tournamentsWithCounts.filter(t => t.status === status)
        : tournamentsWithCounts;
    },
  });
}

