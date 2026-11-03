import { z } from 'zod';

const num = z.number().nullable();

const position = z.object({ key: z.string(), x: z.number(), y: z.number(), facing: num });

const kill = z.object({
  ordinal: z.number(), ms: num, killer: z.string().nullable(), victim: z.string(), assistants: z.array(z.string()), weapon: z.string().nullable(), type: z.string().nullable(),
  victimX: num, victimY: num, positions: z.array(position),
});

const round = z.object({
  num: z.number(), won: z.boolean().nullable(), myRole: z.enum(['attack', 'defense']).nullable(), resultCode: z.string().nullable(),
  plantSite: z.string().nullable(), plantMs: num, plantX: num, plantY: num, planter: z.string().nullable(), defused: z.boolean(), defuseMs: num, defuseX: num, defuseY: num,
  defuser: z.string().nullable(), kills: z.array(kill),
});

/** One map round by round with every position Riot recorded. Positions exist at kills, the plant and the defuse, not continuously. */
export const scrimTimelineSchema = z.object({
  sessionId: z.string(), gameNumber: z.number(), reason: z.string().nullable(), map: z.string().nullable().optional(), mapPath: z.string().nullable().optional(),
  result: z.enum(['win', 'loss', 'draw']).optional(), score: z.object({ mine: z.number(), theirs: z.number() }).optional(),
  timeline: z.object({
    players: z.array(z.object({ key: z.string(), name: z.string(), agent: z.string().nullable(), mine: z.boolean() })),
    rounds: z.array(round),
  }).nullable(),
});

export type ScrimTimelineResponse = z.infer<typeof scrimTimelineSchema>;
export type MatchTimeline = NonNullable<ScrimTimelineResponse['timeline']>;
export type TimelineRound = MatchTimeline['rounds'][number];
export type TimelineKill = TimelineRound['kills'][number];
export type TimelinePlayer = MatchTimeline['players'][number];
