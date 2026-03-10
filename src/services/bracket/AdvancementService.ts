import { apiClient } from '@/lib/apiClient';

export class AdvancementService {
    /**
     * Auto-advances all BYE matches in a bracket version.
     * Delegates to POST /api/brackets/{versionId}/advance-byes on the .NET API.
     */
    async autoAdvanceByes(versionId: string): Promise<number> {
        const result = await apiClient.post(`/api/brackets/${versionId}/advance-byes`);
        return result.advanced || 0;
    }

    /**
     * Clears all bracket data for a version.
     * Delegates to DELETE /api/brackets/{versionId} on the .NET API.
     */
    async clearBracket(versionId: string): Promise<void> {
        await apiClient.delete(`/api/brackets/${versionId}`);
    }

    /**
     * Resets bracket matches (keeps structure, clears results).
     * Delegates to POST /api/brackets/{versionId}/reset on the .NET API.
     */
    async resetBracket(versionId: string): Promise<void> {
        await apiClient.post(`/api/brackets/${versionId}/reset`);
    }
}
