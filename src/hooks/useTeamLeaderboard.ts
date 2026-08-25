import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type {
  LeaderboardFiltersResponse,
  LeaderboardMetaResponse,
  LeaderboardQuery,
  LeaderboardTeamsResponse,
} from '@/types/leaderboard';

const PAGE_SIZE = 25;

function buildLeaderboardParams(query: LeaderboardQuery): string {
  const params = new URLSearchParams();
  params.set('scope', query.scope);
  if (query.game) params.set('game', query.game);
  if (query.country) params.set('country', query.country);
  if (query.region) params.set('region', query.region);
  params.set('limit', String(query.limit));
  params.set('offset', String(query.offset));
  return params.toString();
}

export const useTeamLeaderboard = (query: LeaderboardQuery, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  const queryString = buildLeaderboardParams(query);

  return useQuery({
    queryKey: ['team-leaderboard', queryString],
    queryFn: () => apiClient.get<LeaderboardTeamsResponse>(`/api/leaderboards/teams?${queryString}`),
    enabled,
    staleTime: 1000 * 60,
    placeholderData: (previous) => previous,
  });
};

export const useLeaderboardFilters = () =>
  useQuery({
    queryKey: ['leaderboard-filters'],
    queryFn: () => apiClient.get<LeaderboardFiltersResponse>('/api/leaderboards/filters'),
    staleTime: 1000 * 60 * 5,
  });

export const useLeaderboardMeta = () =>
  useQuery({
    queryKey: ['leaderboard-meta'],
    queryFn: () => apiClient.get<LeaderboardMetaResponse>('/api/leaderboards/meta'),
    staleTime: 1000 * 60 * 10,
  });

export const LEADERBOARD_PAGE_SIZE = PAGE_SIZE;
