import { useCallback, useState } from 'react';
import { z } from 'zod';
import { areaOf } from '@/lib/countryAreas';
import { noteSchema, squadUpFiltersSchema, type SquadUpFilters } from '@/schemas/squadUp';

const KEY = 'squad-up:setup';

/** Everything the quick setup asks for. Filters plus what the card shows (note, mic, players needed). */
export const squadUpSetupSchema = squadUpFiltersSchema.and(z.object({
  micOn: z.boolean(),
  slotsNeeded: z.number().int().min(1).max(4),
  note: noteSchema,
}));
export type SquadUpSetup = z.infer<typeof squadUpSetupSchema>;

/** A first-time setup. The area comes from the profile country when there is one; otherwise the player picks it. */
export function defaultSetup(ownCountry?: string | null): Partial<SquadUpSetup> & Omit<SquadUpSetup, 'areas'> {
  const area = ownCountry ? areaOf(ownCountry)?.id : undefined;
  return { game: 'valorant', mode: 'competitive', ...(area ? { areas: [area] } : {}), micOn: true, slotsNeeded: 1, note: '' };
}

function readStored(): SquadUpSetup | null {
  try {
    const parsed = squadUpSetupSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // storage unavailable or corrupt: fall back to defaults
  }
}

/**
 * The setup the player last went live with, remembered in this browser only (a convenience: the server keeps
 * the real session), so going live again is one tap. `filters` is null until an area is known.
 */
export function useSquadUpFilters(ownCountry?: string | null) {
  const [setup, setSetup] = useState(() => readStored() ?? defaultSetup(ownCountry));
  const remember = useCallback((next: SquadUpSetup) => {
    setSetup(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage is optional */ }
  }, []);
  const filters: SquadUpFilters | null = setup.areas?.length
    ? { game: 'valorant', mode: setup.mode, areas: setup.areas, minTier: setup.minTier ?? null, maxTier: setup.maxTier ?? null }
    : null;
  return { setup, filters, remember };
}
