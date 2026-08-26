/**
 * Global team leaderboard (RP system) — shared contract for /api/leaderboards/*.
 *
 * Model A: game is the required base axis; region and country optionally narrow
 * the ranked pool. There is no mixed-game "global" view.
 *
 * Note: distinct from per-stage Battle Royale points standings
 * (see src/types/battleRoyale.ts / BRLeaderboardEntry).
 */

export interface LeaderboardTeamRow {
  rank: number;
  team_id: string;
  name: string;
  logo_url: string | null;
  country_code: string | null;
  game: string;
  region: string;
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
  game: string;
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
  game: string;
  region?: string;
  country?: string;
  limit: number;
  offset: number;
}
