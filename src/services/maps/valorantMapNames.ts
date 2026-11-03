/** Riot's internal map code names and what players call them. Mirrors ValorantMaps in the backend. */
const NAME_BY_CODE: Record<string, string> = {
  ascent: 'Ascent', duality: 'Bind', triad: 'Haven', bonsai: 'Split', port: 'Icebox', foxtrot: 'Breeze',
  canyon: 'Fracture', pitt: 'Pearl', jam: 'Lotus', juliett: 'Sunset', infinity: 'Abyss', rook: 'Corrode',
  hurm_alley: 'District', hurm_bowl: 'Kasbah', hurm_yard: 'Piazza',
};

export const UNKNOWN_MAP = 'Unknown map';

/** Maps Riot's published list added after the built-in table above (new maps need no release). Set when the map catalog loads. */
let learned: Record<string, string> = {};

/** Teaches the helpers the maps in valorant-api's list: the last segment of each map path -> its display name. */
export function registerMapCatalog(entries: ReadonlyArray<{ mapUrl?: string; displayName?: string }>): void {
  const next: Record<string, string> = {};
  for (const e of entries) {
    const code = e.mapUrl ? lastSegment(e.mapUrl) : '';
    if (code && e.displayName) next[code] = e.displayName;
  }
  if (Object.keys(next).length > 0) learned = next;
}

const lastSegment = (value: string) => value.split('/').filter(Boolean).pop()?.trim().toLowerCase() ?? '';

/** The name for a Riot map path or code ("/Game/Maps/Triad/Triad", "Triad"); null when it is not a known code. */
export function mapNameFromRiotId(riotMapIdOrCode: string | null | undefined): string | null {
  if (!riotMapIdOrCode) return null;
  const code = lastSegment(riotMapIdOrCode);
  return NAME_BY_CODE[code] ?? learned[code] ?? null;
}

/**
 * A map name that is safe to show. Known codes become their player-facing name, free text (a name someone typed) is
 * kept, and an unrecognised Riot path reads "Unknown map" instead of an internal code. Null/empty -> null.
 */
export function displayMapName(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  return mapNameFromRiotId(text) ?? (text.includes('/') ? UNKNOWN_MAP : text);
}
