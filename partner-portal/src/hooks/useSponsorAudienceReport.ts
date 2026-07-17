import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { SponsorAnalyticsPeriod, SponsorAudienceReport } from '@/types/sponsorAnalytics';

export function useSponsorAudienceReport(periodDays: SponsorAnalyticsPeriod, enabled: boolean) {
  return useQuery({
    queryKey: ['partner', 'sponsor-analytics', 'audience', periodDays],
    queryFn: () => apiClient.get<SponsorAudienceReport>(`/api/sponsors/me/audience?days=${periodDays}`),
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
