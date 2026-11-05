import { z } from 'zod';

export const adminRegionSchema = z.object({ region: z.string(), players: z.number(), avgTier: z.number() });
export const adminDaySchema = z.object({
  day: z.string(), sessionsStarted: z.number(), swipesRight: z.number(), swipesLeft: z.number(), matches: z.number(),
});

export const adminOverviewSchema = z.object({
  flag: z.object({ id: z.string(), enabled: z.boolean() }).nullable(),
  live: z.object({ activePlayers: z.number(), byRegion: z.array(adminRegionSchema) }),
  totals: z.object({
    days: z.number(), sessionsStarted: z.number(), swipesRight: z.number(), swipesLeft: z.number(),
    matches: z.number(), matchRate: z.number(),
  }),
  series: z.array(adminDaySchema),
});
export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminDay = z.infer<typeof adminDaySchema>;

export const adminSessionSchema = z.object({
  userId: z.string(), username: z.string().nullable().optional(), region: z.string(), competitiveTier: z.number(),
  micOn: z.boolean(), slotsNeeded: z.number(), startedAt: z.string(), lastHeartbeat: z.string(),
  likesSent: z.number(), passesSent: z.number(),
});
export type AdminSession = z.infer<typeof adminSessionSchema>;

export const adminMatchSchema = z.object({
  id: z.string(), matchedAt: z.string(), conversationId: z.string().nullable().optional(),
  user1Id: z.string(), user1Username: z.string().nullable().optional(),
  user2Id: z.string(), user2Username: z.string().nullable().optional(),
});
export type AdminMatch = z.infer<typeof adminMatchSchema>;
