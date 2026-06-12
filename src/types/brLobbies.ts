export interface BRGame {
  id: string;
  lobby_id: string;
  game_number: number;
  map: string | null;
  status: 'pending' | 'active' | 'completed';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at?: string;
  result_count?: number;
  evidence_count?: number;
}

export interface BRRound {
  id: string;
  wave_number: number;
  /** @deprecated Use wave_number from API payloads. */
  round_number?: number;
  lobby_code: string | null;
  map: string | null;
  status: 'pending' | 'active' | 'completed';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  queue_timer_minutes?: number | null;
  queue_started_at?: string | null;
  created_at: string;
  result_count: number;
  evidence_count?: number;
  pending_evidence_count?: number;
  lobby_index?: number;
  group_ids?: string[];
  game_count?: number;
  games_completed?: number;
}

/** Lobby row with nested scored games (client-side aggregate). */
export interface BRLobbyWithGames extends BRRound {
  games: BRGame[];
}

export interface BRRoundResult {
  id: string;
  team_id: string;
  placement: number;
  kills: number;
  placement_points: number;
  kill_points: number;
  total_points: number;
  team_name: string;
  logo_url: string | null;
}

export interface BRResultInput {
  teamId: string;
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
}

export type BRLobby = BRRound;
export type BRLobbyResult = BRRoundResult;
