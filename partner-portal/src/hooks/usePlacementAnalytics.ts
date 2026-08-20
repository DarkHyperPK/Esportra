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
    queryFn: async () => {
      try {
        return await apiClient.get<PlacementStat[]>(`/api/sponsors/me/analytics/placements?days=${days}`);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && ((err as { status: number }).status === 404 || (err as { status: number }).status === 500)) return [];
        throw err;
      }
    },
    retry: false,
  });
}

export interface DailyPerformance {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export function useAnalyticsPerformance(days = 30) {
  return useQuery({
    queryKey: ['sponsor', 'analytics', 'performance', days],
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ days: DailyPerformance[] }>(`/api/sponsors/me/analytics/performance?days=${days}`);
        return res?.days ?? [];
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && ((err as { status: number }).status === 404 || (err as { status: number }).status === 500)) return [];
        throw err;
      }
    },
    retry: false,
  });
}

export function useAnalyticsSummary(days = 30) {
  return useQuery({
    queryKey: ['sponsor', 'analytics', 'summary', days],
    queryFn: async () => {
      try {
        return await apiClient.get<AnalyticsSummary>(`/api/sponsors/me/analytics/summary?days=${days}`);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && ((err as { status: number }).status === 404 || (err as { status: number }).status === 500)) return null;
        throw err;
      }
    },
    retry: false,
  });
}
