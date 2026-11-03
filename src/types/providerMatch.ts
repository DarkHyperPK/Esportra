/**
 * providerMatch.ts — the Riot match behind a reported scrim map or tournament game.
 * Mirrors GET /api/scrims/sessions/{id}/games/{n}/provider-match (camelCased by competitiveApiClient).
 * The server never sends PUUIDs; players are identified by Riot name and roster membership.
 */

/** 'none' = no Riot match was attached to the game. */
export type ProviderMatchStatus =
  | 'none'
  | 'pending'
  | 'verified'
  | 'partially_verified'
  | 'unverified'
  | 'disputed'
  | 'duplicate';

/** How far the server got in fetching the match from Riot. */
export type ProviderMatchDataStatus = 'pending' | 'retrieved' | 'incomplete' | 'unavailable' | 'failed';

export interface ProviderMatchPlayer {
  isRosterMember: boolean;
}

export interface ProviderMatchDetail {
  status: ProviderMatchStatus;
  reasons: string[];
  match?: { dataStatus: ProviderMatchDataStatus } | null;
  players?: ProviderMatchPlayer[];
}
