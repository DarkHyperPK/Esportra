import type { MatchDetailsPayload } from '@/types/matchDetails';
import type { ReportScrimGameInput, ScrimGame, ScrimGameSource, ScrimGameStatus, ScrimGamesResponse } from '@/types/competitive';

/** The API's snake_case shape; match_data is stored as the client sent it and passes through untouched. */
export interface RawScrimGame {
  game_number: number;
  status: ScrimGameStatus;
  map_name: string | null;
  map_id: string | null;
  team1_score: number;
  team2_score: number;
  winner_slot: number | null;
  source: ScrimGameSource;
  riot_match_id: string | null;
  match_data: MatchDetailsPayload | null;
  screenshot_urls: string[];
  notes: string | null;
  reported_by_team_id: string;
  reported_at: string;
  confirmed_by_team_id: string | null;
  confirmed_at: string | null;
  disputed_by_team_id: string | null;
}

export interface RawScrimGames {
  best_of: number;
  wins_needed: number;
  team1_wins: number;
  team2_wins: number;
  next_game_number: number | null;
  games: RawScrimGame[];
}

export function toScrimGame(raw: RawScrimGame): ScrimGame {
  return {
    gameNumber: raw.game_number,
    status: raw.status,
    mapName: raw.map_name,
    mapId: raw.map_id,
    team1Score: raw.team1_score,
    team2Score: raw.team2_score,
    winnerSlot: raw.winner_slot === 1 || raw.winner_slot === 2 ? raw.winner_slot : null,
    source: raw.source,
    riotMatchId: raw.riot_match_id,
    matchData: raw.match_data,
    screenshotUrls: raw.screenshot_urls ?? [],
    notes: raw.notes,
    reportedByTeamId: raw.reported_by_team_id,
    reportedAt: raw.reported_at,
    confirmedByTeamId: raw.confirmed_by_team_id,
    confirmedAt: raw.confirmed_at,
    disputedByTeamId: raw.disputed_by_team_id,
  };
}

export function toScrimGames(raw: RawScrimGames): ScrimGamesResponse {
  return {
    bestOf: raw.best_of,
    winsNeeded: raw.wins_needed,
    team1Wins: raw.team1_wins,
    team2Wins: raw.team2_wins,
    nextGameNumber: raw.next_game_number,
    games: raw.games.map(toScrimGame),
  };
}

/** Request body for reporting a map. Only the top level is snake_cased: match details go as-is. */
export function toReportBody(input: ReportScrimGameInput) {
  return {
    reported_by_team_id: input.reportedByTeamId,
    team1_score: input.team1Score,
    team2_score: input.team2Score,
    source: input.source,
    riot_match_id: input.riotMatchId,
    map_name: input.mapName,
    map_id: input.mapId,
    match_data: input.matchData,
    screenshot_urls: input.screenshotUrls,
    notes: input.notes,
  };
}

/** Why a game is awaiting this team, for the row's call to action. */
export type ScrimGameTurn = 'confirm' | 'waiting' | 'none';

export function gameTurn(game: ScrimGame, myTeamId: string | null): ScrimGameTurn {
  if (game.status !== 'reported' || !myTeamId) return 'none';
  return game.reportedByTeamId === myTeamId ? 'waiting' : 'confirm';
}
