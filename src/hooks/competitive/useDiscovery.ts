import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { PlayerSearchResult, LfgListing, PlayerSearchFilters, LfgSearchFilters } from '@/types/competitive';

function buildPlayerSearchParams(filters: PlayerSearchFilters): string {
  const params = new URLSearchParams({ game: filters.game });
  if (filters.roles?.length) params.set('roles', filters.roles.join(','));
  if (filters.minRank) params.set('min_rank', filters.minRank);
  if (filters.maxRank) params.set('max_rank', filters.maxRank);
  if (filters.region) params.set('region', filters.region);
  if (filters.lftOnly) params.set('lft', 'true');
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

function buildLfgSearchParams(filters: LfgSearchFilters): string {
  const params = new URLSearchParams({ game: filters.game });
  if (filters.intent?.length) params.set('intent', filters.intent.join(','));
  if (filters.minRank) params.set('min_rank', filters.minRank);
  if (filters.maxRank) params.set('max_rank', filters.maxRank);
  if (filters.region) params.set('region', filters.region);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  return params.toString();
}

export function useDiscoverPlayers(filters: PlayerSearchFilters) {
  return useQuery({
    queryKey: ['discover', 'players', filters],
    queryFn: () =>
      apiClient.get<PlayerSearchResult[]>(
        `/api/competitive/profiles/search?${buildPlayerSearchParams(filters)}`,
      ),
    enabled: !!filters.game,
    staleTime: 30_000,
  });
}

export function useDiscoverLfg(filters: LfgSearchFilters) {
  return useQuery({
    queryKey: ['discover', 'lfg', filters],
    queryFn: () =>
      apiClient.get<LfgListing[]>(
        `/api/competitive/lfg?${buildLfgSearchParams(filters)}`,
      ),
    enabled: !!filters.game,
    staleTime: 30_000,
  });
}
