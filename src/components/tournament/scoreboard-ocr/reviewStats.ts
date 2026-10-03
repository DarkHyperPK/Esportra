import type { OcrStatKey } from '@/types/scoreboardOcr';

/** The stats the captain confirms (the ones the scoreboard views and overlay show). */
export const REVIEW_STATS: Array<{ key: OcrStatKey; label: string; title: string }> = [
  { key: 'acs', label: 'ACS', title: 'Average combat score' },
  { key: 'kills', label: 'K', title: 'Kills' },
  { key: 'deaths', label: 'D', title: 'Deaths' },
  { key: 'assists', label: 'A', title: 'Assists' },
  { key: 'firstBloods', label: 'FK', title: 'First kills' },
];
