/**
 * useScrimDiscovery.ts
 *
 * Augmented discover hook for ScrimDiscoveryPage (PROJ-077 T10).
 * Extends the base /api/scrims/discover endpoint with mode, region,
 * and rank sort-order filter params delivered by T2 backend.
 *
 * Use this hook instead of useDiscoverScrims when the caller needs
 * server-side filtering. The base useDiscoverScrims remains for
 * workspace and other single-game surfaces.
 */

import { useQuery } from '@tanstack/react-query';
import { competitiveApiClient as apiClient } from '@/hooks/competitive/competitiveApiClient';
import type { ScrimListing } from '@/types/competitive';

export interface DiscoverScrimsFilters {
  game: string;
  mode?: string;
  region?: string;
  minRankSortOrder?: number;
  maxRankSortOrder?: number;
}

export function useDiscoverScrimsFiltered(filters: DiscoverScrimsFilters) {
  const { game, mode, region, minRankSortOrder, maxRankSortOrder } = filters;

  return useQuery({
    queryKey: ['scrims', 'discover-filtered', filters] as const,
    queryFn: () => {
      const params = new URLSearchParams({ game });
      if (mode) params.set('mode', mode);
      if (region) params.set('region', region);
      if (minRankSortOrder !== undefined) {
        params.set('min_rank_sort_order', String(minRankSortOrder));
      }
      if (maxRankSortOrder !== undefined) {
        params.set('max_rank_sort_order', String(maxRankSortOrder));
      }
      return apiClient.get<ScrimListing[]>(`/api/scrims/discover?${params.toString()}`);
    },
    enabled: !!game,
    staleTime: 30_000,
  });
}
