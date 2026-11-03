import { describe, expect, it } from 'vitest';
import type { RecentMap } from '@/types/scrimData';
import { filterHistory, historyOptions, historySummary } from '../history';

const m = (map: string, opponent: string, result: RecentMap['result'], won: number | null, lost: number | null): RecentMap =>
  ({ sessionId: `${map}${opponent}${won}`, gameNumber: 1, playedAt: null, map, opponent, result, roundsWon: won, roundsLost: lost, tier: 'full' });
const MAPS = [m('Haven', 'Omega', 'win', 13, 9), m('Lotus', 'Omega', 'loss', 8, 13), m('Haven', 'Nova', 'loss', 11, 13), m('Haven', 'Nova', 'win', 13, 4)];

describe('match history', () => {
  it('filters by map, opponent and result together, keeping the order', () => {
    expect(filterHistory(MAPS, { map: 'Haven', opponent: '', result: '' })).toHaveLength(3);
    expect(filterHistory(MAPS, { map: 'Haven', opponent: 'Nova', result: 'win' })).toEqual([MAPS[3]]);
    expect(filterHistory(MAPS, { map: '', opponent: '', result: '' })).toEqual(MAPS);
  });

  it('offers maps and opponents most played first, and sums record and round difference', () => {
    expect(historyOptions(MAPS)).toEqual({ maps: ['Haven', 'Lotus'], opponents: ['Nova', 'Omega'] });
    expect(historySummary(filterHistory(MAPS, { map: 'Haven', opponent: '', result: '' }))).toEqual({ wins: 2, losses: 1, draws: 0, roundDiff: 4 + -2 + 9 });
  });
});
