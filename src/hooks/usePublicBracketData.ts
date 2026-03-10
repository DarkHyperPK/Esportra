import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';

export interface Stage {
    id: string;
    name: string;
    stage_order: number;
    format?: string;
    scheduling_config?: {
        self_play_enabled?: boolean;
        checkin_window_minutes?: number;
    };
}

interface BracketVersion {
    id: string;
    stage_id: string;
    status: string;
    version_number: number;
    created_at: string;
}

export const usePublicBracketData = (tournamentId: string | undefined) => {
    const [stages, setStages] = useState<Stage[]>([]);
    const [activeVersionsMap, setActiveVersionsMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchBracketData = useCallback(async () => {
        if (!tournamentId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const [stagesData, versionsData] = await Promise.all([
                apiClient.get<Stage[]>(`/api/tournaments/${tournamentId}/stages`),
                apiClient.get<BracketVersion[]>(
                    `/api/tournaments/${tournamentId}/bracket-versions?status=active,draft,completed`
                ),
            ]);

            const sortedStages = (stagesData || [])
                .sort((a, b) => a.stage_order - b.stage_order);

            // Build version map: for each stage, pick the most recent version
            const vMap: Record<string, string> = {};
            for (const stage of sortedStages) {
                const stageVersions = (versionsData || [])
                    .filter(v => v.stage_id === stage.id)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                if (stageVersions.length > 0) {
                    vMap[stage.id] = stageVersions[0].id;
                }
            }

            setStages(sortedStages);
            setActiveVersionsMap(vMap);
        } catch (err: any) {
            console.error('Error fetching bracket data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => {
        fetchBracketData();
    }, [fetchBracketData]);

    return { stages, activeVersionsMap, loading, error, refetch: fetchBracketData };
};
