/**
 * Consolidated Bracket Types
 * 
 * This file provides a single source of truth for bracket-related types
 * used across the application. It includes types for teams, matches,
 * stages, and results that work with both single and double elimination
 * brackets, as well as multi-stage tournaments.
 */

import type { Database } from '@/integrations/supabase/types';

// ============================================================================
// Database Row Type Aliases
// ============================================================================

/** Database row type for tournament matches */
export type DbTournamentMatch = Database['public']['Tables']['tournament_matches']['Row'];

/** Database row type for tournament match results */
export type DbTournamentMatchResult = Database['public']['Tables']['tournament_match_results']['Row'];

/** Database row type for tournament stages */
export type DbTournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

/** Database row type for match results (legacy/verification) */
export type DbMatchResult = Database['public']['Tables']['match_results']['Row'];

// ============================================================================
// Team Types
// ============================================================================

/** Team as stored in the database */
export interface Team {
    id: string;
    name: string;
    tag?: string;
    logo_url?: string | null;
    members?: TeamMember[];
}

/** Team member information */
export interface TeamMember {
    id: string;
    user_id: string;
    team_id: string;
    role: string;
    is_captain: boolean;
}

/** Team representation in bracket visualization */
export interface BracketTeam {
    id: string;
    name: string;
    seed?: number;
    eliminated?: boolean;
    logo_url?: string | null;
}

// ============================================================================
// Match Types
// ============================================================================

/** Match status enum */
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';

/** Bracket side for double elimination */
export type BracketSide = 'winners' | 'losers' | 'final' | 'reset';

/** Match as stored in the database (aligned with Supabase types) */
export interface Match {
    id: string;
    tournament_id: string;
    stage_id?: string | null;
    round: number;
    match_number: number;
    team1_id?: string | null;
    team2_id?: string | null;
    player1_id?: string | null;
    player2_id?: string | null;
    team1_score?: number | null;
    team2_score?: number | null;
    winner_id: string | null;
    score?: string | null;
    status: MatchStatus;
    scheduled_time?: string | null;
    bracket_side?: string;
    next_match_id?: string | null;
    loser_next_match_id?: string | null;
    created_at?: string;
    updated_at?: string;
}

/** Match with team data included (from joins) */
export interface MatchWithTeams extends Match {
    team1?: Team;
    team2?: Team;
    winner?: Team;
}

/** Match representation for bracket visualization */
export interface BracketMatch {
    id: string;
    round: number;
    matchNumber: number;
    team1: BracketTeam | null;
    team2: BracketTeam | null;
    winner: BracketTeam | null;
    score: string | null;
    team1_score: number | null;
    team2_score: number | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
    scheduledTime?: string;
    bestOf?: number;
    resultImages?: string[];
    resultComments?: string[];
    partyCode?: string | null;
    bracketSide?: BracketSide;
    bracketType?: 'winners' | 'losers' | 'final' | 'group' | 'swiss_round';
    nextMatchId?: string | null;
    loserNextMatchId?: string | null;
    stageId?: string | null;
    groupId?: string | number | null;
    x?: number;
    y?: number;
}

// ============================================================================
// Stage Types
// ============================================================================

/**
 * @deprecated Use StageRow from @/types/stage.ts instead.
 * This interface lacks best_of, bo_mode, and round_bo_overrides fields.
 */
export interface TournamentStage {
    id: string;
    tournament_id: string;
    name: string;
    format: string;
    stage_order: number;
    capacity?: number | null;
    advancement_count?: number | null;
    best_of?: number;
    bo_mode?: 'per_stage' | 'per_round';
    round_bo_overrides?: Record<string, number> | null;
    config?: Record<string, unknown> | null;
    status?: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

// ============================================================================
// Result Types
// ============================================================================

/** Match result with images and comments (tournament_match_results) */
export interface MatchResultImage {
    id: string;
    tournament_id: string;
    match_id: string;
    reporter_user_id: string | null;
    image_url: string | null;
    comment: string | null;
    created_at: string;
}

/** Match result for verification workflow (match_results) */
export interface MatchVerificationResult {
    id: string;
    match_id: string;
    reported_by: string;
    team1_score: number;
    team2_score: number;
    screenshots: string[];
    status: 'pending' | 'verified' | 'rejected';
    verification_notes?: string | null;
    verified_by?: string | null;
    verified_at?: string | null;
    created_at: string;
}

// ============================================================================
// Veto Types
// ============================================================================

/** Map veto session */
export interface MapVetoSession {
    id: string;
    match_id: string;
    tournament_id: string;
    team1_id: string | null;
    team2_id: string | null;
    team1_link_token: string | null;
    team2_link_token: string | null;
    current_turn: string | null;
    status: string;
    selected_map: string | null;
    created_at: string;
    updated_at: string;
}

/** Individual veto action */
export interface MapVetoAction {
    id: string;
    veto_id: string;
    team_id: string;
    action_type: string;
    map_name: string;
    action_order: number;
    created_at: string;
}

// ============================================================================
// Participant Types
// ============================================================================

/** Tournament participant (registration) */
export interface Participant {
    id: string;
    tournament_id: string;
    user_id?: string | null;
    team_id?: string | null;
    team_name?: string | null;
    gamer_tag?: string | null;
    participant_type?: 'solo' | 'team' | null;
    status: string;
    created_at: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Bracket size options */
export type BracketSize = 8 | 16 | 24 | 32 | 64 | 128 | 256 | 512;

/** Bracket format options */
export type BracketFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';

/** Schedule configuration for auto-scheduling */
export interface ScheduleConfig {
    startTime: string;
    gapMinutes: number;
}
