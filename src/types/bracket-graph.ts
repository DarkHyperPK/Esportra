export type BracketType = 'winners' | 'losers' | 'final' | 'group' | 'swiss_round';
export type MatchStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'disputed';
export type AdvancementType = 'winner' | 'loser';
export type MatchEventType = 'participant_ready' | 'score_reported' | 'dispute_opened' | 'match_finalized' | 'match_reset';

export interface BracketVersion {
    id: string;
    tournament_id: string;
    stage_id?: string;
    version_number: number;
    status: 'draft' | 'active' | 'archived';
    created_at: string;
    activated_at?: string;
    cached_ui_state?: any[];
}

export interface BracketNode {
    id: string;
    version_id: string;
    round_index: number;
    match_number: number;
    bracket_type: BracketType;

    // Swiss/RR specific
    group_id?: string | null;
    round_number?: number | null;

    // Computed State
    team1_id?: string | null;
    team2_id?: string | null;
    team1_seed?: number | null;
    team2_seed?: number | null;
    team1_score?: number | null;
    team2_score?: number | null;
    status: MatchStatus;
    winner_id?: string | null;
    loser_id?: string | null;
    party_code?: string | null;

    // Match Settings
    best_of?: number; // Best-of format (3, 5, etc.)

    // Visuals (joined from layout)
    x?: number;
    y?: number;

    scheduled_time?: string | null;
    automated_report_status?: 'idle' | 'processing' | 'verified' | 'failed' | 'partial' | null;
    version: number;

    // Eager Loaded Data (Joined from teams table)
    team1_name?: string | null;
    team1_logo?: string | null;
    team2_name?: string | null;
    team2_logo?: string | null;
}

export interface BracketEdge {
    id: string;
    version_id: string;
    source_match_id: string;
    target_match_id: string;
    type: AdvancementType;
    target_slot: 1 | 2;
}

export interface MatchEvent {
    id: string;
    match_id: string;
    type: MatchEventType;
    payload: any;
    created_by?: string;
    created_at: string;
}

export interface BracketGraph {
    version: BracketVersion;
    nodes: BracketNode[];
    edges: BracketEdge[];
}

export interface BracketGenerator {
    generate(teams: any[]): Promise<BracketGraph>; // teams type will be refined
}
