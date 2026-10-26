/**
 * useCatalogCompetitive.ts
 *
 * @deprecated Legacy catalog hooks returning the old RankTier/GameRole/GameRegion
 * shapes. These are kept for backward compat with components that will be rewritten
 * in T11-T13.
 *
 * New components should use useCatalogRankTiers, useCatalogGameRoles,
 * useCatalogRegions from useCatalog.ts which return the canonical CatalogRankTier,
 * CatalogGameRole, CatalogRegion shapes.
 */

import { useQuery } from '@tanstack/react-query';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import type { RankTier, GameRole, GameRegion } from '@/types/competitive';

// Catalog data is stable — cache for 24 hours
const STALE_TIME = 24 * 60 * 60 * 1_000;

/** @deprecated Use useCatalogRankTiers from useCatalog.ts */
export function useRankTiers(gameSlug: string) {
  return useQuery({
    queryKey: ['catalog', 'rank-tiers', gameSlug],
    queryFn: () => apiClient.get<RankTier[]>(`/api/catalog/rank-tiers?game=${gameSlug}`),
    staleTime: STALE_TIME,
    enabled: !!gameSlug,
  });
}

/** @deprecated Use useCatalogGameRoles from useCatalog.ts */
export function useGameRoles(gameSlug: string) {
  return useQuery({
    queryKey: ['catalog', 'game-roles', gameSlug],
    queryFn: () => apiClient.get<GameRole[]>(`/api/catalog/game-roles?game=${gameSlug}`),
    staleTime: STALE_TIME,
    enabled: !!gameSlug,
  });
}

/** @deprecated Use useCatalogRegions from useCatalog.ts */
export function useGameRegions(gameSlug: string) {
  return useQuery({
    queryKey: ['catalog', 'regions', gameSlug],
    queryFn: () => apiClient.get<GameRegion[]>(`/api/catalog/regions?game=${gameSlug}`),
    staleTime: STALE_TIME,
    enabled: !!gameSlug,
  });
}
