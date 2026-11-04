import type { Route } from '../mockFetch';
import { DAY, ME, TEAMS, iso } from './common';
import { catalogRoutes } from './discovery';

const rate = (count: number, of: number) => ({ count, of, pct: of ? Math.round((count / of) * 1000) / 10 : null });
const side = (won: number, played: number) => ({ played, won, pct: played ? Math.round((won / played) * 1000) / 10 : null });

const ROSTER = [
  { id: 'u-captain', name: 'Hex', agent: '8e253930-4c05-31dd-1b6c-968525494517', acs: 231, kd: 1.18, adr: 148, hs: 27.4, kast: 74.1, rating: 71 },
  { id: 'u-raze', name: 'Raze', agent: 'add6443a-41bd-e414-f6ad-e58d267f4e95', acs: 262, kd: 1.31, adr: 166, hs: 31.2, kast: 71.8, rating: 78 },
  { id: 'u-kilo', name: 'Kilo', agent: '320b2a48-4d9b-a075-30f1-1f93a9b638fa', acs: 204, kd: 1.04, adr: 132, hs: 22.8, kast: 76.5, rating: 64 },
  { id: 'u-mara', name: 'Mara', agent: '1e58de9c-4950-5125-93e9-a0aee9f98746', acs: 189, kd: 0.98, adr: 124, hs: 25.1, kast: 77.2, rating: 61 },
  { id: 'u-tide', name: 'Tide', agent: '6f2a04ca-43e0-be17-7f36-b3908627744d', acs: 196, kd: 1.02, adr: 129, hs: 19.6, kast: 79.4, rating: 66 },
];

const OPP = [TEAMS.crimson, TEAMS.neon, TEAMS.tigers, TEAMS.orbit, TEAMS.bloom];
const MAPS = ['Ascent', 'Lotus', 'Bind', 'Haven', 'Sunset', 'Icebox', 'Split'];
// 18 confirmed maps, oldest first: 12 wins, 6 losses.
const RESULTS = 'WLWWLWWWLWLWWWLWWW'.split('') as Array<'W' | 'L'>;
const ROUNDS: Array<[number, number]> = RESULTS.map((r, i) => (r === 'W' ? [13, 6 + (i % 5)] : [7 + (i % 4), 13]));
const RATING_BY_MAP = [52, 49, 55, 58, 54, 60, 62, 65, 61, 64, 60, 66, 69, 71, 67, 70, 73, 74];

function seriesPoint(i: number) {
  const [w, l] = ROUNDS[i];
  return {
    index: i + 1, date: iso(-(RESULTS.length - i) * 2 * DAY), map: MAPS[i % MAPS.length], opponent: OPP[i % OPP.length].name,
    result: RESULTS[i] === 'W' ? 'win' : 'loss', roundsWon: w, roundsLost: l, roundWinPct: Math.round((w / (w + l)) * 1000) / 10,
    teamAcs: 200 + ((i * 7) % 40), teamAdr: 128 + ((i * 5) % 30), firstBloodPct: 48 + ((i * 3) % 14), pistolWon: i % 3 !== 0,
  };
}

function playerRow(p: (typeof ROSTER)[number], i: number) {
  return {
    userId: p.id, name: p.name, maps: 18, rounds: 378, acs: p.acs, adr: p.adr, kd: p.kd, kast: p.kast, hsPct: p.hs,
    kills: 290 + i * 12, deaths: 250 + i * 6, assists: 110 + i * 9, firstKills: 52 - i * 5, firstDeaths: 40 - i * 3,
    multi2: 44, multi3: 13, multi4: 4, multi5: i === 1 ? 2 : 0, plants: 14 + i, defuses: 6 + i, acsSd: 38,
    agents: [{ agent: p.agent, maps: 15 }, { agent: '707eab51-4836-f488-046a-cda6bf494859', maps: 3 }],
  };
}

const coachTeam = {
  trades: { deaths: 1210, traded: 498, tradeKills: 470 }, led: rate(160, 220), trailed: rate(70, 158),
  clutches: [{ versus: 1, attempts: 30, wins: 17 }, { versus: 2, attempts: 18, wins: 6 }],
  postPlant: rate(88, 120), postPlantBySite: [{ site: 'A', won: rate(40, 54) }, { site: 'B', won: rate(48, 66) }],
  noPlantOnAttack: rate(12, 60), retake: rate(30, 88), retakeBySite: [{ site: 'A', won: rate(14, 40) }],
  afterPistolWin: rate(40, 52), afterPistolLoss: rate(12, 40), antiEco: rate(44, 50), ecoUpsets: rate(9, 40),
  loadoutAhead: rate(120, 170), loadoutBehind: rate(50, 130), avgFirstKillMs: 21_400, slowRounds: rate(20, 60),
  players: ROSTER.map((p) => ({
    userId: p.id, name: p.name, maps: 18, deaths: 250, traded: 100, untradedFirstDeaths: 20, tradeKills: 95,
    clutchAttempts: 10, clutchWins: 4, entryDuels: 60, entryWins: 34, multiKillRounds: 50, multiKillRoundsWon: 38,
  })),
};

export function teamReport() {
  const series = RESULTS.map((_, i) => seriesPoint(i));
  const mapsAgg = MAPS.map((m) => {
    const games = series.filter((s) => s.map === m);
    const wins = games.filter((g) => g.result === 'win').length;
    const rw = games.reduce((a, g) => a + g.roundsWon, 0);
    const rl = games.reduce((a, g) => a + g.roundsLost, 0);
    return { map: m, games: games.length, wins, roundsWon: rw, roundsLost: rl, roundWinPct: rw + rl ? Math.round((rw / (rw + rl)) * 1000) / 10 : null, attack: rate(Math.round(rw * 0.45), Math.round((rw + rl) / 2)), defense: rate(Math.round(rw * 0.55), Math.round((rw + rl) / 2)) };
  });
  return {
    teamId: ME.id, hasData: true, staff: true, viewerUserId: 'u-captain', maxMaps: 50,
    report: {
      sample: { maps: 18, from: series[0].date, to: series[series.length - 1].date, capped: false },
      wins: 12, losses: 6, winRatePct: 66.7, roundWinPct: 56.2, series, maps: mapsAgg,
      attack: rate(98, 189), defense: rate(115, 189), firstBloodRounds: rate(205, 378), winAfterFirstBlood: rate(150, 205), winAfterFirstDeath: rate(63, 173),
      pistol: rate(23, 36), buys: [{ buy: 'full', roundsWon: rate(160, 250) }, { buy: 'eco', roundsWon: rate(9, 40) }],
      players: ROSTER.map(playerRow), coach: coachTeam,
      highlights: [
        { kind: 'map_strength', tone: 'good', title: 'Ascent is your best map', detail: 'You won 3 of 3 there, with 62% of rounds.', playerId: null },
        { kind: 'retakes', tone: 'watch', title: 'Retakes on A are a weak spot', detail: 'You won 14 of 40 A retakes. Plan a default for after the plant.', playerId: null },
        { kind: 'entry', tone: 'good', title: 'Raze wins the opening duel', detail: '57% of first duels won across 18 maps.', playerId: 'u-raze' },
      ],
    },
    ratings: {
      team: { value: 74, change: 3.4, parts: [
        { key: 'win', label: 'Map wins', value: 66.7, score: 78, weight: 0.4 },
        { key: 'rounds', label: 'Round share', value: 56.2, score: 70, weight: 0.35 },
        { key: 'opening', label: 'Opening duels', value: 54.2, score: 71, weight: 0.25 },
      ] },
      players: ROSTER.map((p) => ({ userId: p.id, rating: { value: p.rating, change: 1.2, parts: [] } })),
      byMap: RATING_BY_MAP.map((value, i) => ({ index: i + 1, value })),
    },
  };
}

export function scrimData() {
  const recent = RESULTS.map((r, i) => ({
    sessionId: `s-h${i}`, gameNumber: 1 + (i % 2), playedAt: iso(-(RESULTS.length - i) * 2 * DAY), map: MAPS[i % MAPS.length],
    opponent: OPP[i % OPP.length].name, result: r === 'W' ? 'win' : 'loss', roundsWon: ROUNDS[i][0], roundsLost: ROUNDS[i][1], tier: 'full',
  })).reverse();
  const maps = MAPS.map((m, i) => ({
    mapId: `m-${m.toLowerCase()}`, map: m, games: 3 - (i % 2), wins: 2 - (i % 3 === 2 ? 1 : 0), winRatePct: 66.7, winLowPct: 30, winHighPct: 90,
    roundsWon: 33, roundsLost: 24, roundWinRatePct: 57.9, attack: side(15, 28), defense: side(18, 29), lastPlayed: iso(-i * DAY),
    signal: i === 0 ? 'strong' : i === 2 ? 'weak' : 'typical',
  }));
  return {
    teamId: ME.id,
    coverage: { maps: 18, full: 16, screenshot: 2, scoreOnly: 0, riotPending: 0, riotNotVerified: 0, awaitingConfirmation: 0, disputed: 0, queueGames: 0 },
    hasData: true, truncated: false, minMapSample: 3, sample: { maps: 18, from: recent[recent.length - 1].playedAt, to: recent[0].playedAt },
    record: { games: 18, wins: 12, losses: 6, draws: 0, winRatePct: 66.7, winLowPct: 44, winHighPct: 84, roundsWon: 213, roundsLost: 166, roundWinRatePct: 56.2 },
    form: ['W', 'W', 'W', 'L', 'W'], activity: [{ month: '2026-10', games: 12, wins: 8 }, { month: '2026-11', games: 6, wins: 4 }],
    maps, unplayedMaps: ['Abyss', 'Pearl'], compositions: [], players: ROSTER.map((p) => ({
      userId: p.id, name: p.name, games: 18, wins: 12, fullGames: 16, screenshotGames: 2, winRatePct: 66.7, kd: p.kd, kda: p.kd + 0.4, kdaGames: 18,
      acs: p.acs, adr: p.adr, statGames: 16, hsPct: p.hs, firstKills: 40, firstDeaths: 30, firstDeathGames: 16, plants: 14, defuses: 6, agents: [],
    })),
    agents: [], playerAgents: [],
    roster: {
      lineups: [], stability: { distinctLineups: 1, completeLineups: 1, mostUsedSharePct: 100, playersUsed: 5, gamesWithKnownPlayers: 18 },
      substitutes: { gamesWith: 0, winsWith: 0, winRateWithPct: null, gamesWithout: 18, winsWithout: 12, winRateWithoutPct: 66.7 }, pairs: [],
    },
    recent,
  };
}

export const insightsRoutes: Route[] = [
  ...catalogRoutes,
  [/^\/api\/scrims\/teams\/[^/]+\/data/, () => scrimData()],
  [/^\/api\/scrims\/teams\/[^/]+\/report/, () => teamReport()],
  [/^\/api\/scrims\/up-next/, () => ({ items: [], total: 0 })],
  [/^\/api\/scrims\/teams\/[^/]+\/map-picks/, () => []],
];
