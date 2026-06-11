import { describe, expect, it } from 'vitest';
import {
  formatPercent,
  formatStat,
  resolvePlayerAcs,
  resolvePlayerKdRatio,
  type ScoreboardPlayer,
} from '@/types/scoreboardPlayer';

describe('scoreboardPlayer helpers', () => {
  it('derives ACS from score and rounds when acs is missing', () => {
    const player: ScoreboardPlayer = { score: 4400, roundsPlayed: 22 };
    expect(resolvePlayerAcs(player)).toBe(200);
  });

  it('derives KD ratio when kdRatio is missing', () => {
    const player: ScoreboardPlayer = { kills: 18, deaths: 12 };
    expect(resolvePlayerKdRatio(player)).toBe(1.5);
  });

  it('formats missing stats as dash', () => {
    expect(formatStat(null)).toBe('-');
    expect(formatPercent(undefined)).toBe('-');
  });
});
