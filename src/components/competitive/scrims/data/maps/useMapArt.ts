import { useCallback } from 'react';
import { useValorantMapCatalog } from '@/hooks/useValorantMapCatalog';
import { resolveMapSplash } from '@/services/maps/valorantMapAssets';

/** A map's splash picture by name: the built-in table first, then Riot's published list for maps released since. Null when neither knows it. */
export function useMapArt(): (map: string) => string | null {
  const { data: catalog } = useValorantMapCatalog();
  return useCallback((map: string) => resolveMapSplash(map, null, catalog ?? []), [catalog]);
}
