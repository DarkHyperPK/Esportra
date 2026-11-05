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

export const squadUpKeys = {
  /** Everything under SquadUp Now — use after a match or when the session ends */
  all: () => ['squad-up'] as const,
  /** Presence probe (heartbeat) — also tells us whether a session exists */
  presence: () => ['squad-up', 'presence'] as const,
  cards: () => ['squad-up', 'cards'] as const,
  matches: () => ['squad-up', 'matches'] as const,
  stats: () => ['squad-up', 'stats'] as const,
  /** Transient app-wide popup state (match / liked-you); never fetched from the server */
  popup: () => ['squad-up', 'popup'] as const,
  reportsMine: () => ['squad-up', 'reports-mine'] as const,
  blocks: () => ['squad-up', 'blocks'] as const,
};

export const squadUpAdminKeys = {
  all: () => ['admin', 'squad-up'] as const,
  overview: (days: number) => ['admin', 'squad-up', 'overview', days] as const,
  sessions: () => ['admin', 'squad-up', 'sessions'] as const,
  matches: () => ['admin', 'squad-up', 'matches'] as const,
  reports: (status: string, offset: number) => ['admin', 'squad-up', 'reports', status, offset] as const,
  reportDetail: (id: string) => ['admin', 'squad-up', 'report', id] as const,
  restrictions: () => ['admin', 'squad-up', 'restrictions'] as const,
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

export const providerMatchKeys = {
  /** The Riot match behind one scrim map */
  scrimGame: (sessionId: string, gameNumber: number) => ['provider-match', 'scrim', sessionId, gameNumber] as const,
};

export const scrimDataKeys = {
  /** A team's scrim data: record, maps, compositions, players, lineups */
  team: (teamId: string) => ['scrim-data', 'team', teamId] as const,
};

export const scrimInsightsKeys = {
  mapPicks: (teamId: string) => ['scrims', 'map-picks', teamId] as const,
  timeline: (sessionId: string, gameNumber: number, teamId?: string) => ['scrims', 'timeline', sessionId, gameNumber, teamId ?? null] as const,
  fights: (teamId: string, map: string | null, side: string | null) => ['scrims', 'fights', teamId, map, side] as const,
  heatmap: (teamId: string, map: string | null, kind: string, side: string | null) => ['scrims', 'heatmap', teamId, map, kind, side] as const,
  trends: (teamId: string) => ['scrims', 'trends', teamId] as const,
  opponents: (teamId: string) => ['scrims', 'opponents', teamId] as const,
  teamReport: (teamId: string) => ['scrims', 'team-report', teamId] as const,
  playerReport: (teamId: string, userId: string) => ['scrims', 'player-report', teamId, userId] as const,
  game: (sessionId: string, gameNumber: number, teamId?: string) => ['scrims', 'insights', sessionId, gameNumber, teamId ?? null] as const,
};
