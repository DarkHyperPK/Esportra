import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { competitiveApiClient } from '@/hooks/competitive/competitiveApiClient';
import { scrimInsightsKeys } from '@/hooks/competitive/queryKeys';
import { scrimPlayerReportSchema, scrimTeamReportSchema } from '@/schemas/scrimReport';
import { scrimFightsSchema } from '@/schemas/scrimFights';
import { scrimHeatmapSchema } from '@/schemas/scrimHeatmap';
import { scrimTrendsSchema } from '@/schemas/scrimTrends';

/**
 * The team report: charts-ready series and highlights over the team's verified scrim maps. Members of the team only, and the API treats a 401
 * as a sign-out, so nothing is requested without a signed-in user. `enabled` lets a tab fetch only when it is opened.
 */
export function useScrimTeamReport(teamId: string | undefined, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.teamReport(teamId ?? ''),
    queryFn: async () => scrimTeamReportSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/report`)),
    enabled: enabled && !!user?.id && !!teamId,
    staleTime: 60_000,
    retry: false,
  });
}

/** One player's report. Staff may open anyone's; a member only their own (the API refuses the rest). */
export function useScrimPlayerReport(teamId: string | undefined, userId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.playerReport(teamId ?? '', userId ?? ''),
    queryFn: async () => scrimPlayerReportSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/players/${userId}/report`)),
    enabled: !!user?.id && !!teamId && !!userId,
    staleTime: 60_000,
    retry: false,
  });
}

/** How the team is moving over its recent verified maps. Every member of the team may read it. */
export function useScrimTrends(teamId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.trends(teamId ?? ''),
    queryFn: async () => scrimTrendsSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/trends`)),
    enabled: !!user?.id && !!teamId,
    staleTime: 60_000,
    retry: false,
  });
}

export interface HeatmapQuery { map: string | null; kind: string; side: string | null }

/** Where the team's recorded events happened. Every member of the team may read it; the map is chosen by display name. */
export function useScrimHeatmap(teamId: string | undefined, q: HeatmapQuery) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.heatmap(teamId ?? '', q.map, q.kind, q.side),
    queryFn: async () => {
      const params = new URLSearchParams({ kind: q.kind });
      if (q.map) params.set('map', q.map);
      if (q.side) params.set('side', q.side);
      return scrimHeatmapSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/heatmap?${params.toString()}`));
    },
    enabled: !!user?.id && !!teamId,
    staleTime: 60_000,
    retry: false,
    placeholderData: (prev) => prev,
  });
}

/** Where the team wins and loses fights on one map, with how far the nearest teammate was at each death. Same access as the heatmap. */
export function useScrimFights(teamId: string | undefined, q: { map: string | null; side: string | null }, enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: scrimInsightsKeys.fights(teamId ?? '', q.map, q.side),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q.map) params.set('map', q.map);
      if (q.side) params.set('side', q.side);
      return scrimFightsSchema.parse(await competitiveApiClient.get<unknown>(`/api/scrims/teams/${teamId}/fights?${params.toString()}`));
    },
    enabled: enabled && !!user?.id && !!teamId,
    staleTime: 60_000,
    retry: false,
    placeholderData: (prev) => prev,
  });
}
