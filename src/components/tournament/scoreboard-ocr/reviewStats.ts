import type { OcrStatKey } from '@/types/scoreboardOcr';

export interface ReviewStat {
  key: OcrStatKey;
  label: string;
  title: string;
}

/** Every stat the review can show, in table order. */
const ALL_STATS: ReviewStat[] = [
  { key: 'acs', label: 'ACS', title: 'Average combat score (Performance Score in the 2026 client)' },
  { key: 'kills', label: 'K', title: 'Kills' },
  { key: 'deaths', label: 'D', title: 'Deaths' },
  { key: 'assists', label: 'A', title: 'Assists' },
  { key: 'trades', label: 'TR', title: 'Trades' },
  { key: 'firstBloods', label: 'FK', title: 'First kills' },
  { key: 'plants', label: 'PL', title: 'Spike plants' },
  { key: 'defuses', label: 'DF', title: 'Spike defuses' },
];

/** Always editable, even when the reader missed the column. */
const ALWAYS: ReadonlySet<OcrStatKey> = new Set(['kills', 'deaths', 'assists', 'firstBloods']);

/** ACS, trades, plants and defuses only when the screenshot had them (custom games show no ACS). */
export function visibleStats(columns: OcrStatKey[]): ReviewStat[] {
  return ALL_STATS.filter((stat) => ALWAYS.has(stat.key) || columns.includes(stat.key));
}

// Static class strings so Tailwind can see them (4–8 stat columns).
const DESKTOP_GRID: Record<number, string> = {
  4: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(4,3.4rem)]',
  5: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(5,3.4rem)]',
  6: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(6,3.4rem)]',
  7: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(7,3.4rem)]',
  8: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(8,3.2rem)]',
};
// Phones: more than six boxes in a row clip 3-digit values (ACS), so 7-8 stats wrap to two rows of four.
const MOBILE_STATS_GRID: Record<number, string> = { 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-4', 8: 'grid-cols-4' };

export const desktopGridClass = (count: number) => DESKTOP_GRID[count] ?? DESKTOP_GRID[8];
export const mobileStatsGridClass = (count: number) => MOBILE_STATS_GRID[count] ?? MOBILE_STATS_GRID[8];
