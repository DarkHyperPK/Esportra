import { z } from 'zod';

const num = z.number().nullable();
const rate = z.object({ count: z.number(), of: z.number(), pct: num });

const sample = z.object({ maps: z.number(), from: z.string().nullable(), to: z.string().nullable(), capped: z.boolean() });

export const highlightSchema = z.object({
  kind: z.string(), tone: z.enum(['good', 'watch', 'neutral']), title: z.string(), detail: z.string(), playerId: z.string().nullable(),
});

export const playerRowSchema = z.object({
  userId: z.string(), name: z.string().nullable(), maps: z.number(), rounds: z.number(), acs: num, adr: num, kd: num, kast: num, hsPct: num,
  kills: z.number(), deaths: z.number(), assists: z.number(), firstKills: z.number(), firstDeaths: z.number(),
  multi2: z.number(), multi3: z.number(), multi4: z.number(), multi5: z.number(), plants: z.number(), defuses: z.number(), acsSd: num,
  agents: z.array(z.object({ agent: z.string(), maps: z.number() })),
});

const seriesPoint = z.object({
  index: z.number(), date: z.string().nullable(), map: z.string().nullable(), opponent: z.string(), result: z.string(),
  roundsWon: z.number(), roundsLost: z.number(), roundWinPct: num, teamAcs: num, teamAdr: num, firstBloodPct: num, pistolWon: z.boolean().nullable(),
});

const teamMap = z.object({ map: z.string(), games: z.number(), wins: z.number(), roundsWon: z.number(), roundsLost: z.number(), roundWinPct: num, attack: rate, defense: rate });

const teamReport = z.object({
  sample, wins: z.number(), losses: z.number(), winRatePct: num, roundWinPct: num, series: z.array(seriesPoint), maps: z.array(teamMap),
  attack: rate, defense: rate, firstBloodRounds: rate, winAfterFirstBlood: rate, winAfterFirstDeath: rate, pistol: rate,
  buys: z.array(z.object({ buy: z.string(), roundsWon: rate })), players: z.array(playerRowSchema), highlights: z.array(highlightSchema),
});

/** The team report and who may see which players. A regular member gets their own row only. */
export const scrimTeamReportSchema = z.object({
  teamId: z.string(), hasData: z.boolean(), staff: z.boolean(), viewerUserId: z.string(), maxMaps: z.number(), report: teamReport,
});

const slice = z.object({ key: z.string(), maps: z.number(), wins: z.number(), winRatePct: num, acs: num, kd: num, rounds: z.number() });

const playerReport = z.object({
  sample, summary: playerRowSchema,
  series: z.array(z.object({
    index: z.number(), date: z.string().nullable(), map: z.string().nullable(), agent: z.string().nullable(), result: z.string(), rounds: z.number(),
    acs: num, adr: num, kills: z.number(), deaths: z.number(), assists: z.number(), kd: num, kast: num, hsPct: num, firstKills: z.number(), firstDeaths: z.number(),
  })),
  byMap: z.array(slice), byAgent: z.array(slice),
  hits: z.object({ head: z.number(), body: z.number(), leg: z.number(), headPct: num, bodyPct: num, legPct: num }),
  comparison: z.object({ teamAcs: num, acsVsTeam: num, last5Acs: num, previous5Acs: num, acsChange: num }),
  highlights: z.array(highlightSchema),
});

export const scrimPlayerReportSchema = z.object({
  teamId: z.string(), userId: z.string(), hasData: z.boolean(), reason: z.string().nullable(), report: playerReport.nullable(),
});
