import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/apiClient';
import { vodChaptersApiResponseSchema } from '@/schemas/broadcastSchema';
import type { VodChaptersApiResponse, VodChaptersResult } from '@/types/broadcast';

export const vodChaptersQueryKey = (showId: string) =>
  ['broadcast-vod-chapters', showId] as const;

export function useVodChapters(showId: string | undefined) {
  return useQuery({
    queryKey: vodChaptersQueryKey(showId ?? ''),
    queryFn: async (): Promise<VodChaptersResult> => {
      try {
        const raw = await apiClient.get<VodChaptersApiResponse>(
          `/api/broadcast/shows/${showId}/vod-chapters`,
        );
        const validated = vodChaptersApiResponseSchema.parse(raw);
        return { showNotEnded: false, chapters: validated.chapters };
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          return { showNotEnded: true, chapters: [] };
        }
        throw err;
      }
    },
    enabled: !!showId,
    staleTime: 60_000,
  });
}
