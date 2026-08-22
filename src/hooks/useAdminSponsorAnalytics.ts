import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface AnalyticsSummaryTrend {
  impressionsChangePercent: number;
  clicksChangePercent: number;
  ctrChangePercent: number;
  previousPeriodImpressions: number;
  previousPeriodClicks: number;
}

interface AdminAnalyticsSummary {
  schemaVersion: number;
  window: { startsOn: string; endsOnExclusive: string; generatedAt: string };
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  uniqueAudience: number;
  trend: AnalyticsSummaryTrend;
}

interface PlacementStat {
  placement: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface SlotStat {
  tournamentId: string | null;
  tournamentName: string | null;
  placementZone: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface DeviceStat {
  deviceClass: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface ContentStat {
  tournamentId: string | null;
  tournamentName: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
}

interface PageStat {
  pagePath: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

function onNotFound<T>(fallback: T) {
  return (err: unknown): T => {
    if (err && typeof err === 'object' && 'status' in err) {
      const s = (err as { status: number }).status;
      if (s === 403 || s === 404) return fallback;
    }
    throw err;
  };
}

export function useAdminSponsorSummary(sponsorId: string | undefined, days: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'sponsor-analytics', 'summary', sponsorId, days],
    queryFn: () =>
      apiClient.get<AdminAnalyticsSummary>(`/api/admin/sponsors/${sponsorId}/analytics/summary?days=${days}`)
        .catch(onNotFound(null)),
    enabled: enabled && !!sponsorId,
    staleTime: 60_000,
  });
}

export function useAdminSponsorPlacements(sponsorId: string | undefined, days: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'sponsor-analytics', 'placements', sponsorId, days],
    queryFn: () =>
      apiClient.get<{ placements: PlacementStat[] }>(`/api/admin/sponsors/${sponsorId}/analytics/placements?days=${days}`)
        .then(res => res?.placements ?? [])
        .catch(onNotFound([] as PlacementStat[])),
    enabled: enabled && !!sponsorId,
    staleTime: 60_000,
  });
}

export function useAdminSponsorSlots(sponsorId: string | undefined, days: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'sponsor-analytics', 'slots', sponsorId, days],
    queryFn: () =>
      apiClient.get<{ slots: SlotStat[] }>(`/api/admin/sponsors/${sponsorId}/analytics/slots?days=${days}`)
        .then(res => res?.slots ?? [])
        .catch(onNotFound([] as SlotStat[])),
    enabled: enabled && !!sponsorId,
    staleTime: 60_000,
  });
}

export function useAdminSponsorDevices(sponsorId: string | undefined, days: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'sponsor-analytics', 'devices', sponsorId, days],
    queryFn: () =>
      apiClient.get<{ devices: DeviceStat[] }>(`/api/admin/sponsors/${sponsorId}/analytics/devices?days=${days}`)
        .catch(onNotFound(null)),
    enabled: enabled && !!sponsorId,
    staleTime: 60_000,
  });
}

export function useAdminSponsorContent(sponsorId: string | undefined, days: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'sponsor-analytics', 'content', sponsorId, days],
    queryFn: () =>
      apiClient.get<{ tournaments: ContentStat[]; pages: PageStat[] }>(`/api/admin/sponsors/${sponsorId}/analytics/content?days=${days}`)
        .catch(onNotFound(null)),
    enabled: enabled && !!sponsorId,
    staleTime: 60_000,
  });
}
