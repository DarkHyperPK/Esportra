import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/apiClient';
import { postShowReportSchema } from '@/schemas/broadcastSchema';
import type { PostShowReport, PostShowReportResult } from '@/types/broadcast';

export const postShowReportQueryKey = (showId: string) =>
  ['broadcast-post-show-report', showId] as const;

export function usePostShowReport(showId: string | undefined) {
  return useQuery({
    queryKey: postShowReportQueryKey(showId ?? ''),
    queryFn: async (): Promise<PostShowReportResult> => {
      try {
        const raw = await apiClient.get<PostShowReport>(
          `/api/broadcast/shows/${showId}/report`,
        );
        const report = postShowReportSchema.parse(raw);
        return { showNotEnded: false, forbidden: false, report };
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          return { showNotEnded: true, forbidden: false, report: null };
        }
        if (err instanceof ApiError && err.status === 403) {
          return { showNotEnded: false, forbidden: true, report: null };
        }
        throw err;
      }
    },
    enabled: !!showId,
    staleTime: 60_000,
  });
}
