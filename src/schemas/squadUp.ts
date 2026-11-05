import { z } from 'zod';

/** Form input for entering the Squad Up deck. */
export const startSquadUpSchema = z.object({
  micOn: z.boolean(),
  slotsNeeded: z.number().int().min(1).max(4),
});
export type StartSquadUpInput = z.infer<typeof startSquadUpSchema>;

const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

export const squadUpSessionSchema = z.object({
  id: z.string(),
  region: z.string(),
  competitiveTier: z.number(),
  micOn: z.boolean(),
  slotsNeeded: z.number(),
});
export type SquadUpSession = z.infer<typeof squadUpSessionSchema>;

export const synergyLabelSchema = z.enum(['great_synergy', 'role_overlap', 'unknown']);
export type SynergyLabel = z.infer<typeof synergyLabelSchema>;

export const squadUpCardSchema = z.object({
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
export type SquadUpCard = z.infer<typeof squadUpCardSchema>;

export const squadUpMatchSchema = z.object({
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
export type SquadUpMatch = z.infer<typeof squadUpMatchSchema>;

export const squadUpStatsSchema = z.object({
  swipesRight: z.number(),
  swipesLeft: z.number(),
  matchesCount: z.number(),
  durationSeconds: z.number(),
});
export type SquadUpStats = z.infer<typeof squadUpStatsSchema>;

export const swipeResultSchema = z.object({
  matched: z.boolean(),
  match: squadUpMatchSchema.nullable().optional(),
  sessionEnded: z.boolean(),
  stats: squadUpStatsSchema.nullable().optional(),
});
export type SwipeResult = z.infer<typeof swipeResultSchema>;

export const heartbeatSchema = z.object({ pendingLikes: z.number() });
export const pendingLikesSchema = z.object({ count: z.number() });
