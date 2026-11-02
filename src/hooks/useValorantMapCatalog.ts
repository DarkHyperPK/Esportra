import { useQuery } from '@tanstack/react-query';
import type { ValorantCatalogMap } from '@/services/maps/valorantMapAssets';

interface MapApiRow {
  uuid: string;
  displayName: string;
  mapUrl?: string | null;
  splash?: string | null;
}

/** Riot's public map catalog, for maps the built-in table doesn't know yet (cached for the session). */
export function useValorantMapCatalog(enabled = true) {
  return useQuery({
    queryKey: ['valorant-maps-catalog'],
    enabled,
    staleTime: Infinity,
    retry: false,
    queryFn: async (): Promise<ValorantCatalogMap[]> => {
      const response = await fetch('https://valorant-api.com/v1/maps');
      if (!response.ok) throw new Error('Map catalog unavailable');
      const body: { data?: MapApiRow[] } = await response.json();
      return (body.data ?? []).map((m) => ({ uuid: m.uuid, displayName: m.displayName, mapUrl: m.mapUrl ?? null, splash: m.splash ?? null }));
    },
  });
}
