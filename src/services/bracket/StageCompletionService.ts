import { apiClient } from '@/lib/apiClient';
import type { StageCompletionStatus } from '@/types/stageCompletion';
import { normalizeStageProgressLabel } from '@/types/stageCompletion';

interface AdvancingTeam {
    team_id: string;
    team_name: string;
    seed: number;
}

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

interface StageCompletionApiResponse {
    isComplete: boolean;
    alreadyAdvanced?: boolean;
    progressLabel?: string;
    reason?: string;
    groupsTotal?: number;
    groupsWithCompletedRounds?: number;
    advancingTeams?: Array<{ teamId?: string; team_id?: string; teamName?: string; team_name?: string; seed: number }>;
}

export class StageCompletionService {
    /**
     * Checks if a stage has met its completion criteria.
     */
    async checkStageCompletion(stageId: string): Promise<StageCompletionStatus & { advancingTeams: AdvancingTeam[] }> {
        try {
            const result = await apiClient.get<StageCompletionApiResponse>(`/api/stages/${stageId}/completion-status`);
            return {
                isComplete: result.isComplete,
                alreadyAdvanced: Boolean(result.alreadyAdvanced),
                progressLabel: normalizeStageProgressLabel(result.progressLabel),
                reason: result.reason,
                groupsTotal: result.groupsTotal,
                groupsWithCompletedRounds: result.groupsWithCompletedRounds,
                advancingTeams: (result.advancingTeams || []).map((t) => ({
                    team_id: t.team_id ?? t.teamId ?? '',
                    team_name: t.team_name ?? t.teamName ?? '',
                    seed: t.seed,
                })),
            };
        } catch (err: any) {
            return {
                isComplete: false,
                alreadyAdvanced: false,
                progressLabel: 'setup',
                advancingTeams: [],
                reason: err.message || 'Error checking completion',
            };
        }
    }

    /**
     * Advance teams to the next stage.
     */
    async advanceTeamsToNextStage(currentStageId: string): Promise<{
        success: boolean;
        nextStageId?: string;
        advancedCount?: number;
        error?: string;
        isFinalStage?: boolean;
    }> {
        try {
            const result = await apiClient.post<{
                success: boolean;
                nextStageId?: string;
                advancedCount?: number;
                error?: string;
                isFinalStage?: boolean;
            }>(`/api/stages/${currentStageId}/advance`);
            return {
                success: result.success,
                nextStageId: result.nextStageId,
                advancedCount: result.advancedCount,
                error: result.error,
                isFinalStage: result.isFinalStage
            };
        } catch (err: any) {
            return { success: false, error: err.message || 'Error advancing teams' };
        }
    }

    /**
     * Get the next stage for a given stage.
     */
    async getNextStage(currentStageId: string): Promise<Stage | null> {
        try {
            return await apiClient.get(`/api/stages/${currentStageId}/next`);
        } catch {
            return null;
        }
    }
}

// Export singleton instance
export const stageCompletionService = new StageCompletionService();
