import { z } from 'zod';

const ratio = z.number().nullable();
const sample = z.object({ matches: z.number(), rounds: z.number(), from: z.string().nullable(), to: z.string().nullable() });

const agent = z.object({ characterId: z.string(), matches: z.number(), wins: z.number(), winRatePct: ratio, kd: ratio, acs: ratio });
const mapLine = z.object({ mapId: z.string(), map: z.string(), matches: z.number(), wins: z.number(), winRatePct: ratio });
const teamLine = z.object({
  teamId: z.string().nullable(), teamName: z.string().nullable(), matches: z.number(), wins: z.number(),
  firstPlayed: z.string().nullable(), lastPlayed: z.string().nullable(),
});
const month = z.object({ month: z.string(), matches: z.number(), wins: z.number() });

const playerTotals = z.object({
  matches: z.number(), scrimMatches: z.number(), tournamentMatches: z.number(), wins: z.number(), losses: z.number(), draws: z.number(),
  winRatePct: ratio, rounds: z.number(), kills: z.number(), deaths: z.number(), assists: z.number(),
  kd: ratio, kda: ratio, acs: ratio, adr: ratio, headshotSharePct: ratio,
  killsPerRound: ratio, deathsPerRound: ratio, assistsPerRound: ratio,
  firstKills: z.number(), firstDeaths: z.number(),
  multiKills: z.object({ k2: z.number(), k3: z.number(), k4: z.number(), k5: z.number() }),
  plants: z.number(), defuses: z.number(),
});

const teamTotals = z.object({
  matches: z.number(), scrimMatches: z.number(), tournamentMatches: z.number(), wins: z.number(), losses: z.number(), draws: z.number(),
  winRatePct: ratio, roundsPlayed: z.number(), roundsWon: z.number(), roundsLost: z.number(), roundWinRatePct: ratio,
  avgRoundsWon: ratio, avgRoundsLost: ratio, killsPerRound: ratio, deathsPerRound: ratio, damagePerRound: ratio,
  firstKillRatePct: ratio, firstDeathRatePct: ratio,
});

/** A viewer who may not see a player's stats gets only `access: 'none'`. */
export const playerCareerSchema = z.union([
  z.object({ access: z.literal('none') }),
  z.object({
    access: z.enum(['self', 'admin', 'team_staff', 'public']),
    scope: z.enum(['all', 'your_teams', 'public']),
    hasData: z.boolean(), truncated: z.boolean(), sample, totals: playerTotals,
    agents: z.array(agent), maps: z.array(mapLine), teams: z.array(teamLine), activity: z.array(month),
  }),
]);

export const teamCareerSchema = z.object({
  access: z.enum(['member', 'public']),
  includesScrims: z.boolean(), hasData: z.boolean(), truncated: z.boolean(), sample, totals: teamTotals,
  form: z.array(z.enum(['W', 'L', 'D'])), maps: z.array(mapLine), activity: z.array(month),
  players: z.array(z.object({ userId: z.string(), username: z.string().nullable(), matches: z.number(), lastPlayed: z.string().nullable() })),
});

const game = z.object({
  startedAt: z.string().nullable(),
  context: z.enum(['scrim', 'tournament']),
  scrimSessionId: z.string().nullable(), tournamentMatchId: z.string().nullable(), gameNumber: z.number().nullable(),
  map: z.string().nullable(), opponentName: z.string().nullable(),
  result: z.enum(['win', 'loss', 'draw']), roundsWon: z.number().nullable(), roundsLost: z.number().nullable(),
  characterId: z.string().nullable().optional(), teamName: z.string().nullable().optional(),
  kills: z.number().optional(), deaths: z.number().optional(), assists: z.number().optional(),
  acs: z.number().nullable().optional(), adr: z.number().nullable().optional(), headshotSharePct: z.number().nullable().optional(),
});

export const careerGamesPageSchema = z.object({
  access: z.string(),
  matches: z.array(game),
  nextBefore: z.string().nullable().default(null),
  hasMore: z.boolean().default(false),
});
