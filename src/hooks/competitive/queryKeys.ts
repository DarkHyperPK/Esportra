/**
 * queryKeys.ts
 *
 * Canonical React Query key factories for the competitive domain.
 * Every hook in this domain must use these keys for cache consistency
 * and narrow invalidation.
 *
 * Source of truth: shared-contracts/types.md §7 (PROJ-075)
 */

import type { LfgSearchFilters, PlayerSearchFilters } from '@/types/competitive';

export const lfgKeys = {
  /** All LFG queries — use for broad invalidation (e.g. after publish) */
  all: () => ['lfg'] as const,
  /** Discovery feed with specific filters */
  discover: (filters: LfgSearchFilters) => ['lfg', 'discover', filters] as const,
  /** Caller's own listings */
  mine: () => ['lfg', 'mine'] as const,
  /** Single listing detail */
  detail: (id: string) => ['lfg', 'detail', id] as const,
  /** Interests on a listing (owner-only) */
  interests: (listingId: string) => ['lfg', 'interests', listingId] as const,
  inbox: (direction: string, game?: string) => ['lfg', 'inbox', direction, game] as const,
  syncState: (listingId?: string) => ['lfg', 'sync-state', listingId || 'me'] as const,
  saved: (game?: string) => ['lfg', 'saved', game] as const,
};

export const competitiveProfileKeys = {
  /** Player profile search */
  search: (filters: PlayerSearchFilters) =>
    ['competitive', 'profiles', 'search', filters] as const,
  /** Single player profile for a given game */
  profile: (userId: string, game: string) =>
    ['competitive', 'profiles', userId, game] as const,
};

export const catalogKeys = {
  /** Rank tiers for a game (stable, cache 24 h) */
  rankTiers: (game: string) => ['catalog', 'rank-tiers', game] as const,
  /** Game roles for a game (stable, cache 24 h) */
  gameRoles: (game: string) => ['catalog', 'game-roles', game] as const,
  /** Regions for a game (stable, cache 24 h) */
  regions: (game: string) => ['catalog', 'regions', game] as const,
};
