export interface MapTransform { xMultiplier?: number; yMultiplier?: number; xScalarToAdd?: number; yScalarToAdd?: number }

/**
 * Riot's documented conversion from in-game coordinates to a position on the map picture, as fractions of its width and height:
 * across = y * xMultiplier + xScalarToAdd, down = x * yMultiplier + yScalarToAdd. Null when the map has no conversion, so nothing is drawn in a wrong place.
 */
export function projectPoint(p: { x: number; y: number }, t: MapTransform | undefined): { across: number; down: number } | null {
  if (!t || t.xMultiplier == null || t.yMultiplier == null || t.xScalarToAdd == null || t.yScalarToAdd == null) return null;
  const across = p.y * t.xMultiplier + t.xScalarToAdd;
  const down = p.x * t.yMultiplier + t.yScalarToAdd;
  return across >= -0.05 && across <= 1.05 && down >= -0.05 && down <= 1.05 ? { across, down } : null;
}

export const HEAT_KINDS = [
  { id: 'kills', label: 'Kills', noun: 'kills', help: 'Where your players stood when they got a kill.' },
  { id: 'deaths', label: 'Deaths', noun: 'deaths', help: 'Where your players died.' },
  { id: 'opening_kills', label: 'Opening kills', noun: 'opening kills', help: 'Where your players stood when they won the first fight of a round.' },
  { id: 'opening_deaths', label: 'Opening deaths', noun: 'opening deaths', help: 'Where your players died in the first fight of a round.' },
  { id: 'plants', label: 'Plants', noun: 'plants', help: 'Where your team planted the spike.' },
  { id: 'defuses', label: 'Defuses', noun: 'defuses', help: 'Where your team defused the spike.' },
] as const;

export type HeatKind = (typeof HEAT_KINDS)[number]['id'];

/** One sentence saying what the picture shows and how much it rests on. */
export function heatSummary(kind: HeatKind, count: number, maps: number, map: string | null, side: string | null): string {
  const noun = HEAT_KINDS.find((k) => k.id === kind)?.noun ?? 'events';
  if (count === 0) return `No ${noun} recorded${map ? ` on ${map}` : ''}${side ? ` while ${side === 'attack' ? 'attacking' : 'defending'}` : ''} yet.`;
  return `${count} ${noun} over ${maps} ${maps === 1 ? 'map' : 'maps'}${map ? ` on ${map}` : ''}${side ? `, ${side === 'attack' ? 'attacking' : 'defending'}` : ''}.`;
}
