import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

interface PlacementStat {
  placement: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface AnalyticsSummary {
  impressions: number;
  clicks: number;
  ctr: number;
  impressionsTrend: number;
  clicksTrend: number;
}

export function usePlacementAnalytics(days = 30) {
  return useQuery({
    queryKey: ['sponsor', 'analytics', 'placements', days],
    queryFn: () => apiClient.get<PlacementStat[]>(`/api/sponsors/me/analytics/placements?days=${days}`),
  });
}

export function useAnalyticsSummary(days = 30) {
  return useQuery({
    queryKey: ['sponsor', 'analytics', 'summary', days],
    queryFn: () => apiClient.get<AnalyticsSummary>(`/api/sponsors/me/analytics/summary?days=${days}`),
  });
}
