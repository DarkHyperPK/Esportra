import type { Fight } from '@/schemas/scrimFights';
import { projectPoint, type MapTransform } from './heatmap';

/** The map is cut into GRID x GRID zones; a zone shows a result only once it has this many fights. */
export const GRID = 8;
export const MIN_ZONE_FIGHTS = 3;
/** Riot units: 100 = 1 metre. A death with no teammate within this distance counts as isolated. */
export const ISOLATED_UNITS = 1500;
export const MIN_SPACING_DEATHS = 5;

export type ZoneTone = 'good' | 'bad' | 'even';
export interface Zone { col: number; row: number; won: number; lost: number; fights: number; tone: ZoneTone }

const cellOf = (v: number) => Math.min(GRID - 1, Math.max(0, Math.floor(v * GRID)));

/** Fights per zone of the minimap. Zones under the minimum are left out, so a thin sample never colours the map. */
export function zonesOf(fights: Fight[], transform: MapTransform | undefined): Zone[] {
  const cells = new Map<string, { col: number; row: number; won: number; lost: number }>();
  for (const f of fights) {
    const at = projectPoint(f, transform);
    if (!at) continue;
    const col = cellOf(at.across);
    const row = cellOf(at.down);
    const cell = cells.get(`${col}:${row}`) ?? { col, row, won: 0, lost: 0 };
    if (f.won) cell.won += 1; else cell.lost += 1;
    cells.set(`${col}:${row}`, cell);
  }
  return [...cells.values()].filter((c) => c.won + c.lost >= MIN_ZONE_FIGHTS).map((c) => {
    const fightsHere = c.won + c.lost;
    const share = c.won / fightsHere;
    return { ...c, fights: fightsHere, tone: share >= 0.6 ? 'good' : share <= 0.4 ? 'bad' : 'even' };
  });
}

export interface Spacing { deaths: number; isolated: number; isolatedUntraded: number; supported: number; supportedUntraded: number }

/** Of the team's deaths where a teammate's position was recorded: how many happened alone, and how many of each kind went untraded. */
export function spacingOf(fights: Fight[]): Spacing {
  const out: Spacing = { deaths: 0, isolated: 0, isolatedUntraded: 0, supported: 0, supportedUntraded: 0 };
  for (const f of fights) {
    if (f.won || f.nearestAlly == null || f.traded == null) continue;
    out.deaths += 1;
    if (f.nearestAlly > ISOLATED_UNITS) { out.isolated += 1; if (!f.traded) out.isolatedUntraded += 1; }
    else { out.supported += 1; if (!f.traded) out.supportedUntraded += 1; }
  }
  return out;
}

/** One plain sentence about spacing, or null when too few deaths had positions to say anything. */
export function spacingSentence(s: Spacing): string | null {
  if (s.deaths < MIN_SPACING_DEATHS) return null;
  const metres = ISOLATED_UNITS / 100;
  const share = Math.round((100 * s.isolated) / s.deaths);
  const lead = `${s.isolated} of ${s.deaths} deaths (${share}%) had no teammate within ${metres} m.`;
  if (s.isolated === 0) return lead;
  const alone = `${s.isolatedUntraded} of those ${s.isolated} went untraded`;
  return s.supported === 0 ? `${lead} ${alone}.` : `${lead} ${alone}, against ${s.supportedUntraded} of ${s.supported} when a teammate was close.`;
}
