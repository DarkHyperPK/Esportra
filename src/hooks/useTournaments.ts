/**
 * useTournaments — Domain 4: Tournament List
 *
 * Migrated from Supabase N+1 pattern to .NET API single-query.
 * Old: tournaments query + org query + profiles query + COUNT(*) per tournament = N+3 queries.
 * New: GET /api/tournaments — one query with correlated subcount + LEFT JOINs.
 *
 * Public Tournament type is backward-compatible with existing callers.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

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
  status?: 'draft' | 'published' | 'open' | 'closed' | 'ongoing' | 'completed' | 'cancelled';
  current_participants?: number;
  organizer_id?: string;
  slug?: string;
  is_public?: boolean;
  organizer_name?: string;
  organization_slug?: string;
  venue_city?: string | null;
  venue_country?: string | null;
}

type TournamentStatus = 'draft' | 'published' | 'open' | 'closed' | 'ongoing' | 'completed' | 'cancelled';

interface ApiTournamentRow {
  id: string;
  name: string;
  game: string;
  start_date: string;
  end_date: string;
  venue_id: string | null;
  max_teams: number;
  prize_pool: number;
  entry_fee: number;
  banner_url: string | null;
  logo_url: string | null;
  description: string;
  created_at: string;
  updated_at: string;
  status: TournamentStatus;
  is_public: boolean;
  organizer_id: string;
  slug: string;
  current_participants: number;
  organizer_name: string;
  organization_slug: string | null;
  venue_city: string | null;
  venue_country: string | null;
}

function mapRow(item: ApiTournamentRow): Tournament {
  return {
    id:                  item.id,
    name:                item.name,
    game:                item.game,
    date:                item.start_date ? new Date(item.start_date).toLocaleDateString('en-CA') : '',
    time:                item.start_date ? new Date(item.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
    venue:               item.venue_id ? `Venue ${item.venue_id}` : 'Online',
    max_participants:    item.max_teams,
    prize_pool:          item.prize_pool?.toString() ?? '0',
    entry_fee:           item.entry_fee > 0 ? item.entry_fee.toString() : 'Free',
    description:         item.description ?? '',
    user_id:             item.organizer_id,
    is_online:           !item.venue_id,
    created_at:          item.created_at,
    updated_at:          item.updated_at,
    image_url:           item.banner_url ?? item.logo_url,
    team_size:           1,
    status:              item.status,
    current_participants: item.current_participants ?? 0,
    organizer_id:        item.organizer_id,
    slug:                item.slug,
    organizer_name:      item.organizer_name ?? 'Unknown',
    organization_slug:   item.organization_slug ?? undefined,
    is_public:           item.is_public,
    venue_city:          item.venue_city,
    venue_country:       item.venue_country,
  };
}

export interface TournamentFilterParams {
  status?: TournamentStatus;
  game?: string;
  is_online?: boolean;
  city?: string;
  country?: string;
}

export function useTournaments(filters?: TournamentFilterParams | TournamentStatus) {
  // Backward-compatible: accept string status or filter object
  const filterObj: TournamentFilterParams = typeof filters === 'string'
    ? { status: filters }
    : (filters ?? {});

  return useQuery<Tournament[]>({
    queryKey: ['tournaments', filterObj],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100', offset: '0' });
      if (filterObj.status) params.set('status', filterObj.status);
      if (filterObj.game) params.set('game', filterObj.game);
      if (filterObj.is_online !== undefined) params.set('is_online', String(filterObj.is_online));
      if (filterObj.city) params.set('city', filterObj.city);
      if (filterObj.country) params.set('country', filterObj.country);

      const rows = await apiClient.get<ApiTournamentRow[]>(`/api/tournaments?${params}`);
      return rows.map(mapRow);
    },
    staleTime: 2 * 60_000,
  });
}
