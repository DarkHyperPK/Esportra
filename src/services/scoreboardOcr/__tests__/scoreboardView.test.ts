import { describe, expect, it } from 'vitest';
import { pickMvpKey, plusMinus, presentColumns, rankByImpact } from '@/services/scoreboardOcr/scoreboardView';
import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';

const p = (puuid: string, kills: number, deaths: number, assists = 0, extra: Partial<ScoreboardPlayer> = {}): ScoreboardPlayer =>
  ({ puuid, gameName: puuid, kills, deaths, assists, ...extra });

describe('screenshot scoreboard view', () => {
  it('ranks by kills, then fewer deaths, then assists', () => {
    const ranked = rankByImpact([p('a', 15, 10), p('b', 21, 13), p('c', 15, 8), p('d', 15, 8, 4)]);
    expect(ranked.map((x) => x.puuid)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('names the MVP only when someone has a kill', () => {
    expect(pickMvpKey([p('a', 9, 15), p('b', 21, 13)])).toBe('b');
    expect(pickMvpKey([p('a', 0, 3)])).toBeNull();
  });

  it('shows only the columns the screenshot had', () => {
    expect(presentColumns([p('a', 1, 1, 0, { firstBloods: 2, plants: 1 }), p('b', 1, 1, 0, { defuses: 0 })])).toEqual(['firstBloods', 'plants', 'defuses']);
    expect(presentColumns([p('a', 1, 1)])).toEqual([]);
  });

  it('computes plus/minus', () => {
    expect(plusMinus(p('a', 21, 13))).toBe(8);
  });
});
