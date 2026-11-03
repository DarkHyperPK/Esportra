import { z } from 'zod';

const num = z.number().nullable();

/** How the team is moving: a per-map series with trailing means, and the latest maps against the ones before. */
export const scrimTrendsSchema = z.object({
  teamId: z.string(), hasData: z.boolean(), maxMaps: z.number(),
  trends: z.object({
    sample: z.object({ maps: z.number(), from: z.string().nullable(), to: z.string().nullable(), capped: z.boolean() }),
    series: z.array(z.object({
      index: z.number(), date: z.string().nullable(), map: z.string().nullable(), result: z.string(), roundWinPct: num, teamAcs: num, firstKillPct: num, tradedPct: num,
      rollingRoundWinPct: num, rollingAcs: num,
    })),
    windows: z.array(z.object({
      label: z.string(), enough: z.boolean(), currentMaps: z.number(), previousMaps: z.number(),
      metrics: z.array(z.object({ key: z.string(), label: z.string(), current: num, previous: num, change: num, verdict: z.enum(['up', 'down', 'flat']) })),
    })),
  }),
});
export type ScrimTrends = z.infer<typeof scrimTrendsSchema>;
