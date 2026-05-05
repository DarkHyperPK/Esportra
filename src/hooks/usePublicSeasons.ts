import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

// Types for public season data
export interface PublicSeason {
  id: string;
  name: string;
  slug: string;
  description: string;
  game: string;
  participant_mode: string;
  status: string;
  visibility: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  logo_url: string;
  settings: any;
  allow_manual_overrides: boolean;
  owner_username: string;
  owner_full_name: string;
  published_at: string;
  completed_at: string;
}

export interface PublicSeasonTournament {
  season_tournament_id: string;
  role: string;
  region: string;
  display_name: string;
  sort_order: number;
  season_tournament_status: string;
  tournament_id: string;
  tournament_name: string;
  tournament_slug: string;
  tournament_status: string;
  starts_at: string;
  ends_at: string;
  registration_deadline: string;
}

export interface PublicSeasonStanding {
  entity_id: string;
  entity_type: string;
  total_points: number;
  tournaments_played: number;
  best_finish: number;
  current_status: string;
  last_tournament_id: string;
  display_name: string;
  avatar_url: string;
}

export interface TeamJourneyRecord {
  id: string;
  from_tournament_id: string;
  to_tournament_id: string;
  source_rank: number;
  target_seed: number;
  status: string;
  advanced_at: string;
  from_tournament_name: string;
  to_tournament_name: string;
}

export interface PublicSeasonsResponse {
  seasons: PublicSeason[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// Hooks for public season APIs
export function usePublicSeasons(params: {
  game?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['publicSeasons', params],
    queryFn: () => apiClient.get<PublicSeasonsResponse>('/api/public/seasons', { params }),
  });
}

export function usePublicSeason(slug: string) {
  return useQuery({
    queryKey: ['publicSeason', slug],
    queryFn: () => apiClient.get<PublicSeason>(`/api/public/seasons/${slug}`),
    enabled: !!slug,
  });
}

export function usePublicSeasonTournaments(seasonId: string) {
  return useQuery({
    queryKey: ['publicSeasonTournaments', seasonId],
    queryFn: () => apiClient.get<PublicSeasonTournament[]>(`/api/public/seasons/${seasonId}/tournaments`),
    enabled: !!seasonId,
  });
}

export function usePublicSeasonStandings(seasonId: string) {
  return useQuery({
    queryKey: ['publicSeasonStandings', seasonId],
    queryFn: () => apiClient.get<PublicSeasonStanding[]>(`/api/public/seasons/${seasonId}/standings`),
    enabled: !!seasonId,
  });
}

export function useTeamJourney(seasonId: string, teamId: string) {
  return useQuery({
    queryKey: ['teamJourney', seasonId, teamId],
    queryFn: () => apiClient.get<TeamJourneyRecord[]>(`/api/public/seasons/${seasonId}/team/${teamId}/path`),
    enabled: !!seasonId && !!teamId,
  });
}
