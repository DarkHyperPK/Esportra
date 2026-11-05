import { z } from 'zod';

export const SQUAD_UP_GAMES = [{ slug: 'valorant', name: 'Valorant', live: true }] as const;
export const squadUpModeSchema = z.enum(['competitive', 'unrated']);
export type SquadUpMode = z.infer<typeof squadUpModeSchema>;

/** Valorant competitive tiers: 3 (Iron 1) to 27 (Radiant). */
export const MIN_TIER = 3;
export const MAX_TIER = 27;
const tier = z.number().int().min(MIN_TIER).max(MAX_TIER);

/** What a player wants from Squad Up right now. Checked here and again by the server. */
export const squadUpFiltersSchema = z.object({
  game: z.literal('valorant'),
  mode: squadUpModeSchema,
  wantedCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1, 'Pick at least one country.').max(60),
  minTier: tier.nullable().optional(),
  maxTier: tier.nullable().optional(),
}).refine((value) => value.minTier == null || value.maxTier == null || value.minTier <= value.maxTier, {
  message: 'The lowest rank must be below the highest.', path: ['maxTier'],
});
export type SquadUpFilters = z.infer<typeof squadUpFiltersSchema>;

/** Form input for entering the Squad Up deck. Filters are optional so older callers keep working. */
export const startSquadUpSchema = z.object({
  micOn: z.boolean(),
  slotsNeeded: z.number().int().min(1).max(4),
  game: z.literal('valorant').optional(),
  mode: squadUpModeSchema.optional(),
  wantedCountries: z.array(z.string().regex(/^[A-Z]{2}$/)).max(60).optional(),
  minTier: tier.nullable().optional(),
  maxTier: tier.nullable().optional(),
});
export type StartSquadUpInput = z.infer<typeof startSquadUpSchema>;

const nullableNumber = z.number().nullable().optional();
const nullableString = z.string().nullable().optional();

export const squadUpSessionSchema = z.object({
  id: z.string(),
  region: z.string(),
  competitiveTier: z.number().nullable().optional(),
  micOn: z.boolean(),
  slotsNeeded: z.number(),
  mode: squadUpModeSchema.optional(),
  countryCode: z.string().nullable().optional(),
  wantedCountries: z.array(z.string()).optional(),
  minTier: z.number().nullable().optional(),
  maxTier: z.number().nullable().optional(),
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
  competitiveTier: nullableNumber,
  competitiveTierName: nullableString,
  mode: squadUpModeSchema.optional(),
  countryCode: nullableString,
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

export const heartbeatSchema = z.object({ pendingLikes: z.number(), inSession: z.boolean().optional(), hostingLobby: z.boolean().optional() });
export const pendingLikesSchema = z.object({ count: z.number() });
