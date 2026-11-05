import { z } from 'zod';

/** Form input for entering the Queue Now deck. */
export const startQueueSchema = z.object({
  micOn: z.boolean(),
  slotsNeeded: z.number().int().min(1).max(4),
});
export type StartQueueInput = z.infer<typeof startQueueSchema>;

const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

export const queueSessionSchema = z.object({
  id: z.string(),
  region: z.string(),
  competitiveTier: z.number(),
  micOn: z.boolean(),
  slotsNeeded: z.number(),
});
export type QueueSession = z.infer<typeof queueSessionSchema>;

export const synergyLabelSchema = z.enum(['great_synergy', 'role_overlap', 'unknown']);
export type SynergyLabel = z.infer<typeof synergyLabelSchema>;

export const queueCardSchema = z.object({
  userId: z.string(),
  username: z.string(),
  avatarSeed: nullableString,
  avatarUrl: nullableString,
  avatarStyle: nullableString,
  competitiveTier: z.number(),
  competitiveTierName: nullableString,
  winRate: nullableNumber,
  kdRatio: nullableNumber,
  hsPct: nullableNumber,
  matchesAnalyzed: z.number(),
  riotGameName: nullableString,
  riotTagLine: nullableString,
  regionDisplayName: nullableString,
  popularAgents: nullableString,
  micOn: z.boolean(),
  slotsNeeded: z.number(),
  synergyLabel: synergyLabelSchema.catch('unknown'),
  synergyScore: z.number(),
  likedYou: z.boolean(),
});
export type QueueCard = z.infer<typeof queueCardSchema>;

export const queueMatchSchema = z.object({
  matchId: z.string(),
  conversationId: nullableString,
  matchedAt: z.string(),
  matchedUserId: z.string(),
  matchedUsername: z.string(),
  matchedAvatarUrl: nullableString,
  matchedAvatarStyle: nullableString,
  competitiveTier: nullableNumber,
  competitiveTierName: nullableString,
  riotGameName: nullableString,
  riotTagLine: nullableString,
  popularAgents: nullableString,
  micOn: z.boolean().nullable().optional(),
  slotsNeeded: nullableNumber,
});
export type QueueMatch = z.infer<typeof queueMatchSchema>;

export const queueStatsSchema = z.object({
  swipesRight: z.number(),
  swipesLeft: z.number(),
  matchesCount: z.number(),
  durationSeconds: z.number(),
});
export type QueueStats = z.infer<typeof queueStatsSchema>;

export const swipeResultSchema = z.object({
  matched: z.boolean(),
  match: queueMatchSchema.nullable().optional(),
  sessionEnded: z.boolean(),
  stats: queueStatsSchema.nullable().optional(),
});
export type SwipeResult = z.infer<typeof swipeResultSchema>;

export const heartbeatSchema = z.object({ pendingLikes: z.number() });
export const pendingLikesSchema = z.object({ count: z.number() });
