/**
 * GraphMatchService
 * 
 * Dedicated service for all match operations in the new graph bracket engine.
 * This is the ONLY place that should touch the brkt_matches table for match actions.
 */

import { supabase } from '@/lib/supabase';

const db = supabase as any; // Bypass type checking for brkt_* tables

export interface GoLiveResult {
    success: boolean;
    error?: string;
}

export interface SaveScoreResult {
    success: boolean;
    winnerId?: string;
    loserId?: string;
    error?: string;
}

export interface AdvanceTeamResult {
    success: boolean;
    error?: string;
}

export class GraphMatchService {
    /**
     * Set a match to "in_progress" with a party code.
     * This is the Go Live functionality.
     */
    static async goLive(matchId: string, partyCode: string): Promise<GoLiveResult> {
        try {
            const { error } = await db
                .from('brkt_matches')
                .update({
                    status: 'in_progress',
                    party_code: partyCode.trim().toUpperCase()
                })
                .eq('id', matchId);

            if (error) {
                console.error('[GraphMatchService.goLive] Error:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (e: any) {
            console.error('[GraphMatchService.goLive] Exception:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Save scores for a match and determine winner/loser.
     * Does NOT advance teams - that's a separate call.
     */
    static async saveScore(
        matchId: string,
        team1Score: number,
        team2Score: number,
        team1Id: string | null,
        team2Id: string | null
    ): Promise<SaveScoreResult> {
        try {
            if (team1Score === team2Score) {
                return { success: false, error: 'Scores cannot be equal' };
            }

            const winnerId = team1Score > team2Score ? team1Id : team2Id;
            const loserId = team1Score > team2Score ? team2Id : team1Id;

            const { error } = await db
                .from('brkt_matches')
                .update({
                    team1_score: team1Score,
                    team2_score: team2Score,
                    winner_id: winnerId,
                    loser_id: loserId,
                    status: 'completed'
                })
                .eq('id', matchId);

            if (error) {
                console.error('[GraphMatchService.saveScore] Error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, winnerId: winnerId || undefined, loserId: loserId || undefined };
        } catch (e: any) {
            console.error('[GraphMatchService.saveScore] Exception:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Advance a team to the next match in a specific slot.
     * @param targetMatchId - The match to advance the team to
     * @param teamId - The team to advance
     * @param slot - Which slot (1 = team1_id, 2 = team2_id)
     */
    static async advanceTeam(
        targetMatchId: string,
        teamId: string,
        slot: 1 | 2
    ): Promise<AdvanceTeamResult> {
        try {
            const field = slot === 1 ? 'team1_id' : 'team2_id';

            const { error } = await db
                .from('brkt_matches')
                .update({ [field]: teamId })
                .eq('id', targetMatchId);

            if (error) {
                console.error('[GraphMatchService.advanceTeam] Error:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (e: any) {
            console.error('[GraphMatchService.advanceTeam] Exception:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Get advancement info for a match (where winner and loser go).
     */
    static async getAdvancementInfo(matchId: string): Promise<{
        winnerEdge?: { target_match_id: string; target_slot: 1 | 2 };
        loserEdge?: { target_match_id: string; target_slot: 1 | 2 };
    }> {
        try {
            const { data: edges, error } = await db
                .from('brkt_advancements')
                .select('target_match_id, target_slot, type')
                .eq('source_match_id', matchId);

            if (error || !edges) {
                console.error('[GraphMatchService.getAdvancementInfo] Error:', error);
                return {};
            }

            const winnerEdge = edges.find((e: any) => e.type === 'winner');
            const loserEdge = edges.find((e: any) => e.type === 'loser');

            return {
                winnerEdge: winnerEdge ? { target_match_id: winnerEdge.target_match_id, target_slot: winnerEdge.target_slot } : undefined,
                loserEdge: loserEdge ? { target_match_id: loserEdge.target_match_id, target_slot: loserEdge.target_slot } : undefined
            };
        } catch (e: any) {
            console.error('[GraphMatchService.getAdvancementInfo] Exception:', e);
            return {};
        }
    }

    /**
     * Complete workflow: Save score and advance teams.
     */
    static async saveScoreAndAdvance(
        matchId: string,
        team1Score: number,
        team2Score: number,
        team1Id: string | null,
        team2Id: string | null
    ): Promise<{ success: boolean; error?: string; stageId?: string; stageComplete?: boolean }> {
        // 1. Save the score
        const scoreResult = await this.saveScore(matchId, team1Score, team2Score, team1Id, team2Id);
        if (!scoreResult.success) {
            return scoreResult;
        }

        // 2. Get advancement edges
        const { winnerEdge, loserEdge } = await this.getAdvancementInfo(matchId);

        // 3. Advance winner
        if (scoreResult.winnerId && winnerEdge) {
            const advanceResult = await this.advanceTeam(
                winnerEdge.target_match_id,
                scoreResult.winnerId,
                winnerEdge.target_slot
            );
            if (!advanceResult.success) {
                console.warn('[GraphMatchService] Winner advancement failed:', advanceResult.error);
            }
        }

        // 4. Advance loser (double elimination)
        if (scoreResult.loserId && loserEdge) {
            const advanceResult = await this.advanceTeam(
                loserEdge.target_match_id,
                scoreResult.loserId,
                loserEdge.target_slot
            );
            if (!advanceResult.success) {
                console.warn('[GraphMatchService] Loser advancement failed:', advanceResult.error);
            }
        }

        // 5. Handle Grand Finals Reset (Double Elimination)
        // Logic: If the Undefeated Team (Winners Bracket Champ) loses for the first time,
        // both teams now have 1 loss. This triggers a "Reset Match" (Sudden Death).
        try {
            const { data: match } = await db
                .from('brkt_matches')
                .select('bracket_type, round_index, team1_id, team2_id, winner_id, loser_id, version_id, match_number, best_of')
                .eq('id', matchId)
                .single();

            if (match && match.bracket_type === 'final') {
                // Count losses for both teams in this bracket version
                const { count: team1Losses } = await db
                    .from('brkt_matches')
                    .select('*', { count: 'exact', head: true })
                    .eq('version_id', match.version_id)
                    .eq('loser_id', match.team1_id)
                    .eq('status', 'completed');

                const { count: team2Losses } = await db
                    .from('brkt_matches')
                    .select('*', { count: 'exact', head: true })
                    .eq('version_id', match.version_id)
                    .eq('loser_id', match.team2_id)
                    .eq('status', 'completed');

                console.log(`[GraphMatchService] Finals Loss Check - Team 1: ${team1Losses}, Team 2: ${team2Losses}`);

                // RESET CONDITION:
                // Both teams must have exactly 1 loss after this match.
                // This happens when the previously undefeated team (0 losses) loses to the challenger (1 loss).
                if (team1Losses === 1 && team2Losses === 1) {
                    console.log('[GraphMatchService] Grand Finals Reset condition met (Both teams have 1 loss). Checking for reset match...');

                    // Check if a reset match already exists (future match)
                    const { data: existingReset } = await db
                        .from('brkt_matches')
                        .select('id')
                        .eq('version_id', match.version_id)
                        .eq('bracket_type', 'final')
                        .gt('round_index', match.round_index)
                        .maybeSingle();

                    // Check if this is ALREADY a reset match (past match)
                    const { data: previousFinal } = await db
                        .from('brkt_matches')
                        .select('id')
                        .eq('version_id', match.version_id)
                        .eq('bracket_type', 'final')
                        .lt('round_index', match.round_index)
                        .maybeSingle();

                    if (!existingReset && !previousFinal) {
                        console.log('[GraphMatchService] Creating Grand Finals Reset match...');
                        const resetMatchId = crypto.randomUUID();
                        const { error: createError } = await db
                            .from('brkt_matches')
                            .insert({
                                id: resetMatchId,
                                version_id: match.version_id,
                                bracket_type: 'final',
                                round_index: match.round_index + 1,
                                match_number: 1,
                                status: 'pending',
                                team1_id: match.team1_id,
                                team2_id: match.team2_id,
                                best_of: match.best_of
                            });

                        if (createError) {
                            console.error('[GraphMatchService] Failed to create reset match:', createError);
                        } else {
                            console.log('[GraphMatchService] Reset match created successfully:', resetMatchId);
                        }
                    } else if (previousFinal) {
                        console.log('[GraphMatchService] This is already a reset match. No further reset needed.');
                    }
                }
            }
        } catch (e) {
            console.error('[GraphMatchService] Error handling finals reset:', e);
        }

        // 6. Check for stage completion (for multi-stage advancement)
        let stageComplete = false;
        let stageId: string | undefined;
        try {
            // Get the stage ID from the match's version
            const { data: matchData } = await db
                .from('brkt_matches')
                .select('version_id')
                .eq('id', matchId)
                .single();

            if (matchData) {
                const { data: versionData } = await db
                    .from('brkt_versions')
                    .select('stage_id')
                    .eq('id', matchData.version_id)
                    .single();

                if (versionData?.stage_id) {
                    stageId = versionData.stage_id;
                    console.log('[GraphMatchService] Match saved for stage:', stageId);

                    // Check if all matches in this stage are completed
                    const { data: pendingMatches, count: pendingCount } = await db
                        .from('brkt_matches')
                        .select('id', { count: 'exact', head: true })
                        .eq('version_id', matchData.version_id)
                        .neq('status', 'completed');

                    if (pendingCount === 0) {
                        // All matches completed - auto-update stage status to 'completed'
                        console.log('[GraphMatchService] All matches completed - setting stage to completed:', stageId);
                        const { error: updateError } = await db
                            .from('tournament_stages')
                            .update({ status: 'completed' })
                            .eq('id', stageId);

                        if (updateError) {
                            console.error('[GraphMatchService] Failed to update stage status:', updateError);
                        } else {
                            stageComplete = true;
                            console.log('[GraphMatchService] Stage automatically marked as completed');
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[GraphMatchService] Error checking stage completion:', e);
        }

        return { success: true, stageId, stageComplete };
    }

    /**
     * Clear all data for a bracket version.
     */
    static async clearBracket(versionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Get all match IDs for this version
            const { data: matches } = await db
                .from('brkt_matches')
                .select('id')
                .eq('version_id', versionId);

            const matchIds = matches?.map((m: any) => m.id) || [];

            // Delete in order (respecting foreign keys)
            if (matchIds.length > 0) {
                await db.from('brkt_match_events').delete().in('match_id', matchIds);
            }
            await db.from('brkt_layout').delete().eq('version_id', versionId);
            await db.from('brkt_advancements').delete().eq('version_id', versionId);
            await db.from('brkt_matches').delete().eq('version_id', versionId);
            await db.from('brkt_versions').delete().eq('id', versionId);

            return { success: true };
        } catch (e: any) {
            console.error('[GraphMatchService.clearBracket] Exception:', e);
            return { success: false, error: e.message };
        }
    }
}
