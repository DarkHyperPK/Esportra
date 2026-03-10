import { apiClient } from '@/lib/apiClient';

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

export class StageCompletionService {
    /**
     * Checks if a stage has met its completion criteria.
     */
    async checkStageCompletion(stageId: string): Promise<{
        isComplete: boolean;
        advancingTeams: AdvancingTeam[];
        reason?: string;
    }> {
        try {
            const result = await apiClient.get(`/api/stages/${stageId}/completion-status`);
            return {
                isComplete: result.isComplete,
                advancingTeams: (result.advancingTeams || []).map((t: any) => ({
                    team_id: t.teamId,
                    team_name: t.teamName,
                    seed: t.seed
                })),
                reason: result.reason
            };
        } catch (err: any) {
            return { isComplete: false, advancingTeams: [], reason: err.message || 'Error checking completion' };
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
            const result = await apiClient.post(`/api/stages/${currentStageId}/advance`);
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
