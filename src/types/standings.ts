export type RankStatus = 'active' | 'confirmed' | 'provisional';

export interface StandingsRow {
    rank: number;
    rank_status: RankStatus;
    is_tied: boolean;
    team_id: string;
    team_name: string;
    bracket_side: 'winners' | 'losers' | null;
    played: number;
    wins: number;
    losses: number;
    ties: number;
    score_diff: number;
    round_diff: number;
    points: number;
    buchholz: number;
    round_results: string[] | null;
    kills: number;
    prize_amount: number;
    placement_label: string | null;
    is_live: boolean;
    live_opponent: string | null;
}

export interface TournamentStandingsResponse {
    format: string;
    is_complete: boolean;
    computed_at: string;
    columns: string[];
    rows: StandingsRow[];
}
