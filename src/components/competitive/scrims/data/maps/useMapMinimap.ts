import { useMemo } from 'react';
import { useValorantMaps, type ValorantMap } from '@/hooks/useValorantCatalog';
import { mapNameFromRiotId } from '@/services/maps/valorantMapNames';
import { valorantMapMinimap } from '@/services/maps/valorantMapAssets';
import type { MapTransform } from '@/services/scrimInsights/heatmap';

export type MinimapState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'missing' }
  | { status: 'ready'; art: string; transform: MapTransform };

const hasTransform = (m: ValorantMap) => m.xMultiplier != null && m.yMultiplier != null && m.xScalarToAdd != null && m.yScalarToAdd != null;

/** A map's minimap picture and its position conversion from Riot's list. A missing icon falls back to the official URL; without the conversion nothing is drawn, never guessed. */
export function useMapMinimap(map: string | null | undefined): MinimapState {
  const q = useValorantMaps();
  const entry = useMemo(() => {
    if (!map) return undefined;
    const list = q.data ?? [];
    return list.find((m) => m.displayName?.toLowerCase() === map.toLowerCase()) ?? list.find((m) => mapNameFromRiotId(m.mapUrl) === map);
  }, [q.data, map]);

  if (!q.data && q.isError) return { status: 'error', retry: () => void q.refetch() };
  if (!q.data) return { status: 'loading' };
  const art = entry?.displayIcon ?? (map ? valorantMapMinimap(map) : null);
  if (!entry || !art || !hasTransform(entry)) return { status: 'missing' };
  return { status: 'ready', art, transform: entry };
}
