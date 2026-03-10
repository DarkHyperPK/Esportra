/**
 * GraphMatchService
 *
 * Dedicated service for all match operations in the new graph bracket engine.
 * Now delegates to .NET API endpoints instead of direct Supabase calls.
 */

import { apiClient } from '@/lib/apiClient';

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
            await apiClient.post(`/api/matches/${matchId}/go-live`, {
                partyCode: partyCode.trim().toUpperCase()
            });
            return { success: true };
        } catch (e: any) {
            console.error('[GraphMatchService.goLive] Exception:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Complete workflow: Save score and advance teams.
     * Server-side handles: score save, advancement, grand finals reset, stage completion.
     */
    static async saveScoreAndAdvance(
        matchId: string,
        team1Score: number,
        team2Score: number,
        team1Id: string | null,
        team2Id: string | null
    ): Promise<{ success: boolean; error?: string; stageId?: string; stageComplete?: boolean }> {
        try {
            const result = await apiClient.post(`/api/matches/${matchId}/save-score`, {
                team1Score,
                team2Score,
                team1Id,
                team2Id
            });
            return {
                success: true,
                stageId: result.stageId,
                stageComplete: result.stageComplete
            };
        } catch (e: any) {
            console.error('[GraphMatchService.saveScoreAndAdvance] Exception:', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Clear all data for a bracket version.
     */
    static async clearBracket(versionId: string): Promise<{ success: boolean; error?: string }> {
        try {
            await apiClient.delete(`/api/brackets/${versionId}`);
            return { success: true };
        } catch (e: any) {
            console.error('[GraphMatchService.clearBracket] Exception:', e);
            return { success: false, error: e.message };
        }
    }
}
