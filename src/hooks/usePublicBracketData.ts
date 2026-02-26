import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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
            // Single nested query to fetch stages and their associated versions
            const { data: stagesData, error: stagesError } = await supabase
                .from('tournament_stages')
                .select(`
                    id, name, stage_order, format, scheduling_config,
                    brkt_versions(id, status, created_at)
                `)
                .eq('tournament_id', tournamentId)
                .in('brkt_versions.status', ['active', 'draft', 'completed'])
                .order('stage_order', { ascending: true });

            if (stagesError) throw stagesError;

            const validStages = stagesData || [];

            // Map stages and extract active versions in one pass
            const vMap: Record<string, string> = {};
            const processedStages = validStages.map(stage => {
                // Versions are ordered by created_at desc locally to be safe,
                // or we pick the first one from the sorted array
                const sortedVersions = (stage.brkt_versions as any[] || [])
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                if (sortedVersions.length > 0) {
                    vMap[stage.id] = sortedVersions[0].id;
                }

                return {
                    id: stage.id,
                    name: stage.name,
                    stage_order: stage.stage_order,
                    format: stage.format,
                    scheduling_config: stage.scheduling_config
                } as Stage;
            });

            setStages(processedStages);
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
