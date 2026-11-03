import { describe, expect, it } from 'vitest';
import { coachGroups, fromMap, type CoachView } from '../coach';

const r = (count: number, of: number) => ({ count, of, pct: of ? Math.round((1000 * count) / of) / 10 : null });
const none = r(0, 0);

const view = (over: Partial<CoachView> = {}): CoachView => ({
  trades: { deaths: 10, traded: 4, tradeKills: 3 }, led: none, trailed: none, postPlant: none, postPlantBySite: [], noPlant: none, retake: none, retakeBySite: [],
  afterPistolWin: none, afterPistolLoss: none, antiEco: none, ecoUpsets: none, loadoutAhead: none, loadoutBehind: none, slow: none, avgFirstKillMs: null, clutches: [], ...over,
});

describe('coach groups', () => {
  it('leaves out every question with no rounds behind it instead of showing zeros', () => {
    expect(coachGroups(view()).map((g) => g.title)).toEqual(['Players alive']);
    expect(coachGroups(view({ trades: { deaths: 0, traded: 0, tradeKills: 0 } }))).toEqual([]);
  });

  it('groups spike, players alive, economy, clutches and tempo, each row with its sample', () => {
    const groups = coachGroups(view({
      postPlant: r(6, 10), postPlantBySite: [{ site: 'A', won: r(4, 5) }], retake: r(2, 8), antiEco: r(5, 6), clutches: [{ versus: 1, attempts: 4, wins: 2 }, { versus: 2, attempts: 3, wins: 0 }], slow: r(3, 5),
    }));
    expect(groups.map((g) => g.title)).toEqual(['Spike', 'Players alive', 'Economy', 'Clutches', 'Tempo']);
    expect(groups[0].rows.map((x) => [x.label, x.rate.count, x.rate.of])).toEqual([['Won after you planted', 6, 10], ['Planted on A', 4, 5], ['Won when the opponent planted', 2, 8]]);
    expect(groups[1].rows[0]).toMatchObject({ label: 'Deaths avenged within 5 s', rate: { count: 4, of: 10, pct: 40 } });
    expect(groups[3].rows.map((x) => x.label)).toEqual(['1v1 situations', '1v2 situations']);
  });

  it('turns a map’s clutch list into per-opponent-count rows', () => {
    const map = fromMap({
      trades: { deaths: 3, traded: 1, tradeKills: 1 }, ledRounds: r(2, 2), trailedRounds: r(0, 1), postPlant: none, postPlantBySite: [], noPlantOnAttack: none, retake: none, retakeBySite: [],
      afterPistolWin: none, afterPistolLoss: none, antiEco: none, ecoUpsets: none, loadoutAhead: none, loadoutBehind: none, slowRounds: none, avgFirstKillMs: 4000,
      clutches: [{ versus: 1, won: true }, { versus: 1, won: false }, { versus: 2, won: false }],
    });
    expect(map.clutches).toEqual([{ versus: 1, attempts: 2, wins: 1 }, { versus: 2, attempts: 1, wins: 0 }]);
    expect(map.led).toEqual(r(2, 2));
  });
});
