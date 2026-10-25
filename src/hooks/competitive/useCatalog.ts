/**
 * useCatalog.ts
 *
 * Canonical catalog hooks returning the correct CatalogRankTier,
 * CatalogGameRole, and CatalogRegion shapes from the new catalog endpoints.
 *
 * Stale time: 24 h — catalog data is stable; icon URLs are CDN paths that
 * don't change without a migration.
 *
 * Use these hooks in new components (T11+). Legacy components continue to use
 * the deprecated hooks in useCatalogCompetitive.ts until they are rewritten.
 *
 * Source of truth: shared-contracts/types.md §2 and §6.1 (PROJ-075)
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { CatalogRankTier, CatalogGameRole, CatalogRegion } from '@/types/competitive';
import { catalogKeys } from './queryKeys';

const CATALOG_STALE_TIME = 24 * 60 * 60 * 1_000; // 24 hours

/**
 * Rank tiers for a game, sorted by sortOrder ASC.
 * Includes iconUrl (CDN path) after migration T2 runs.
 */
export function useCatalogRankTiers(game: string) {
  return useQuery({
    queryKey: catalogKeys.rankTiers(game),
    queryFn: () => apiClient.get<CatalogRankTier[]>(`/api/catalog/rank-tiers?game=${game}`),
    staleTime: CATALOG_STALE_TIME,
    enabled: !!game,
  });
}

/**
 * Game roles for a game, sorted by sortOrder ASC.
 * Includes iconUrl (CDN path) after migration T2 runs.
 */
export function useCatalogGameRoles(game: string) {
  return useQuery({
    queryKey: catalogKeys.gameRoles(game),
    queryFn: () => apiClient.get<CatalogGameRole[]>(`/api/catalog/game-roles?game=${game}`),
    staleTime: CATALOG_STALE_TIME,
    enabled: !!game,
  });
}

/**
 * Regions for a game.
 */
export function useCatalogRegions(game: string) {
  return useQuery({
    queryKey: catalogKeys.regions(game),
    queryFn: () => apiClient.get<CatalogRegion[]>(`/api/catalog/regions?game=${game}`),
    staleTime: CATALOG_STALE_TIME,
    enabled: !!game,
  });
}
