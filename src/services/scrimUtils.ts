/**
 * Pure utilities for the scrims feature.
 * No Supabase, no React — safe to import in services and components alike.
 */

const DAY_ABBREVS: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

/**
 * Maps a backend INT[] (0=Sunday … 6=Saturday) to display abbreviations.
 * Unknown indices are silently omitted.
 *
 * @example
 * formatPreferredDays([1, 3, 5]) // ['Mon', 'Wed', 'Fri']
 */
export function formatPreferredDays(days: number[] | null): string[] {
  if (!days) return [];
  return days.map(d => DAY_ABBREVS[d]).filter(Boolean);
}

// ── Best-of series format ──────────────────────────────────────────────────────

export type BestOf = 1 | 3 | 5;

/** Recognised series formats, ascending. */
export const BEST_OF_OPTIONS: readonly BestOf[] = [1, 3, 5];

/** Coerce an unknown value from the API to a valid series format (BO1 fallback). */
export function normalizeBestOf(value: unknown): BestOf {
  return value === 1 || value === 3 || value === 5 ? value : 1;
}

/** "BO3" label for a series format. */
export function bestOfLabel(bestOf: unknown): string {
  return `BO${normalizeBestOf(bestOf)}`;
}

/** Long label used in the session room and result reporting, e.g. "Best of 3". */
export function bestOfLongLabel(bestOf: unknown): string {
  return `Best of ${normalizeBestOf(bestOf)}`;
}

/** Series wins required to close out the series. BO1 → 1, BO3 → 2, BO5 → 3. */
export function winsNeeded(bestOf: unknown): number {
  return (normalizeBestOf(bestOf) + 1) / 2;
}

/**
 * Every valid series outcome as [team1Wins, team2Wins] pairs, ordered win/loss mirror
 * pairs first (2–0 / 0–2), then the closer series results (2–1 / 1–2).
 * Drives preset buttons in result reporting and format validation.
 *
 * @example validSeriesOutcomes(3) // [[2,0],[0,2],[2,1],[1,2]]
 */
export function validSeriesOutcomes(bestOf: unknown): Array<[number, number]> {
  const need = winsNeeded(bestOf);
  const outcomes: Array<[number, number]> = [];
  // Sweep first, then the longer series — each pair mirrors the other side.
  for (let loser = 0; loser < need; loser++) {
    outcomes.push([need, loser], [loser, need]);
  }
  return outcomes;
}

/** True when a pair of scores is a legal series result for this format. */
export function isLegalSeriesScore(
  bestOf: unknown,
  team1Score: number,
  team2Score: number,
): boolean {
  return validSeriesOutcomes(bestOf).some(
    ([a, b]) => a === team1Score && b === team2Score,
  );
}

/** Human copy shown when a score is rejected, e.g. "First to 2 wins". */
export function seriesOutcomeHint(bestOf: unknown): string {
  const need = winsNeeded(bestOf);
  return need === 1 ? 'First win closes it' : `First to ${need} wins`;
}
