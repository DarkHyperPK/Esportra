import { useCallback, useState } from 'react';
import { squadUpFiltersSchema, type SquadUpFilters } from '@/schemas/squadUp';

const KEY = 'squad-up:filters';

export const defaultFilters = (ownCountry?: string | null): SquadUpFilters => ({
  game: 'valorant', mode: 'competitive', wantedCountries: ownCountry ? [ownCountry] : [], minTier: null, maxTier: null,
});

/**
 * The filters the player last went live with, remembered in this browser only (a convenience: the server keeps
 * the real session). Used to label the session and to filter the lobby board after a reload.
 */
export function useSquadUpFilters(ownCountry?: string | null) {
  const [filters, setFilters] = useState<SquadUpFilters>(() => {
    try {
      const parsed = squadUpFiltersSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
      if (parsed.success) return parsed.data;
    } catch { /* storage unavailable or corrupt: fall back to defaults */ }
    return defaultFilters(ownCountry);
  });
  const remember = useCallback((next: SquadUpFilters) => {
    setFilters(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage is optional */ }
  }, []);
  return { filters, remember };
}
