import { z } from 'zod';

/** Every fight of a team on one map, in Riot's coordinates at the victim's position. Spacing and trade only exist for the team's own deaths. */
export const scrimFightsSchema = z.object({
  teamId: z.string(), map: z.string().nullable(), side: z.string().nullable(), maps: z.number(), truncated: z.boolean(),
  availableMaps: z.array(z.object({ map: z.string(), maps: z.number() })),
  fights: z.array(z.object({ x: z.number(), y: z.number(), round: z.number(), side: z.string().nullable(), won: z.boolean(), nearestAlly: z.number().nullable(), traded: z.boolean().nullable() })),
});
export type ScrimFights = z.infer<typeof scrimFightsSchema>;
export type Fight = ScrimFights['fights'][number];
