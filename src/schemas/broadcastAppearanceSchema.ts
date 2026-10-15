import { z } from 'zod';
const teamAppearance = z.object({ displayName: z.string().max(80).refine(value => [...value].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127 && !'<>'.includes(char)), 'Use a plain display name without markup.').nullable().optional(), color: z.string().regex(/^#[\da-f]{6}$/i).nullable().optional() });
export const broadcastAppearanceSchema = z.object({
  pack: z.literal('esportra').default('esportra'),
  bannerTheme: z.enum(['broadcast', 'compact', 'monument', 'impact']).default('broadcast'),
  teamColors: z.boolean().default(true), eventBug: z.boolean().default(true),
  sponsorRotation: z.boolean().default(true), sponsorSeconds: z.number().int().min(5, 'Sponsor logos need at least 5 seconds each.').max(120, 'Choose at most 120 seconds per sponsor.').default(8),
  matches: z.record(z.string().uuid(), z.tuple([teamAppearance, teamAppearance])).nullable().default({}),
  revision: z.number().int().min(0).max(2147483647).default(0),
  stingerName: z.string().trim().min(1, 'Enter the Stinger transition name from OBS.').max(256).refine(value => [...value].every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127), 'Remove control characters.').nullable().default(null),
});
export type BroadcastAppearance = z.infer<typeof broadcastAppearanceSchema>;
export const DEFAULT_APPEARANCE = broadcastAppearanceSchema.parse({});
