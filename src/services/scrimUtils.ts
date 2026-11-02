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

// ── Schedule-overlap detection ────────────────────────────────────────────────

/** Fallback match length when a session row has no duration (matches slot length). */
export const DEFAULT_SCRIM_MINUTES = 90;

interface SessionTiming {
  id: string;
  scheduledAt: string | null;
  durationMinutes?: number | null;
}

interface ListingAvailability {
  id: string;
  preferredDays: number[] | null;
  preferredTimeStart: string | null;
  preferredTimeEnd: string | null;
}

/** Parse `HH:MM` / `HH:MM:SS` into minutes since midnight. */
function toMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function addPair(map: Map<string, string[]>, a: string, b: string) {
  if (!map.has(a)) map.set(a, []);
  if (!map.has(b)) map.set(b, []);
  map.get(a)!.push(b);
  map.get(b)!.push(a);
}

/**
 * Maps each scheduled session id to the ids of sessions whose time ranges intersect.
 * Untimed sessions are ignored; missing durations fall back to the default slot length.
 *
 * @example findOverlappingSessions([
 *   { id: 'a', scheduledAt: '2026-11-01T19:00:00Z', durationMinutes: 90 },
 *   { id: 'b', scheduledAt: '2026-11-01T20:00:00Z', durationMinutes: 90 },
 * ]) // Map { 'a' => ['b'], 'b' => ['a'] }
 */
export function findOverlappingSessions<T extends SessionTiming>(
  sessions: readonly T[],
): Map<string, string[]> {
  const timed = sessions
    .filter((s): s is T & { scheduledAt: string } => !!s.scheduledAt)
    .map((s) => {
      const start = Date.parse(s.scheduledAt);
      const minutes = s.durationMinutes && s.durationMinutes > 0
        ? s.durationMinutes
        : DEFAULT_SCRIM_MINUTES;
      return { id: s.id, start, end: start + minutes * 60_000 };
    })
    .filter((s) => Number.isFinite(s.start));

  const overlaps = new Map<string, string[]>();
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      if (a.start < b.end && b.start < a.end) addPair(overlaps, a.id, b.id);
    }
  }
  return overlaps;
}

/**
 * Maps each listing id to the ids of listings whose availability windows intersect:
 * at least one shared day, then overlapping time ranges (missing bounds count as
 * open-ended, so a listing without times overlaps the whole day).
 */
export function findOverlappingListings<T extends ListingAvailability>(
  listings: readonly T[],
): Map<string, string[]> {
  const overlaps = new Map<string, string[]>();

  for (let i = 0; i < listings.length; i++) {
    for (let j = i + 1; j < listings.length; j++) {
      const a = listings[i];
      const b = listings[j];

      const daysA = a.preferredDays ?? [];
      const daysB = b.preferredDays ?? [];
      if (!daysA.some((d) => daysB.includes(d))) continue;

      const aStart = toMinutes(a.preferredTimeStart);
      const aEnd = toMinutes(a.preferredTimeEnd);
      const bStart = toMinutes(b.preferredTimeStart);
      const bEnd = toMinutes(b.preferredTimeEnd);

      // A missing window means "all day" and therefore always intersects.
      if (aStart == null && aEnd == null) { addPair(overlaps, a.id, b.id); continue; }
      if (bStart == null && bEnd == null) { addPair(overlaps, a.id, b.id); continue; }

      const startA = aStart ?? 0;
      const endA = aEnd ?? 24 * 60;
      const startB = bStart ?? 0;
      const endB = bEnd ?? 24 * 60;

      if (startA < endB && startB < endA) addPair(overlaps, a.id, b.id);
    }
  }

  return overlaps;
}


/**
 * Formats an ISO instant for <input type="datetime-local">, which expects
 * LOCAL wall-clock time ("YYYY-MM-DDTHH:mm"), not UTC.
 */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
