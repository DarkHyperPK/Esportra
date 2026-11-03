import { describe, expect, it } from 'vitest';
import type { Fight } from '@/schemas/scrimFights';
import { MIN_ZONE_FIGHTS, ISOLATED_UNITS, spacingOf, spacingSentence, zonesOf } from '../fights';

// across = y * 0.001, down = x * 0.001, so x/y in thousands land directly on the 0..1 map.
const T = { xMultiplier: 0.001, yMultiplier: 0.001, xScalarToAdd: 0, yScalarToAdd: 0 };
const fight = (x: number, y: number, won: boolean, extra: Partial<Fight> = {}): Fight => ({ x, y, round: 1, side: 'attack', won, nearestAlly: null, traded: null, ...extra });

describe('zonesOf', () => {
  it('groups fights into the eighth of the map they happened in and calls a zone by its win share', () => {
    const zones = zonesOf([
      fight(100, 100, true), fight(110, 120, true), fight(120, 90, false),          // down 0.1, across 0.1 -> zone (0,0): 2 won, 1 lost -> 67% good
      fight(900, 900, false), fight(910, 905, false), fight(920, 880, true),        // zone (7,7): 1 won, 2 lost -> 33% bad
      fight(500, 500, true), fight(510, 505, false), fight(520, 500, true), fight(530, 510, false), // zone (4,4): 2/2 -> even
    ], T);
    const at = (c: number, r: number) => zones.find((z) => z.col === c && z.row === r);
    expect(at(0, 0)).toMatchObject({ won: 2, lost: 1, fights: 3, tone: 'good' });
    expect(at(7, 7)).toMatchObject({ won: 1, lost: 2, tone: 'bad' });
    expect(at(4, 4)).toMatchObject({ won: 2, lost: 2, tone: 'even' });
  });

  it('leaves out zones under the minimum and fights it cannot place', () => {
    expect(MIN_ZONE_FIGHTS).toBe(3);
    expect(zonesOf([fight(100, 100, true), fight(110, 100, false)], T)).toEqual([]);
    expect(zonesOf([fight(100, 100, true), fight(100, 100, true), fight(100, 100, true)], undefined)).toEqual([]);
  });
});

describe('spacing', () => {
  const far = ISOLATED_UNITS + 1;
  const deaths = [
    fight(0, 0, false, { nearestAlly: far, traded: false }), fight(0, 0, false, { nearestAlly: far, traded: false }), fight(0, 0, false, { nearestAlly: far + 500, traded: true }),
    fight(0, 0, false, { nearestAlly: 400, traded: true }), fight(0, 0, false, { nearestAlly: 900, traded: false }),
    fight(0, 0, true), fight(0, 0, false, { nearestAlly: null, traded: false }),
  ];

  it('counts isolated and supported deaths and what went untraded in each, ignoring wins and deaths with no teammate position', () => {
    expect(spacingOf(deaths)).toEqual({ deaths: 5, isolated: 3, isolatedUntraded: 2, supported: 2, supportedUntraded: 1 });
  });

  it('says it in one sentence, and says nothing for a thin sample', () => {
    expect(spacingSentence(spacingOf(deaths))).toBe('3 of 5 deaths (60%) had no teammate within 15 m. 2 of those 3 went untraded, against 1 of 2 when a teammate was close.');
    expect(spacingSentence(spacingOf(deaths.slice(0, 3)))).toBeNull();
  });
});
