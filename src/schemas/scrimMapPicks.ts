import { z } from 'zod';

const ratio = z.number().nullable();

/** Validates the map picks response at the boundary. */
export const scrimMapPicksSchema = z.object({
  teamId: z.string(),
  hasData: z.boolean(),
  truncated: z.boolean(),
  picks: z.object({
    vetoes: z.number(),
    unattributed: z.number(),
    maps: z.array(z.object({
      map: z.string(), youPicked: z.number(), youBanned: z.number(), theyPicked: z.number(), theyBanned: z.number(), decider: z.number(), played: z.number(),
    })),
    byPicker: z.array(z.object({
      pickedBy: z.enum(['you', 'opponent', 'decider']), games: z.number(), wins: z.number(), winRatePct: ratio,
      roundsWon: z.number(), roundsLost: z.number(), roundWinRatePct: ratio,
    })),
    yourSideChoices: z.array(z.object({ side: z.string(), count: z.number() })),
  }),
});

export type ScrimMapPicks = z.infer<typeof scrimMapPicksSchema>;
