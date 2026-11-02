import { describe, expect, it } from 'vitest';
import { describeRecord } from '../scrimRecord';
import type { ScrimTeamRecord } from '@/types/competitive';

const rec = (over: Partial<ScrimTeamRecord> = {}): ScrimTeamRecord => ({
  wins: 12,
  losses: 4,
  draws: 0,
  completed: 16,
  noShows: 1,
  showRate: 0.9412,
  lastPlayedAt: null,
  last5: ['W', 'W', 'L', 'W', 'D'],
  streak: 2,
  ...over,
});

describe('describeRecord', () => {
  it('returns null when the record is hidden or absent', () => {
    expect(describeRecord(null)).toBeNull();
    expect(describeRecord(undefined)).toBeNull();
  });

  it('formats record, win rate and show rate', () => {
    const d = describeRecord(rec())!;
    expect(d.record).toBe('12-4');
    expect(d.winRate).toBe('75%');
    expect(d.showRate).toBe('94%');
  });

  it('includes draws in the record only when present', () => {
    expect(describeRecord(rec({ draws: 1 }))!.record).toBe('12-4-1');
  });

  it('computes win rate over decided games and guards zero', () => {
    expect(describeRecord(rec({ wins: 0, losses: 0, draws: 3 }))!.winRate).toBeNull();
    expect(describeRecord(rec({ wins: 3, losses: 0 }))!.winRate).toBe('100%');
  });

  it('shows form oldest to newest, newest last', () => {
    const d = describeRecord(rec({ last5: ['W', 'L', 'D'] }))!;
    expect(d.form.map((f) => f.result)).toEqual(['D', 'L', 'W']);
    expect(d.form.at(-1)?.isLatest).toBe(true);
    expect(d.form.slice(0, -1).every((f) => !f.isLatest)).toBe(true);
  });

  it('labels streaks, ignoring runs under two', () => {
    expect(describeRecord(rec({ streak: 3 }))!.streak).toEqual({ label: 'W3', kind: 'win' });
    expect(describeRecord(rec({ streak: -2 }))!.streak).toEqual({ label: 'L2', kind: 'loss' });
    expect(describeRecord(rec({ streak: 1 }))!.streak).toBeNull();
    expect(describeRecord(rec({ streak: 0 }))!.streak).toBeNull();
  });

  it('marks a team with no games as new, without a fake 0-0 stat', () => {
    const d = describeRecord(rec({ wins: 0, losses: 0, completed: 0, noShows: 0, showRate: null, last5: [], streak: 0 }))!;
    expect(d.isNew).toBe(true);
    expect(d.showRate).toBeNull();
    expect(d.form).toEqual([]);
  });

  it('is not new once it has a no-show on record', () => {
    expect(describeRecord(rec({ wins: 0, losses: 0, completed: 0, noShows: 1, showRate: 0, last5: [] }))!.isNew).toBe(false);
  });

  it('writes an accessible summary that does not rely on colour', () => {
    const d = describeRecord(rec({ last5: ['W', 'L'] }))!;
    expect(d.summary).toContain('12 wins');
    expect(d.summary).toContain('4 losses');
    expect(d.summary).toContain('94% show rate');
    expect(d.summary).toContain('Last games, oldest to newest: loss, win');
  });
});
