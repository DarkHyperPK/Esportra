import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { RankTier, GameRole, GameRegion } from '@/types/competitive';

const STALE_TIME = 10 * 60 * 1000; // 10 min — catalog is stable

export function useRankTiers(gameSlug: string) {
  return useQuery({
    queryKey: ['catalog', 'rank-tiers', gameSlug],
    queryFn: () => apiClient.get<RankTier[]>(`/api/catalog/rank-tiers?game=${gameSlug}`),
    staleTime: STALE_TIME,
    enabled: !!gameSlug,
  });
}

export function useGameRoles(gameSlug: string) {
  return useQuery({
    queryKey: ['catalog', 'game-roles', gameSlug],
    queryFn: () => apiClient.get<GameRole[]>(`/api/catalog/game-roles?game=${gameSlug}`),
    staleTime: STALE_TIME,
    enabled: !!gameSlug,
  });
}

export function useGameRegions(gameSlug: string) {
  return useQuery({
    queryKey: ['catalog', 'regions', gameSlug],
    queryFn: () => apiClient.get<GameRegion[]>(`/api/catalog/regions?game=${gameSlug}`),
    staleTime: STALE_TIME,
    enabled: !!gameSlug,
  });
}
