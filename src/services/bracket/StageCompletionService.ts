import { supabase } from '@/lib/supabase';
import { standingsService } from './StandingsService';

// Bypass type checking for tables not in Supabase types
const db = supabase as any;

interface Stage {
    id: string;
    tournament_id: string;
    name: string;
    format: string;
    stage_order: number;
    advancement_count: number | null;
    status: string;
    capacity: number | null;
}

interface AdvancingTeam {
    team_id: string;
    team_name: string;
    seed: number;
}

export class StageCompletionService {
    /**
     * Checks if a stage has met its completion criteria based on advancement_count.
     * - For elimination formats: checks if remaining teams <= advancement_count
     * - For Swiss/RR: checks if all matches are completed
     */
    async checkStageCompletion(stageId: string): Promise<{
        isComplete: boolean;
        advancingTeams: AdvancingTeam[];
        reason?: string;
    }> {
        // 1. Get stage info
        const { data: stage, error: stageError } = await db
            .from('tournament_stages')
            .select('*')
            .eq('id', stageId)
            .single();

        if (stageError || !stage) {
            return { isComplete: false, advancingTeams: [], reason: 'Stage not found' };
        }

        const advancementCount = stage.advancement_count || 1; // Default to 1 (single winner)

        // 1.5 Get participants count to validate advancement criteria
        let participantsCount: number | null = 0;

        if (stage.stage_order === 1) {
            const { count } = await db
                .from('tournament_participants')
                .select('*', { count: 'exact', head: true })
                .eq('tournament_id', stage.tournament_id)
                // Optionally filter for check-in if required by tournament?
                // For validation purposes, we just want to ensure we don't advance more than possible.
                // Assuming all potential participants.
                .not('status', 'eq', 'pending'); // Exclude pending
            participantsCount = count;
        } else {
            const { count } = await db
                .from('stage_participants')
                .select('*', { count: 'exact', head: true })
                .eq('stage_id', stageId);
            participantsCount = count;
        }

        if (participantsCount !== null && advancementCount >= participantsCount) {
            return {
                isComplete: false,
                advancingTeams: [],
                reason: `Invalid Configuration: Advancement count (${advancementCount}) must be less than participants (${participantsCount}) to ensure elimination.`
            };
        }

        // 2. Get bracket version for this stage
        const { data: version } = await db
            .from('brkt_versions')
            .select('id')
            .eq('stage_id', stageId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        if (!version) {
            return { isComplete: false, advancingTeams: [], reason: 'No bracket found' };
        }

        // 3. Get all matches for this bracket
        const { data: matches, error: matchError } = await db
            .from('brkt_matches')
            .select('*')
            .eq('version_id', version.id);

        if (matchError || !matches || matches.length === 0) {
            return { isComplete: false, advancingTeams: [], reason: 'No matches found' };
        }

        // 4. Check completion based on format
        const format = stage.format || 'single_elimination';

        if (format === 'single_elimination' || format === 'double_elimination') {
            return this.checkEliminationCompletion(matches, advancementCount, stageId);
        } else if (format === 'swiss' || format === 'round_robin') {
            return this.checkRoundRobinCompletion(matches, advancementCount, stageId, stage);
        }

        return { isComplete: false, advancingTeams: [], reason: 'Unknown format' };
    }

    /**
     * For elimination formats: Stage is complete when remaining teams <= advancement_count
     */
    private async checkEliminationCompletion(
        matches: any[],
        advancementCount: number,
        stageId: string
    ): Promise<{ isComplete: boolean; advancingTeams: AdvancingTeam[]; reason?: string }> {
        // Find all matches that have winners
        const completedMatches = matches.filter(m => m.winner_id && m.status === 'completed');
        const pendingMatches = matches.filter(m => m.status === 'pending' || m.status === 'in_progress');

        // Get the final round matches (highest round_index)
        const maxRound = Math.max(...matches.map(m => m.round_index));
        const finalRoundMatches = matches.filter(m => m.round_index === maxRound);

        // Stage is complete if all matches in the final round are completed
        // This happens when remaining teams = advancementCount
        const allFinalMatchesComplete = finalRoundMatches.every(m =>
            m.status === 'completed' || m.winner_id
        );

        if (!allFinalMatchesComplete) {
            return {
                isComplete: false,
                advancingTeams: [],
                reason: `${pendingMatches.length} matches remaining`
            };
        }

        // Get winners from final round (these are the advancing teams)
        // Sort by match_number to preserve bracket seeding (better performers have lower match numbers)
        // Limit to advancementCount to ensure we don't advance more teams than configured
        const sortedFinalRoundMatches = [...finalRoundMatches].sort((a, b) => a.match_number - b.match_number);
        const winnerIds = sortedFinalRoundMatches
            .filter(m => m.winner_id)
            .map(m => m.winner_id)
            .slice(0, advancementCount);

        // Fetch team info for winners
        const advancingTeams = await this.getTeamInfo(winnerIds);

        // Check if we have enough winners, OR if there are no more matches to play
        // If the bracket is fully played out but we have more winners than advancementCount (e.g. 4 winners, advance 3),
        // we should still consider it complete and advance all 4 (or let the organizer handle it).
        const isComplete = (advancingTeams.length <= advancementCount && advancingTeams.length > 0) || pendingMatches.length === 0;

        return {
            isComplete,
            advancingTeams,
            reason: isComplete
                ? `${advancingTeams.length} teams ready to advance`
                : `${pendingMatches.length} matches remaining`
        };
    }

    /**
     * For Swiss/RR formats: Stage is complete when all matches are played
     */
    private async checkRoundRobinCompletion(
        matches: any[],
        advancementCount: number,
        stageId: string,
        stage?: any
    ): Promise<{ isComplete: boolean; advancingTeams: AdvancingTeam[]; reason?: string }> {
        const pendingMatches = matches.filter(m => m.status !== 'completed');

        // Check Swiss Rounds
        const isSwiss = stage?.format === 'swiss';
        const swissRounds = stage?.config?.swiss_rounds || 0;

        if (isSwiss && swissRounds > 0) {
            const maxRound = Math.max(...matches.map((m: any) => m.round_number || m.round_index + 1), 0);
            // If we haven't reached the target rounds, we are not complete
            if (maxRound < swissRounds) {
                return {
                    isComplete: false,
                    advancingTeams: [],
                    reason: `Round ${maxRound} of ${swissRounds} completed. Generate next round.`
                };
            }
        }

        if (pendingMatches.length > 0) {
            return {
                isComplete: false,
                advancingTeams: [],
                reason: `${pendingMatches.length} matches remaining`
            };
        }

        // All matches complete - Calculate Advancement
        const swissGroups = stage?.config?.swiss_groups || 1;
        let advancingTeams: AdvancingTeam[] = [];

        if (swissGroups > 1) {
            // Multi-group advancement
            const advancePerGroup = Math.floor(advancementCount / swissGroups);

            // Identify groups from matches
            const groupIds = Array.from(new Set(matches.map((m: any) => m.group_id).filter(Boolean))) as string[];

            // If no group IDs found but swissGroups > 1, fallback to global (shouldn't happen if generated correctly)
            if (groupIds.length === 0) {
                const standings = await standingsService.calculateStandings(stageId);
                advancingTeams = standings.slice(0, advancementCount).map(s => ({
                    team_id: s.teamId,
                    team_name: s.teamName,
                    seed: s.rank
                }));
            } else {
                // Sort group IDs to ensure deterministic order (e.g. Group A, Group B...)
                groupIds.sort();

                const baseAdvancement = Math.floor(advancementCount / swissGroups);
                const remainder = advancementCount % swissGroups;

                for (let i = 0; i < groupIds.length; i++) {
                    const groupId = groupIds[i];
                    // Distribute remainder spots to first 'remainder' groups
                    const countForGroup = baseAdvancement + (i < remainder ? 1 : 0);

                    const standings = await standingsService.calculateStandings(stageId, groupId);
                    const groupAdvancers = standings.slice(0, countForGroup).map(s => ({
                        team_id: s.teamId,
                        team_name: s.teamName,
                        seed: s.rank // Rank within group
                    }));
                    advancingTeams.push(...groupAdvancers);
                }
            }
        } else {
            // Standard single group
            const standings = await standingsService.calculateStandings(stageId);
            advancingTeams = standings.slice(0, advancementCount).map(s => ({
                team_id: s.teamId,
                team_name: s.teamName,
                seed: s.rank
            }));
        }

        return {
            isComplete: true,
            advancingTeams,
            reason: `${advancingTeams.length} teams ready to advance`
        };
    }

    // calculateStandings removed - delegated to StandingsService

    /**
     * Fetch team info from database
     */
    private async getTeamInfo(teamIds: string[]): Promise<AdvancingTeam[]> {
        if (teamIds.length === 0) return [];

        const { data: teams } = await db
            .from('teams')
            .select('id, name')
            .in('id', teamIds);

        return (teams || []).map((t, idx) => ({
            team_id: t.id,
            team_name: t.name,
            seed: idx + 1
        }));
    }

    /**
     * Advance teams to the next stage.
     * Creates tournament_participants entries for the next stage.
     */
    async advanceTeamsToNextStage(currentStageId: string): Promise<{
        success: boolean;
        nextStageId?: string;
        advancedCount?: number;
        error?: string;
        isFinalStage?: boolean;
    }> {
        // 1. Check if stage is complete
        const { isComplete, advancingTeams, reason } = await this.checkStageCompletion(currentStageId);

        if (!isComplete) {
            return { success: false, error: `Stage not complete: ${reason}` };
        }

        // 2. Get current stage info
        const { data: currentStage } = await db
            .from('tournament_stages')
            .select('tournament_id, stage_order')
            .eq('id', currentStageId)
            .single();

        if (!currentStage) {
            return { success: false, error: 'Current stage not found' };
        }

        // 3. Find next stage by stage_order
        const { data: nextStage } = await db
            .from('tournament_stages')
            .select('id, name')
            .eq('tournament_id', currentStage.tournament_id)
            .eq('stage_order', currentStage.stage_order + 1)
            .single();

        if (!nextStage) {
            // This is the final stage - mark as complete
            await db
                .from('tournament_stages')
                .update({ status: 'completed' })
                .eq('id', currentStageId);

            // --- Tournament Completion Logic ---
            // If we have at least one team, the top one is the champion
            if (advancingTeams.length > 0) {
                const championId = advancingTeams[0].team_id;
                console.log(`[StageCompletionService] Tournament ${currentStage.tournament_id} finished! Champion: ${championId}`);

                // Update tournament with winner and status
                await db
                    .from('tournaments')
                    .update({
                        winner_id: championId,
                        status: 'completed'
                    })
                    .eq('id', currentStage.tournament_id);
            } else {
                // If no teams (weird case), at least mark tournament as completed
                await db
                    .from('tournaments')
                    .update({ status: 'completed' })
                    .eq('id', currentStage.tournament_id);
            }

            console.log('[StageCompletionService] Final stage completed - tournament is finished!');
            return {
                success: true,
                advancedCount: 0,
                isFinalStage: true
            };
        }

        // 4. Insert advancing teams into stage_participants for the next stage
        // Fix: Use check-then-insert instead of upsert to avoid "no unique constraint" error
        const { data: existingParticipants } = await db
            .from('stage_participants')
            .select('team_id')
            .eq('stage_id', nextStage.id);

        const existingTeamIds = new Set((existingParticipants || []).map((p: any) => p.team_id));

        const participantEntries = advancingTeams
            .filter(team => !existingTeamIds.has(team.team_id))
            .map((team) => ({
                stage_id: nextStage.id,
                team_id: team.team_id
            }));

        if (participantEntries.length > 0) {
            const { error: insertError } = await db
                .from('stage_participants')
                .insert(participantEntries);

            if (insertError) {
                console.error('[StageCompletionService] Failed to insert stage_participants:', insertError);
                return { success: false, error: `Failed to enroll teams in next stage: ${insertError.message}` };
            }
        }

        console.log(`[StageCompletionService] ${advancingTeams.length} teams enrolled in stage ${nextStage.id}:`,
            advancingTeams.map(t => t.team_name).join(', '));

        // 5. Update stage statuses
        await db
            .from('tournament_stages')
            .update({ status: 'completed' })
            .eq('id', currentStageId);

        await db
            .from('tournament_stages')
            .update({ status: 'upcoming' })
            .eq('id', nextStage.id);

        return {
            success: true,
            nextStageId: nextStage.id,
            advancedCount: advancingTeams.length
        };
    }

    /**
     * Get the next stage for a given stage
     */
    async getNextStage(currentStageId: string): Promise<Stage | null> {
        const { data: currentStage } = await db
            .from('tournament_stages')
            .select('tournament_id, stage_order')
            .eq('id', currentStageId)
            .single();

        if (!currentStage) return null;

        const { data: nextStage } = await db
            .from('tournament_stages')
            .select('*')
            .eq('tournament_id', currentStage.tournament_id)
            .eq('stage_order', currentStage.stage_order + 1)
            .single();

        return nextStage as Stage | null;
    }
}

// Export singleton instance
export const stageCompletionService = new StageCompletionService();
