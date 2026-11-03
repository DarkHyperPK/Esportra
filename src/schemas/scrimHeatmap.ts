import { z } from 'zod';

/** Recorded event positions for a team, in Riot's own coordinates. Positions at the moments Riot recorded, never movement. */
export const scrimHeatmapSchema = z.object({
  teamId: z.string(), map: z.string().nullable(), kind: z.string(), side: z.string().nullable(), maps: z.number(), truncated: z.boolean(),
  availableMaps: z.array(z.object({ map: z.string(), maps: z.number() })),
  points: z.array(z.object({ x: z.number(), y: z.number(), round: z.number(), side: z.string().nullable() })),
});
export type ScrimHeatmap = z.infer<typeof scrimHeatmapSchema>;
