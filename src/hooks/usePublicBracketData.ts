import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface Stage {
    id: string;
    name: string;
    stage_order: number;
    format?: string;
    best_of?: number | null;
    bo_mode?: 'per_stage' | 'per_round';
    round_bo_overrides?: Record<string, number>;
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

type UsePublicBracketDataOptions = {
    /** When false, skip fetching entirely. */
    enabled?: boolean;
    /** Bracket version lookup is only needed on bracket/leaderboard views. */
    includeVersions?: boolean;
};

export const usePublicBracketData = (
    tournamentId: string | undefined,
    options: UsePublicBracketDataOptions = {},
) => {
    const { enabled = true, includeVersions = true } = options;
    const canFetch = enabled && !!tournamentId;

    const stagesQuery = useQuery({
        queryKey: ['tournament-stages', tournamentId],
        queryFn: async () => {
            const stagesData = await apiClient.get<Stage[]>(`/api/tournaments/${tournamentId}/stages`);
            return (stagesData || []).sort((a, b) => a.stage_order - b.stage_order);
        },
        enabled: canFetch,
        staleTime: 2 * 60 * 1000,
    });

    const versionsQuery = useQuery({
        queryKey: ['tournament-bracket-versions', tournamentId],
        queryFn: async () =>
            apiClient.get<BracketVersion[]>(
                `/api/tournaments/${tournamentId}/bracket-versions?status=active,draft,completed`
            ),
        enabled: canFetch && includeVersions,
        staleTime: 2 * 60 * 1000,
    });

    const stages = stagesQuery.data ?? [];
    const activeVersionsMap: Record<string, string> = {};

    if (includeVersions && versionsQuery.data) {
        for (const stage of stages) {
            const stageVersions = versionsQuery.data
                .filter(v => v.stage_id === stage.id)
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            if (stageVersions.length > 0) {
                activeVersionsMap[stage.id] = stageVersions[0].id;
            }
        }
    }

    const loading = stagesQuery.isLoading || (includeVersions && versionsQuery.isLoading);
    const error = (stagesQuery.error ?? versionsQuery.error) as Error | null;

    const refetch = async () => {
        await Promise.all([
            stagesQuery.refetch(),
            includeVersions ? versionsQuery.refetch() : Promise.resolve(),
        ]);
    };

    return {
        stages,
        activeVersionsMap,
        loading,
        error,
        refetch,
    };
};
