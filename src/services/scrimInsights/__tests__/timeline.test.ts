import { describe, expect, it } from 'vitest';
import type { MatchTimeline, TimelineKill, TimelineRound } from '@/schemas/scrimTimeline';
import { matchHeatPoints, roundEvents } from '../timeline';

const kill = (ordinal: number, ms: number | null, killer: string | null, victim: string, extra: Partial<TimelineKill> = {}): TimelineKill => ({
  ordinal, ms, killer, victim, assistants: [], weapon: 'w', type: 'Weapon', victimX: 100, victimY: 200, positions: [], ...extra,
});
const round = (over: Partial<TimelineRound> = {}): TimelineRound => ({
  num: 1, won: true, myRole: 'attack', resultCode: 'Elimination', plantSite: null, plantMs: null, plantX: null, plantY: null, planter: null, defused: false, defuseMs: null,
  defuseX: null, defuseY: null, defuser: null, kills: [], ...over,
});
const TIMELINE: MatchTimeline = {
  players: [{ key: 'p1', name: 'A1', agent: null, mine: true }, { key: 'p2', name: 'A2', agent: null, mine: true }, { key: 'p3', name: 'B1', agent: null, mine: false }],
  rounds: [
    round({ num: 1, plantSite: 'A', plantMs: 30000, plantX: 5, plantY: 6, planter: 'p1', kills: [
      kill(2, 9000, 'p3', 'p2'), kill(1, 5000, 'p1', 'p3', { positions: [{ key: 'p1', x: 10, y: 20, facing: 1 }, { key: 'p3', x: 99, y: 98, facing: null }] }) ] }),
    round({ num: 2, myRole: 'defense', won: false, kills: [kill(1, 4000, 'p3', 'p1', { victimX: 0, victimY: 0 })] }),
  ],
};

describe('timeline events', () => {
  it('orders a round’s kills, plant and defuse by time and gives every event an id', () => {
    const e = roundEvents(TIMELINE.rounds[0]);
    expect(e.map((x) => [x.kind, x.ms])).toEqual([['kill', 5000], ['kill', 9000], ['plant', 30000]]);
    expect(new Set(e.map((x) => x.id)).size).toBe(3);
  });

});

describe('match heatmap points', () => {
  it('uses the killer’s recorded position for kills and the victim’s for deaths, only for your team', () => {
    expect(matchHeatPoints(TIMELINE, 'kills', null)).toEqual([{ x: 10, y: 20, round: 1 }]);
    expect(matchHeatPoints(TIMELINE, 'deaths', null)).toEqual([{ x: 100, y: 200, round: 1 }]);
  });

  it('opening means the first kill of the round, side filters rounds, and plants use the plant position', () => {
    expect(matchHeatPoints(TIMELINE, 'opening_deaths', null)).toEqual([]);
    expect(matchHeatPoints(TIMELINE, 'kills', 'defense')).toEqual([]);
    expect(matchHeatPoints(TIMELINE, 'plants', 'attack')).toEqual([{ x: 5, y: 6, round: 1 }]);
    expect(matchHeatPoints(TIMELINE, 'opening_kills', null)).toEqual([{ x: 10, y: 20, round: 1 }]);
  });
});
