/**
 * Bracket Types
 * 
 * Types specific to the Brackets page and its components.
 * For shared bracket types, see @/types/bracketTypes.ts
 */

import type { BracketMatch, BracketTeam, BracketSide } from '@/types/bracketTypes';

// ============================================================================
// Component Props Types
// ============================================================================

/** Payload for team swap operations (drag and drop) */
export interface SwapPayload {
    source: {
        round: number;
        matchNumber: number;
        slot: 'team1' | 'team2';
        bracketSide?: BracketSide;
    };
    target: {
        round: number;
        matchNumber: number;
        slot: 'team1' | 'team2';
        bracketSide?: BracketSide;
    };
}

/** Props for BracketVisualization component */
export interface BracketVisualizationProps {
    matches: BracketMatch[];
    teamCount: number;
    tournamentId?: string | null;
    isOrganizer?: boolean;
    isCaptain?: boolean;
    userTeamId?: string;
    matchVetoLinks?: Map<string, { team1Link?: string; team2Link?: string }>;
    onUploadResult?: (matchId: string) => void;
    onSwapTeam?: (payload: SwapPayload) => void;
    onOpenMapVeto?: (match: BracketMatch, matchId: string) => void;
}

// ============================================================================
// State Types
// ============================================================================

/** Score draft state for inline editing */
export interface ScoreDraft {
    t1: string;
    t2: string;
}

/** Edit dialog draft state */
export interface EditDraft {
    scheduled_at: string;
    best_of: string;
}

// ============================================================================
// Helper Types for Layout Functions
// ============================================================================

/** Team data for layout generation */
export interface TeamForLayout {
    id: string;
    name: string;
    logo_url?: string | null;
}

/** Match result images/comments */
export interface MatchResultData {
    images: string[];
    comments: string[];
}

// ============================================================================
// View State Types
// ============================================================================

/** Valid bracket view modes */
export type BracketViewMode = 'winners' | 'losers' | 'all';

/** Valid bracket size options */
export type BracketSizeOption = 8 | 16 | 24 | 32 | 64 | 128 | 256 | 512;
