import type { MapIntel } from '@/types/scrimData';

export const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'] as const;
export type MapTier = (typeof TIER_ORDER)[number];

/** A map is placed once it has this many maps behind it; before that it waits in "not enough maps". */
export const MIN_MAPS_TO_RANK = 2;

/** Each map starts as half a map at 50%, so a thin sample cannot top or bottom the list: its rating is pulled towards the middle until the rounds say otherwise. */
export const PRIOR_ROUNDS = 26;

/** Lowest rating (round win rate after the prior) for each tier. Below the C line is D. */
export const TIER_MIN: Record<Exclude<MapTier, 'D'>, number> = { S: 58, A: 54, B: 50, C: 46 };

export interface RankedMap { map: MapIntel; rating: number; tier: MapTier }

export interface TierList { tiers: Record<MapTier, RankedMap[]>; unranked: MapIntel[] }

/** Round win rate with the prior added, as a percentage with one decimal. */
export function mapRating(m: Pick<MapIntel, 'roundsWon' | 'roundsLost'>): number {
  const played = m.roundsWon + m.roundsLost;
  return Math.round(((m.roundsWon + PRIOR_ROUNDS / 2) / (played + PRIOR_ROUNDS)) * 1000) / 10;
}

export function tierOf(rating: number): MapTier {
  return rating >= TIER_MIN.S ? 'S' : rating >= TIER_MIN.A ? 'A' : rating >= TIER_MIN.B ? 'B' : rating >= TIER_MIN.C ? 'C' : 'D';
}

/** Maps ranked by how the team has actually done on them: rounds, not just who won, and nothing placed on a single map. Best first inside a tier. */
export function mapTiers(maps: readonly MapIntel[]): TierList {
  const tiers: Record<MapTier, RankedMap[]> = { S: [], A: [], B: [], C: [], D: [] };
  const unranked: MapIntel[] = [];
  for (const m of maps) {
    if (m.games < MIN_MAPS_TO_RANK) { unranked.push(m); continue; }
    const rating = mapRating(m);
    tiers[tierOf(rating)].push({ map: m, rating, tier: tierOf(rating) });
  }
  for (const t of TIER_ORDER) tiers[t].sort((a, b) => b.rating - a.rating || b.map.games - a.map.games || a.map.map.localeCompare(b.map.map));
  unranked.sort((a, b) => b.games - a.games || a.map.localeCompare(b.map));
  return { tiers, unranked };
}
