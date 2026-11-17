import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export type AirStatus = 'active' | 'suspended' | 'revoked';
export type AirSection = 'requests' | 'customers' | 'devices' | 'plans' | 'activity';

export interface AirCounts {
  customers: number;
  workspaces: number;
  activeDevices: number;
  onlineDevices: number;
  expiredAccess: number;
  pendingRequests: number;
}

export interface AirOverview {
  counts: AirCounts;
  offlineSigningConfigured: boolean;
  paymentsEnabled: boolean;
}

export interface AirRequest {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  note: string;
  status: 'pending' | 'granted' | 'declined' | 'withdrawn';
  reason: string | null;
  createdAt: string;
  accountStatus: AirStatus | null;
  validUntil: string | null;
  trialEndsAt: string | null;
}

export interface AirCustomer {
  userId: string;
  status: AirStatus;
  trialStartedAt: string;
  trialEndsAt: string;
  validUntil: string | null;
  planId: string;
  plan: string;
  licenseCode: string;
  revision: number;
  overrideDeviceLimits: boolean;
  productionLimit: number | null;
  captureLimit: number | null;
  email: string | null;
  name: string | null;
  productionDevices: number;
  lastSeenAt: string | null;
}

export interface AirDevice {
  id: string;
  userId: string;
  name: string;
  mode: 'production' | 'capture';
  status: string;
  lastSeenAt: string;
  health: string;
  revision: number;
}

export interface AirPlan {
  id: string;
  name: string;
  productionLimit: number | null;
  captureLimit: number | null;
  enabled: boolean;
}

export interface AirActivity {
  id: number;
  actorId: string;
  action: string;
  subjectId: string;
  reason: string;
  createdAt: string;
}

export interface AirPage<T> {
  items: T[];
  page: number;
  hasMore: boolean;
}

export interface AirGrantInput {
  planId: string;
  validUntil: string | null;
  status: AirStatus;
  reason: string;
  overrideDeviceLimits: boolean;
  productionLimit: number | null;
  captureLimit: number | null;
}

export interface AirPlanInput {
  name: string;
  productionLimit: number | null;
  captureLimit: number | null;
  enabled: boolean;
}

const ROOT = '/api/admin/air';
const KEY = ['air-admin'] as const;

export function useAirOverview() {
  return useQuery({
    queryKey: [...KEY, 'overview'],
    queryFn: () => apiClient.get<AirOverview>(`${ROOT}/`),
    refetchInterval: 60_000,
  });
}

export function useAirList<T>(section: AirSection, page = 1, q = '') {
  const search = q.trim();
  const query = new URLSearchParams({ page: String(page) });
  if (search) query.set('q', search);
  return useQuery({
    queryKey: [...KEY, section, page, search],
    queryFn: () => apiClient.get<AirPage<T>>(`${ROOT}/${section}?${query.toString()}`),
    placeholderData: keepPreviousData,
  });
}

/** Every Air admin change refreshes the whole page: counts, lists and activity move together. */
function useAirMutation<TVars, TResult>(run: (vars: TVars) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAirGrant() {
  return useAirMutation(({ userId, input }: { userId: string; input: AirGrantInput }) =>
    apiClient.put<{ updated: boolean }>(`${ROOT}/customers/${userId}/access`, input));
}

export function useAirDecline() {
  return useAirMutation(({ requestId, reason }: { requestId: string; reason: string }) =>
    apiClient.post<{ declined: boolean }>(`${ROOT}/requests/${requestId}/decline`, { reason }));
}

export function useAirFindByEmail() {
  return useAirMutation((email: string) =>
    apiClient.post<{ userId: string }>(`${ROOT}/customers/by-email`, { email }));
}

export function useAirRevokeDevice() {
  return useAirMutation(({ deviceId, reason }: { deviceId: string; reason: string }) =>
    apiClient.post<{ revoked: boolean }>(`${ROOT}/devices/${deviceId}/revoke`, { reason }));
}

export function useAirSavePlan() {
  return useAirMutation(({ id, input }: { id?: string; input: AirPlanInput }) =>
    id ? apiClient.put<unknown>(`${ROOT}/plans/${id}`, input) : apiClient.post<unknown>(`${ROOT}/plans`, input));
}
