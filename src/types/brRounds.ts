export interface BRRound {
  id: string;
  round_number: number;
  lobby_code: string | null;
  status: 'pending' | 'active' | 'completed';
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  queue_timer_minutes?: number | null;
  queue_started_at?: string | null;
  created_at: string;
  result_count: number;
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
