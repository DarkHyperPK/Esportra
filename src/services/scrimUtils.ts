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
