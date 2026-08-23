import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

interface PlacementStat {
  placement: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface AnalyticsSummaryTrend {
  impressionsChangePercent: number;
  clicksChangePercent: number;
  ctrChangePercent: number;
  previousPeriodImpressions: number;
  previousPeriodClicks: number;
}

interface AnalyticsSummary {
  schemaVersion: number;
  window: { startsOn: string; endsOnExclusive: string; generatedAt: string };
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  uniqueAudience: number;
  trend: AnalyticsSummaryTrend;
}

export function usePlacementAnalytics(days = 30) {
  return useQuery({
    queryKey: ['sponsor', 'analytics', 'placements', days],
      queryFn: async () => {
        try {
          const res = await apiClient.get<{ placements: PlacementStat[] }>(`/api/sponsors/me/analytics/placements?days=${days}`);
          return res?.placements ?? [];
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

export interface DeviceStat {
  deviceClass: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface DeviceAnalytics {
  devices: DeviceStat[];
  dailyBreakdown: Array<{ date: string; deviceClass: string; impressions: number; clicks: number; ctr: number }>;
}

export function useDeviceAnalytics(days = 30, enabled = true) {
  return useQuery({
    queryKey: ['sponsor', 'analytics', 'devices', days],
    queryFn: async () => {
      try {
        return await apiClient.get<DeviceAnalytics>(`/api/sponsors/me/analytics/devices?days=${days}`);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && ((err as { status: number }).status === 403 || (err as { status: number }).status === 404)) return null;
        throw err;
      }
    },
    enabled,
    retry: false,
  });
}

export interface ContentStat {
  tournamentId: string | null;
  tournamentName: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface PageStat {
  pagePath: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface ContentAnalytics {
  tournaments: ContentStat[];
  pages: PageStat[];
}

export function useContentAnalytics(days = 30, enabled = true) {
  return useQuery({
    queryKey: ['sponsor', 'analytics', 'content', days],
    queryFn: async () => {
      try {
        return await apiClient.get<ContentAnalytics>(`/api/sponsors/me/analytics/content?days=${days}`);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'status' in err && ((err as { status: number }).status === 403 || (err as { status: number }).status === 404)) return null;
        throw err;
      }
    },
    enabled,
    retry: false,
  });
}
