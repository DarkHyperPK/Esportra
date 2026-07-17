import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { SponsorAnalyticsPeriod, SponsorAudienceReport } from '@/types/sponsorAnalytics';

export function useAdminSponsorAudience(
  sponsorId: string | undefined,
  periodDays: SponsorAnalyticsPeriod,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['admin', 'sponsors', sponsorId, 'audience', periodDays],
    queryFn: () => apiClient.get<SponsorAudienceReport>(
      `/api/admin/sponsors/${sponsorId}/audience?days=${periodDays}`,
    ),
    enabled: enabled && !!sponsorId,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
