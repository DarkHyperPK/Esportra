import type { OcrStatKey } from '@/types/scoreboardOcr';

export interface ReviewStat {
  key: OcrStatKey;
  label: string;
  title: string;
}

/** Every stat the review can show, in table order. */
const ALL_STATS: ReviewStat[] = [
  { key: 'acs', label: 'ACS', title: 'Average combat score' },
  { key: 'kills', label: 'K', title: 'Kills' },
  { key: 'deaths', label: 'D', title: 'Deaths' },
  { key: 'assists', label: 'A', title: 'Assists' },
  { key: 'firstBloods', label: 'FK', title: 'First kills' },
  { key: 'plants', label: 'PL', title: 'Spike plants' },
  { key: 'defuses', label: 'DF', title: 'Spike defuses' },
];

/** Always editable, even when the reader missed the column. */
const ALWAYS: ReadonlySet<OcrStatKey> = new Set(['kills', 'deaths', 'assists', 'firstBloods']);

/** The client scoreboard has no ACS; show it (and plants/defuses) only when the screenshot had them. */
export function visibleStats(columns: OcrStatKey[]): ReviewStat[] {
  return ALL_STATS.filter((stat) => ALWAYS.has(stat.key) || columns.includes(stat.key));
}

// Static class strings so Tailwind can see them (4–7 stat columns).
const DESKTOP_GRID: Record<number, string> = {
  4: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(4,3.4rem)]',
  5: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(5,3.4rem)]',
  6: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(6,3.4rem)]',
  7: 'sm:grid-cols-[7.5rem_8.5rem_minmax(0,1fr)_repeat(7,3.4rem)]',
};
const MOBILE_STATS_GRID: Record<number, string> = { 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7' };

export const desktopGridClass = (count: number) => DESKTOP_GRID[count] ?? DESKTOP_GRID[7];
export const mobileStatsGridClass = (count: number) => MOBILE_STATS_GRID[count] ?? MOBILE_STATS_GRID[7];
