import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { PlayerSearchResult, LfgListing, PlayerSearchFilters, LfgSearchFilters, PopularAgent } from '@/types/competitive';

function buildPlayerSearchParams(filters: PlayerSearchFilters): string {
  const params = new URLSearchParams({ game: filters.game });
  if (filters.roles?.length) params.set('roles', filters.roles.join(','));
  if (filters.minRank != null) params.set('min_rank', String(filters.minRank));
  if (filters.maxRank != null) params.set('max_rank', String(filters.maxRank));
  if (filters.regionKey) params.set('region_key', filters.regionKey);
  if (filters.lookingForTeam != null) params.set('looking_for_team', String(filters.lookingForTeam));
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null && filters.offset > 0) params.set('offset', String(filters.offset));
  return params.toString();
}

function buildLfgSearchParams(filters: LfgSearchFilters): string {
  const params = new URLSearchParams({ game: filters.game });
  if (filters.intent?.length) params.set('intent', filters.intent.join(','));
  if (filters.minRank != null) params.set('min_rank', String(filters.minRank));
  if (filters.maxRank != null) params.set('max_rank', String(filters.maxRank));
  if (filters.regionKey) params.set('region_key', filters.regionKey);
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null && filters.offset > 0) params.set('offset', String(filters.offset));
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

function parsePopularAgents(raw: unknown): PopularAgent[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as PopularAgent[];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as PopularAgent[]; } catch { return null; }
  }
  return null;
}

function enrichListings(listings: LfgListing[]): LfgListing[] {
  return listings.map((l) => ({
    ...l,
    popularAgents: parsePopularAgents(l.popularAgents),
  }));
}

export function useDiscoverLfg(filters: LfgSearchFilters) {
  return useQuery({
    queryKey: ['discover', 'lfg', filters],
    queryFn: async () => {
      const data = await apiClient.get<LfgListing[]>(
        `/api/competitive/lfg?${buildLfgSearchParams(filters)}`,
      );
      return enrichListings(data);
    },
    enabled: !!filters.game,
    staleTime: 30_000,
  });
}
