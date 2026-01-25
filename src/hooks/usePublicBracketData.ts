import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Stage {
    id: string;
    name: string;
    stage_order: number;
    // Add other fields if necessary
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
            // 1. Fetch Stages
            const { data: stagesData, error: stagesError } = await supabase
                .from('tournament_stages')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('stage_order', { ascending: true });

            if (stagesError) throw stagesError;

            const validStages = stagesData || [];
            setStages(validStages);

            // 2. Fetch Active Versions for each stage
            if (validStages.length > 0) {
                const stageIds = validStages.map(s => s.id);

                // Allow 'active' AND 'draft' for flexibility in public viewing during testing
                const { data: versions } = await supabase
                    .from('brkt_versions')
                    .select('id, stage_id, status, created_at')
                    .in('stage_id', stageIds)
                    .in('status', ['active', 'draft', 'completed'])
                    .order('created_at', { ascending: false });

                const vMap: Record<string, string> = {};
                (versions || []).forEach((v: any) => {
                    // Since ordered by created_at desc, first one we see for a stage is the latest
                    if (!vMap[v.stage_id]) {
                        vMap[v.stage_id] = v.id;
                    }
                });
                setActiveVersionsMap(vMap);
            }
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
