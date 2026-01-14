import { useQuery } from '@tanstack/react-query';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { BracketNode, BracketEdge } from '@/types/bracket-graph';

const repo = new MatchRepository();

export const useGraphBracket = (versionId: string) => {
    return useQuery({
        queryKey: ['bracket-graph', versionId],
        queryFn: async () => {
            if (!versionId) throw new Error('Version ID is required');
            return repo.getGraphStructure(versionId);
        },
        enabled: !!versionId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
