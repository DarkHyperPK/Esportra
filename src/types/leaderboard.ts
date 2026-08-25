/**
 * Global team leaderboard (RP system) — shared contract for /api/leaderboards/*.
 *
 * Note: this is distinct from per-stage Battle Royale points standings
 * (see src/types/battleRoyale.ts / BRLeaderboardEntry).
 */

export type LeaderboardScope = 'global' | 'region' | 'country';

export interface LeaderboardTeamRow {
  rank: number;
  team_id: string;
  name: string;
  logo_url: string | null;
  country_code: string | null;
  regions: string[];
  matches_played: number;
  wins: number;
  losses: number;
  win_rate: number;
  tournaments_played: number;
  tournaments_won: number;
  placement_points: number;
  best_placement: number | null;
  rp: number;
}

export interface LeaderboardTeamsResponse {
  total: number;
  scope: LeaderboardScope;
  game: string | null;
  country: string | null;
  region: string | null;
  limit: number;
  offset: number;
  items: LeaderboardTeamRow[];
}

export interface LeaderboardFiltersResponse {
  games: string[];
  regions: string[];
  countries: string[];
}

export interface LeaderboardMetaPlacementTier {
  placement?: number;
  from_placement?: number;
  to_placement?: number;
  points: number;
}

export interface LeaderboardMetaResponse {
  win_points: number;
  loss_points: number;
  tournament_win_points: number;
  placement_points: LeaderboardMetaPlacementTier[];
}

export interface LeaderboardQuery {
  scope: LeaderboardScope;
  game?: string;
  country?: string;
  region?: string;
  limit: number;
  offset: number;
}
