/**
 * scrimRecord.ts
 *
 * Presentation model for a team's scrim record. Pure; the component only renders.
 * A hidden (private) record is null/undefined and renders nothing, which is the
 * privacy-safe default. A team with no games yet is "new", never a fake 0-0.
 */

import type { ScrimTeamRecord } from '@/types/competitive';
import { formatRecord } from '@/services/scrimDiscoveryUtils';

export type FormResult = 'W' | 'L' | 'D';

export interface FormPip {
  result: FormResult;
  isLatest: boolean;
}

export interface RecordView {
  /** "12-4" or "12-4-1". */
  record: string;
  /** Wins over decided games, e.g. "75%"; null when no decided games. */
  winRate: string | null;
  /** Completed over completed + no-shows, e.g. "94%"; null when unknown. */
  showRate: string | null;
  /** Oldest to newest, so the latest result sits at the right edge. */
  form: FormPip[];
  /** Only for runs of two or more. */
  streak: { label: string; kind: 'win' | 'loss' } | null;
  isNew: boolean;
  /** Screen-reader text; colour is never the only signal. */
  summary: string;
}

const WORD: Record<FormResult, string> = { W: 'win', L: 'loss', D: 'draw' };
const pct = (n: number) => `${Math.round(n * 100)}%`;
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function streakOf(streak: number): RecordView['streak'] {
  if (streak >= 2) return { label: `W${streak}`, kind: 'win' };
  if (streak <= -2) return { label: `L${Math.abs(streak)}`, kind: 'loss' };
  return null;
}

export function describeRecord(record: ScrimTeamRecord | null | undefined): RecordView | null {
  if (!record) return null;

  const decided = record.wins + record.losses;
  const winRate = decided > 0 ? pct(record.wins / decided) : null;
  const showRate = record.showRate == null ? null : pct(record.showRate);
  const isNew = record.completed === 0 && record.noShows === 0;

  const chronological = [...record.last5].reverse();
  const form = chronological.map((result, i) => ({ result, isLatest: i === chronological.length - 1 }));

  const parts = [
    `${count(record.wins, 'win', 'wins')}, ${count(record.losses, 'loss', 'losses')}`,
    ...(record.draws > 0 ? [count(record.draws, 'draw', 'draws')] : []),
    ...(showRate ? [`${showRate} show rate`] : []),
    ...(chronological.length > 0
      ? [`Last games, oldest to newest: ${chronological.map((r) => WORD[r]).join(', ')}`]
      : []),
  ];

  return {
    record: formatRecord(record),
    winRate,
    showRate,
    form,
    streak: streakOf(record.streak),
    isNew,
    summary: isNew ? 'New to scrims, no games played yet' : parts.join('. '),
  };
}
