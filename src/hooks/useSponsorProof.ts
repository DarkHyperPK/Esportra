import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { sponsorProofResponseSchema } from '@/schemas/broadcastSchema';
import type { SponsorProofResponse } from '@/types/broadcast';

export const sponsorProofQueryKey = (showId: string) =>
  ['broadcast-sponsor-proof', showId] as const;

export function useSponsorProof(showId: string | undefined) {
  return useQuery({
    queryKey: sponsorProofQueryKey(showId ?? ''),
    queryFn: async (): Promise<SponsorProofResponse> => {
      const raw = await apiClient.get<SponsorProofResponse>(
        `/api/broadcast/shows/${showId}/sponsor-proof`,
      );
      return sponsorProofResponseSchema.parse(raw);
    },
    enabled: !!showId,
    staleTime: 60_000,
  });
}
