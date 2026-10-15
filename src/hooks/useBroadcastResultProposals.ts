import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';

const proposalSchema = z.object({
  id: z.string().uuid(), matchId: z.string().uuid(), mapNumber: z.number().int(),
  teamAScore: z.number().int(), teamBScore: z.number().int(), reason: z.string(),
  status: z.enum(['pending', 'applied', 'rejected']), teamAName: z.string().nullable(), teamBName: z.string().nullable(),
  matchStatus: z.string().nullable(), currentTeamAScore: z.number().int().nullable(), currentTeamBScore: z.number().int().nullable(),
  createdAt: z.string(), reviewedAt: z.string().nullable(),
});
const responseSchema = z.object({ canReview: z.boolean(), proposals: z.array(proposalSchema) });
export type BroadcastResultProposal = z.infer<typeof proposalSchema>;
export function useBroadcastResultProposals(showId: string) {
  const client = useQueryClient(), key = ['broadcast-result-proposals', showId];
  const query = useQuery({ queryKey: key, queryFn: async () => responseSchema.parse(await apiClient.get<unknown>(`/api/broadcast/shows/${showId}/result-proposals`)), enabled: !!showId, refetchInterval: 5000, retry: false });
  const review = useMutation({ mutationFn: ({ proposal, decision }: { proposal: BroadcastResultProposal; decision: 'apply' | 'reject' }) =>
    apiClient.post<{ ok: boolean; status: string }>(`/api/broadcast/shows/${showId}/result-proposals/${proposal.id}/review`, {
      decision, currentTeamAScore: proposal.currentTeamAScore, currentTeamBScore: proposal.currentTeamBScore,
    }), onSuccess: () => { void client.invalidateQueries({ queryKey: key }); void client.invalidateQueries({ queryKey: ['broadcast-show', showId] }); } });
  return { query, review };
}
