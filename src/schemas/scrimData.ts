import { z } from 'zod';

const ratio = z.number().nullable();
const side = z.object({ played: z.number(), won: z.number(), pct: ratio });
const record = z.object({ games: z.number(), wins: z.number() });
const tier = z.enum(['full', 'screenshot', 'score_only']);

const mapIntel = z.object({
  mapId: z.string(), map: z.string(), games: z.number(), wins: z.number(), winRatePct: ratio, winLowPct: ratio, winHighPct: ratio,
  roundsWon: z.number(), roundsLost: z.number(), roundWinRatePct: ratio, attack: side, defense: side, lastPlayed: z.string().nullable(),
  signal: z.enum(['strong', 'weak', 'typical', 'insufficient_sample']),
});

const composition = z.object({
  agents: z.array(z.string()), games: z.number(), wins: z.number(), winRatePct: ratio, roundWinRatePct: ratio, attack: side, defense: side,
  maps: z.array(z.object({ map: z.string(), games: z.number(), wins: z.number() })), lastPlayed: z.string().nullable(),
});

const player = z.object({
  userId: z.string(), name: z.string().nullable(), games: z.number(), wins: z.number(), fullGames: z.number(), screenshotGames: z.number(),
  winRatePct: ratio, kd: ratio, kda: ratio, kdaGames: z.number(), acs: ratio, adr: ratio, statGames: z.number(), hsPct: ratio,
  firstKills: z.number(), firstDeaths: z.number().nullable(), firstDeathGames: z.number(), plants: z.number(), defuses: z.number(),
  agents: z.array(z.object({ characterId: z.string(), games: z.number() })),
});

const lineup = z.object({
  userIds: z.array(z.string()), names: z.array(z.string().nullable()), complete: z.boolean(), games: z.number(), wins: z.number(),
  winRatePct: ratio, roundWinRatePct: ratio, lastPlayed: z.string().nullable(),
});

/** Validates the response at the boundary; anything unexpected becomes an error state, never a half-drawn page. */
export const scrimDataSchema = z.object({
  teamId: z.string(),
  coverage: z.object({
    maps: z.number(), full: z.number(), screenshot: z.number(), scoreOnly: z.number(), riotPending: z.number(),
    riotNotVerified: z.number(), awaitingConfirmation: z.number(), disputed: z.number(),
  }),
  hasData: z.boolean(), truncated: z.boolean(), minMapSample: z.number(),
  sample: z.object({ maps: z.number(), from: z.string().nullable(), to: z.string().nullable() }),
  record: z.object({
    games: z.number(), wins: z.number(), losses: z.number(), draws: z.number(), winRatePct: ratio, winLowPct: ratio, winHighPct: ratio,
    roundsWon: z.number(), roundsLost: z.number(), roundWinRatePct: ratio,
  }),
  form: z.array(z.enum(['W', 'L', 'D'])),
  activity: z.array(z.object({ month: z.string(), games: z.number(), wins: z.number() })),
  maps: z.array(mapIntel), unplayedMaps: z.array(z.string()), compositions: z.array(composition), players: z.array(player),
  roster: z.object({
    lineups: z.array(lineup),
    stability: z.object({ distinctLineups: z.number(), completeLineups: z.number(), mostUsedSharePct: ratio, playersUsed: z.number(), gamesWithKnownPlayers: z.number() }),
    substitutes: z.object({ gamesWith: z.number(), winsWith: z.number(), winRateWithPct: ratio, gamesWithout: z.number(), winsWithout: z.number(), winRateWithoutPct: ratio }),
    pairs: z.array(z.object({ names: z.array(z.string().nullable()), together: record, firstWithoutSecond: record, secondWithoutFirst: record })),
  }),
  recent: z.array(z.object({
    sessionId: z.string(), gameNumber: z.number(), playedAt: z.string().nullable(), map: z.string().nullable(), opponent: z.string().nullable(),
    result: z.enum(['win', 'loss', 'draw']), roundsWon: z.number().nullable(), roundsLost: z.number().nullable(), tier,
  })),
});
