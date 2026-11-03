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
