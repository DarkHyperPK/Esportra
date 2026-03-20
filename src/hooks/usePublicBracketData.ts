import { useQuery } from '@tanstack/react-query';
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
    const { data, isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ['public-bracket', tournamentId],
        queryFn: async () => {
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

            return { stages: sortedStages, activeVersionsMap: vMap };
        },
        enabled: !!tournamentId,
        staleTime: 30 * 1000,
    });

    return {
        stages: data?.stages ?? [],
        activeVersionsMap: data?.activeVersionsMap ?? {},
        loading,
        error: queryError as Error | null,
        refetch,
    };
};
