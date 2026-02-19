import { MatchRepository } from './MatchRepository';
import { BracketEdge, MatchEvent } from '@/types/bracket-graph';
import { stageCompletionService } from './StageCompletionService';

import { supabase } from '@/lib/supabase';

export class AdvancementService {
    private repo: MatchRepository;

    constructor() {
        this.repo = new MatchRepository();
    }

    /**
     * Reports a score for a match and triggers advancement if the match is complete.
     */
    async reportScore(matchId: string, team1Score: number, team2Score: number, userId?: string): Promise<void> {
        // 1. Create Score Reported Event
        const scoreEvent: MatchEvent = {
            id: crypto.randomUUID(),
            match_id: matchId,
            type: 'score_reported',
            payload: { team1Score, team2Score },
            created_by: userId,
            created_at: new Date().toISOString()
        };
        await this.repo.addEvent(scoreEvent);

        // 2. Determine Winner
        // For now, we assume simple score comparison.
        // In a real system, we might wait for verification or check 'best_of'.
        if (team1Score !== team2Score) {
            // Fetch match to get team IDs
            const { data: match, error } = await (supabase as any)
                .from('brkt_matches')
                .select('team1_id, team2_id, version_id')
                .eq('id', matchId)
                .single();

            if (error || !match) throw new Error('Match not found');

            const winnerId = team1Score > team2Score ? match.team1_id : match.team2_id;
            const loserId = team1Score > team2Score ? match.team2_id : match.team1_id;

            if (winnerId && loserId) {
                await this.finalizeMatch(matchId, match.version_id, winnerId, loserId, userId);
            }
        }
    }

    /**
     * Finalizes a match and advances teams.
     */
    private async finalizeMatch(matchId: string, versionId: string, winnerId: string, loserId: string, userId?: string): Promise<void> {
        // 1. Create Match Finalized Event
        const finalizeEvent: MatchEvent = {
            id: crypto.randomUUID(),
            match_id: matchId,
            type: 'match_finalized',
            payload: { winnerId, loserId },
            created_by: userId,
            created_at: new Date().toISOString()
        };
        await this.repo.addEvent(finalizeEvent);

        // 2. Update Match Node (Denormalized State)
        // This makes reads faster so we don't always have to replay events.
        await (supabase as any)
            .from('brkt_matches')
            .update({
                status: 'completed',
                winner_id: winnerId,
                loser_id: loserId
            })
            .eq('id', matchId);

        // 3. Advance Teams
        await this.advanceTeam(matchId, versionId, 'winner', winnerId);
        await this.advanceTeam(matchId, versionId, 'loser', loserId);

        // 4. Check for Stage Completion and Auto-Advance
        const { data: version } = await (supabase as any)
            .from('brkt_versions')
            .select('stage_id')
            .eq('id', versionId)
            .single();

        if (version?.stage_id) {
            await stageCompletionService.advanceTeamsToNextStage(version.stage_id);
        }
    }

    /**
     * Advances a team along the graph edges.
     */
    private async advanceTeam(sourceMatchId: string, versionId: string, type: 'winner' | 'loser', teamId: string): Promise<void> {
        // Find outgoing edges
        const { data: edges, error } = await (supabase as any)
            .from('brkt_advancements')
            .select('*')
            .eq('version_id', versionId)
            .eq('source_match_id', sourceMatchId)
            .eq('type', type);

        if (error) throw error;

        for (const edge of edges) {
            const targetMatchId = edge.target_match_id;
            const targetSlot = edge.target_slot; // 1 or 2

            // Create 'Participant Ready' event for the target match
            const readyEvent: MatchEvent = {
                id: crypto.randomUUID(),
                match_id: targetMatchId,
                type: 'participant_ready',
                payload: {
                    slot: targetSlot,
                    teamId: teamId,
                    fromMatchId: sourceMatchId
                },
                created_at: new Date().toISOString()
            };
            await this.repo.addEvent(readyEvent);

            // Update Target Match Node (Denormalized)
            const updateField = targetSlot === 1 ? 'team1_id' : 'team2_id';
            await (supabase as any)
                .from('brkt_matches')
                .update({ [updateField]: teamId })
                .eq('id', targetMatchId);
        }
    }

    /**
     * Auto-advances all BYE matches in a bracket version.
     * A BYE match is one where only one team is present.
     */
    async autoAdvanceByes(versionId: string): Promise<number> {
        // Find all pending matches with exactly one team
        const { data: matches, error } = await (supabase as any)
            .from('brkt_matches')
            .select('*')
            .eq('version_id', versionId)
            .eq('status', 'pending');

        if (error) throw error;

        let advancedCount = 0;

        for (const match of matches) {
            const hasTeam1 = !!match.team1_id;
            const hasTeam2 = !!match.team2_id;

            // BYE condition: exactly one team present
            if ((hasTeam1 && !hasTeam2) || (!hasTeam1 && hasTeam2)) {
                const winnerId = hasTeam1 ? match.team1_id : match.team2_id;

                // Calculate score based on Best Of
                const bestOf = match.best_of || 1;
                const winnerScore = bestOf === 1 ? 13 : Math.ceil(bestOf / 2);

                const t1Score = hasTeam1 ? winnerScore : 0;
                const t2Score = hasTeam2 ? winnerScore : 0;

                // Update match as completed with winner and scores
                await (supabase as any)
                    .from('brkt_matches')
                    .update({
                        status: 'completed',
                        winner_id: winnerId,
                        loser_id: null,
                        team1_score: t1Score,
                        team2_score: t2Score
                    })
                    .eq('id', match.id);

                // Advance winner to next match
                await this.advanceTeam(match.id, versionId, 'winner', winnerId);
                advancedCount++;
            }
        }

        return advancedCount;
    }

    /**
     * Clears all bracket data for a version.
     */
    async clearBracket(versionId: string): Promise<void> {
        // Delete in reverse order of dependencies
        await (supabase as any)
            .from('brkt_match_events')
            .delete()
            .in('match_id',
                (supabase as any)
                    .from('brkt_matches')
                    .select('id')
                    .eq('version_id', versionId)
            );

        await (supabase as any)
            .from('brkt_layout')
            .delete()
            .eq('version_id', versionId);

        await (supabase as any)
            .from('brkt_advancements')
            .delete()
            .eq('version_id', versionId);

        await (supabase as any)
            .from('brkt_matches')
            .delete()
            .eq('version_id', versionId);

        await (supabase as any)
            .from('brkt_versions')
            .delete()
            .eq('id', versionId);
    }

    /**
     * Resets bracket matches (keeps structure, clears results).
     */
    async resetBracket(versionId: string): Promise<void> {
        // Get all matches for this version
        const { data: matches, error } = await (supabase as any)
            .from('brkt_matches')
            .select('id, round_index')
            .eq('version_id', versionId);

        if (error) throw error;

        // Reset all matches except Round 1 (keep seeding)
        for (const match of matches) {
            if (match.round_index === 0) {
                // Round 1: Keep team1_id and team2_id, clear winner/loser/status
                await (supabase as any)
                    .from('brkt_matches')
                    .update({
                        status: 'pending',
                        winner_id: null,
                        loser_id: null
                    })
                    .eq('id', match.id);
            } else {
                // Later rounds: Clear everything
                await (supabase as any)
                    .from('brkt_matches')
                    .update({
                        status: 'pending',
                        team1_id: null,
                        team2_id: null,
                        winner_id: null,
                        loser_id: null
                    })
                    .eq('id', match.id);
            }
        }

        // Delete all events
        await (supabase as any)
            .from('brkt_match_events')
            .delete()
            .in('match_id', matches.map((m: any) => m.id));
    }
}

