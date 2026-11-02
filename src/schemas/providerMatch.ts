import { z } from 'zod';

/** Validates provider-match and analytics-visibility responses at the boundary (camelCase, after the API client). */
export const providerMatchSchema = z.object({
  status: z.enum(['none', 'pending', 'verified', 'partially_verified', 'unverified', 'disputed', 'duplicate']),
  reasons: z.array(z.string()).default([]),
  match: z
    .object({ dataStatus: z.enum(['pending', 'retrieved', 'incomplete', 'unavailable', 'failed']) })
    .nullish(),
  players: z.array(z.object({ isRosterMember: z.boolean() })).optional(),
});

export const analyticsVisibilitySchema = z.object({
  game: z.string(),
  visibility: z.enum(['private', 'public']),
});

export const analyticsVisibilityRequestSchema = z.object({
  game: z.string().regex(/^[a-z0-9_-]{2,40}$/),
  visibility: z.enum(['private', 'public']),
});
