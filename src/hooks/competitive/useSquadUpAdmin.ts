/**
 * useSquadUpAdmin.ts
 *
 * Admin Centre data for Squad Up: live pool, durable stats, live sessions, recent matches, and the
 * two controls an admin has: end a player's session, and switch the feature on/off (feature flag).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { competitiveApiClient as api } from '@/hooks/competitive/competitiveApiClient';
import { apiClient } from '@/lib/apiClient';
import { squadUpAdminKeys } from './queryKeys';
import {
  adminMatchSchema, adminOverviewSchema, adminReportDetailSchema, adminReportListSchema, adminRestrictionSchema, adminSessionSchema,
  type ResolveReportInput,
} from '@/schemas/squadUpAdmin';

const BASE = '/api/admin/squad-up';

export function useSquadUpAdminOverview(days: number) {
  return useQuery({
    queryKey: squadUpAdminKeys.overview(days),
    queryFn: async () => adminOverviewSchema.parse(await api.get<unknown>(`${BASE}/overview?days=${days}`)),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useSquadUpAdminSessions() {
  return useQuery({
    queryKey: squadUpAdminKeys.sessions(),
    queryFn: async () => z.array(adminSessionSchema).parse(await api.get<unknown>(`${BASE}/sessions?limit=100`)),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useSquadUpAdminMatches() {
  return useQuery({
    queryKey: squadUpAdminKeys.matches(),
    queryFn: async () => z.array(adminMatchSchema).parse(await api.get<unknown>(`${BASE}/matches?limit=50`)),
    staleTime: 30_000,
  });
}

export function useEndSquadUpSessionAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.post(`${BASE}/sessions/${userId}/end`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: squadUpAdminKeys.sessions() });
      void qc.invalidateQueries({ queryKey: ['admin', 'squad-up', 'overview'] });
    },
  });
}

/** Same endpoint the Feature Flags page uses, so audit and permissions stay in one place. */
export function useToggleSquadUpFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: string; enabled: boolean }) =>
      apiClient.put(`/api/admin/feature-flags/${flagId}`, { is_enabled: enabled }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: squadUpAdminKeys.all() });
      void qc.invalidateQueries({ queryKey: ['platform-features'] });
    },
  });
}

export function useSquadUpAdminReports(status: 'open' | 'resolved' | 'all', offset: number) {
  return useQuery({
    queryKey: squadUpAdminKeys.reports(status, offset),
    queryFn: async () => adminReportListSchema.parse(await api.get<unknown>(`${BASE}/reports?status=${status}&limit=25&offset=${offset}`)),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

/** Detail carries 5-minute signed screenshot URLs, so it refetches before they expire. */
export function useSquadUpAdminReport(id: string | null) {
  return useQuery({
    queryKey: squadUpAdminKeys.reportDetail(id ?? 'none'),
    enabled: !!id,
    queryFn: async () => adminReportDetailSchema.parse(await api.get<unknown>(`${BASE}/reports/${id}`)),
    refetchInterval: 240_000,
    staleTime: 0,
  });
}

export function useResolveSquadUpReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ResolveReportInput }) =>
      apiClient.post(`${BASE}/reports/${id}/resolve`, { action: input.action, note: input.note, duration_hours: input.durationHours }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: squadUpAdminKeys.all() });
    },
  });
}

export function useSquadUpAdminRestrictions() {
  return useQuery({
    queryKey: squadUpAdminKeys.restrictions(),
    queryFn: async () => z.array(adminRestrictionSchema).parse(await api.get<unknown>(`${BASE}/restrictions`)),
    staleTime: 15_000,
  });
}

export function useLiftSquadUpRestriction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`${BASE}/restrictions/${id}/lift`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: squadUpAdminKeys.all() }); },
  });
}
