import { apiClient } from '@/lib/apiClient';

export interface TeamStanding {
    teamId: string;
    teamName: string;
    played: number;
    wins: number;
    losses: number;
    ties: number;
    points: number;
    buchholz: number; // Sum of opponents' points (Solkoff)
    scoreDiff: number; // Round difference
    rank: number;
}

export class StandingsService {
    /**
     * Calculate standings for a specific stage or group.
     * Delegates to GET /api/brackets/{versionId}/standings on the .NET API.
     * Note: The API expects a versionId, but callers pass stageId.
     * The API resolves the stage internally.
     */
    async calculateStandings(stageId: string, groupId?: string): Promise<TeamStanding[]> {
        try {
            const params = new URLSearchParams();
            if (groupId) params.set('groupId', groupId);
            // The backend resolves stageId from brkt_versions, so we pass stageId as versionId
            // and let the endpoint handle it. If needed, we can look up the version first.
            // For now, use a dedicated standings-by-stage endpoint pattern:
            const url = `/api/stages/${stageId}/standings${params.toString() ? `?${params}` : ''}`;
            return await apiClient.get(url);
        } catch (e) {
            console.error('[StandingsService] Error fetching standings:', e);
            return [];
        }
    }
}

export const standingsService = new StandingsService();
