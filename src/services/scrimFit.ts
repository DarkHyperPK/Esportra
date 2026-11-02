/**
 * scrimFit.ts
 *
 * Pure "does this opponent fit my team?" check for discovery cards.
 * Rank bands are compared by catalog sortOrder; region by key.
 */

export interface FitTeam {
  regionKey: string | null;
  /** Catalog rank sort order of the team's own band. */
  minRankSortOrder: number | null;
  maxRankSortOrder: number | null;
}

export type FitLevel = 'good' | 'partial' | 'unknown';

export interface ScrimFit {
  level: FitLevel;
  rankOverlap: boolean | null;
  sameRegion: boolean | null;
}

function overlaps(a: FitTeam, b: FitTeam): boolean | null {
  const aMin = a.minRankSortOrder ?? a.maxRankSortOrder;
  const aMax = a.maxRankSortOrder ?? a.minRankSortOrder;
  const bMin = b.minRankSortOrder ?? b.maxRankSortOrder;
  const bMax = b.maxRankSortOrder ?? b.minRankSortOrder;
  if (aMin == null || aMax == null || bMin == null || bMax == null) return null;
  return aMin <= bMax && bMin <= aMax;
}

export function deriveScrimFit(mine: FitTeam, theirs: FitTeam): ScrimFit {
  const rankOverlap = overlaps(mine, theirs);
  const sameRegion =
    mine.regionKey && theirs.regionKey ? mine.regionKey === theirs.regionKey : null;

  if (rankOverlap === null && sameRegion === null) {
    return { level: 'unknown', rankOverlap, sameRegion };
  }
  const level: FitLevel = rankOverlap !== false && sameRegion !== false ? 'good' : 'partial';
  return { level, rankOverlap, sameRegion };
}
