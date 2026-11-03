import { z } from 'zod';

const num = z.number().nullable();
const rate = z.object({ count: z.number(), of: z.number(), pct: num });

const player = z.object({
  key: z.string(), name: z.string(), tag: z.string().nullable(), agent: z.string().nullable(), mine: z.boolean(), slot: z.number().nullable(),
  rounds: z.number(), kills: z.number(), deaths: z.number(), assists: z.number(), acs: num, adr: num, hsPct: num, bodyPct: num, legPct: num,
  kd: num, kast: num, firstKills: z.number(), firstDeaths: z.number(), k2: z.number(), k3: z.number(), k4: z.number(), k5: z.number(),
  plants: z.number(), defuses: z.number(), damage: z.number(), damageReceived: z.number(), damageShare: num, killShare: num, damagePerKill: num,
});

const round = z.object({
  num: z.number(), won: z.boolean().nullable(), myRole: z.enum(['attack', 'defense']).nullable(), resultCode: z.string().nullable(),
  plantSite: z.string().nullable(), plantMs: z.number().nullable(), defused: z.boolean(), defuseMs: z.number().nullable(),
  firstKiller: z.string().nullable(), firstVictim: z.string().nullable(), firstBloodMine: z.boolean().nullable(), firstBloodMs: z.number().nullable(),
  myScore: z.number(), theirScore: z.number(), myLoadout: num, theirLoadout: num, myBuy: z.string().nullable(), theirBuy: z.string().nullable(), pistol: z.boolean(),
});

const count = z.object({ weapon: z.string(), rounds: z.number() });

export const reportSchema = z.object({
  players: z.array(player),
  rounds: z.array(round),
  streaks: z.object({ longestWin: z.number(), longestLoss: z.number() }),
  halves: z.object({ first: rate, second: rate, overtime: rate }),
  opening: z.object({
    players: z.array(z.object({ key: z.string(), kills: z.number(), deaths: z.number(), duelsWon: rate, avgMsToFirstKill: num, avgMsToFirstDeath: num })),
    winAfterFirstBlood: rate, winAfterFirstDeath: rate, firstBloodRounds: rate, attackFirstBlood: rate, defenseFirstBlood: rate,
  }),
  kills: z.array(z.object({
    round: z.number(), ordinal: z.number(), roundMs: z.number().nullable(), killer: z.string().nullable(), victim: z.string(),
    assistants: z.array(z.string()), killerMine: z.boolean(), weapon: z.string().nullable(), type: z.string().nullable().default(null), x: z.number().nullable(), y: z.number().nullable(),
  })),
  economy: z.object({
    winRateByBuy: z.array(z.object({ buy: z.string(), roundsWon: rate })), pistolRounds: rate, avgLoadoutMine: num, avgLoadoutTheirs: num,
    avgLoadoutInWonRounds: num, avgLoadoutInLostRounds: num, weapons: z.array(count), armor: z.array(count),
  }),
  abilities: z.array(z.object({ key: z.string(), grenade: num, ability1: num, ability2: num, ultimate: num, perRound: num })),
  objectives: z.object({
    byPlayer: z.array(z.object({ key: z.string(), plants: z.number(), defuses: z.number() })), sites: z.array(count),
    avgPlantMs: num, avgDefuseMs: num, winWhenPlanting: rate, winWhenOpponentPlants: rate,
  }),
  formulas: z.array(z.object({ id: z.string(), text: z.string() })),
});

/** Validates the per-map report at the boundary. A map without verified Riot data has `report: null` and says why. */
export const scrimGameInsightsSchema = z.object({
  sessionId: z.string(), gameNumber: z.number(), tier: z.enum(['full', 'screenshot', 'score_only']), reason: z.string().nullable(),
  myTeam: z.object({ id: z.string(), name: z.string() }), opponent: z.object({ id: z.string(), name: z.string() }),
  score: z.object({ mine: z.number(), theirs: z.number() }), result: z.enum(['win', 'loss', 'draw']), map: z.string().nullable(),
  match: z.object({ verification: z.string(), queueId: z.string().nullable(), isCustom: z.boolean().nullable(), startedAt: z.string().nullable(), lengthMs: z.number().nullable() }).nullable(),
  veto: z.object({ expectedMap: z.string(), pickedBy: z.enum(['you', 'opponent']).nullable(), isDecider: z.boolean(), order: z.number(), playedOnVetoMap: z.boolean() }).nullable(),
  report: reportSchema.nullable(),
});
