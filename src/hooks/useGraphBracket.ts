import { useQuery } from '@tanstack/react-query';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { useBracketRealtime } from './useBracketRealtime';

const repo = new MatchRepository();

export const useGraphBracket = (versionId: string, tournamentId?: string) => {
    // Subscribe to realtime updates - this will update the cache automatically
    // when brkt_matches or brkt_advancements change
    useBracketRealtime({
        tournamentId: tournamentId || '',
        versionId,
        enabled: !!versionId
    });

    return useQuery({
        queryKey: ['bracket-graph', versionId],
        queryFn: async () => {
            if (!versionId) throw new Error('Version ID is required');
            return repo.getGraphStructure(versionId);
        },
        enabled: !!versionId,
        staleTime: 30_000,
    });
};
