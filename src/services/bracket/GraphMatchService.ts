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
    ): Promise<{ success: boolean; error?: string }> {
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
        // If this is a 'final' match and Team 2 (Losers Bracket Winner) wins, we need a reset.
        try {
            const { data: match } = await db
                .from('brkt_matches')
                .select('bracket_type, round_index, team1_id, team2_id, winner_id, version_id, match_number, best_of')
                .eq('id', matchId)
                .single();

            if (match && match.bracket_type === 'final') {
                // Check if Team 2 won (Losers Bracket Champion)
                // In our generator, Slot 2 of GF is always the Losers Bracket winner.
                if (match.winner_id === match.team2_id) {
                    console.log('[GraphMatchService] Grand Finals Reset condition met (Losers Side won). Checking for reset match...');

                    // Check if a reset match already exists
                    const { data: existingReset } = await db
                        .from('brkt_matches')
                        .select('id')
                        .eq('version_id', match.version_id)
                        .eq('bracket_type', 'final')
                        .gt('round_index', match.round_index)
                        .maybeSingle();

                    if (!existingReset) {
                        console.log('[GraphMatchService] Creating Grand Finals Reset match...');
                        // Create the reset match
                        const resetMatchId = crypto.randomUUID();
                        const { error: createError } = await db
                            .from('brkt_matches')
                            .insert({
                                id: resetMatchId,
                                version_id: match.version_id,
                                bracket_type: 'final',
                                round_index: match.round_index + 1,
                                match_number: 1, // Reset is always match 1 of the new round
                                status: 'pending',
                                team1_id: match.team1_id, // Rematch same teams
                                team2_id: match.team2_id,
                                best_of: match.best_of // Keep same format
                            });

                        if (createError) {
                            console.error('[GraphMatchService] Failed to create reset match:', createError);
                        } else {
                            // Create a layout node for it (optional, but good for consistency if we used layout table)
                            // But we rely on auto-layout in visualization mostly.
                            console.log('[GraphMatchService] Reset match created successfully:', resetMatchId);
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[GraphMatchService] Error handling finals reset:', e);
        }

        return { success: true };
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
