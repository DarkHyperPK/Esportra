import { z } from 'zod';
import { scrimMapPicksSchema } from '@/schemas/scrimMapPicks';

const num = z.number().nullable();

const opponent = z.object({
  opponentId: z.string(), name: z.string(), maps: z.number(), wins: z.number(), losses: z.number(), winRatePct: num, roundsWon: z.number(), roundsLost: z.number(), roundWinPct: num,
  firstPlayed: z.string().nullable(), lastPlayed: z.string().nullable(),
  mapsPlayed: z.array(z.object({ map: z.string(), games: z.number(), wins: z.number() })),
  meetings: z.array(z.object({
    sessionId: z.string(), gameNumber: z.number(), playedAt: z.string().nullable(), map: z.string().nullable(), result: z.enum(['win', 'loss', 'draw']),
    roundsWon: num, roundsLost: num, tier: z.string(), agents: z.array(z.string()),
  })),
  veto: scrimMapPicksSchema.shape.picks,
});

/** Scrim partners as teams. Team-level only: nothing about the other team's players. */
export const scrimOpponentsSchema = z.object({ teamId: z.string(), hasData: z.boolean(), opponents: z.array(opponent) });
export type ScrimOpponents = z.infer<typeof scrimOpponentsSchema>;
export type OpponentRow = ScrimOpponents['opponents'][number];
