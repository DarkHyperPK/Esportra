import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DeveloperKey = {
  id: string;
  name: string;
  key_prefix: string;
  environment: 'sandbox' | 'live';
  status: 'active' | 'rotating' | 'revoked';
  scopes: string[];
  rate_limit_per_min: number;
  last_used_at: string | null;
  created_at: string;
  grace_period_until?: string | null;
};

export type CreateKeyRequest = {
  name: string;
  environment: 'sandbox' | 'live';
  rate_limit_per_min: number;
};

export type CreateKeyResponse = {
  id: string;
  name: string;
  key: string; // Ephemeral — never cache
  key_prefix: string;
  environment: 'sandbox' | 'live';
};

export type RotateKeyResponse = {
  new_key_id: string;
  key: string; // Ephemeral — never cache
  grace_period_until: string;
  name: string;
  environment: 'sandbox' | 'live';
};

export type DevAccessRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  intended_use: string;
  created_at: string;
  reviewed_at?: string | null;
  admin_notes?: string | null;
};

export type AnalyticsSummary = {
  total_requests: number;
  error_count: number;
  rate_limited_count: number;
  avg_response_ms: number;
  data_as_of: string;
};

export type Datapoint = {
  timestamp: string;
  request_count: number;
  error_count: number;
};

export type EndpointStat = {
  path: string;
  method: string;
  request_count: number;
  avg_response_ms: number;
  error_rate: number;
};

export type AdminAccessRequest = {
  id: string;
  organization_id: string;
  organization_name: string;
  requester_name: string;
  requester_email: string;
  intended_use: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
};

export type PartnerActivity = {
  organization_id: string;
  org_name: string;
  total_requests: number;
  error_rate: number | null;
  sandbox_key_count: number;
  live_key_count: number;
  last_active_at: string | null;
};

// ── Organizer Hooks ───────────────────────────────────────────────────────────

export function useDeveloperKeys(orgId: string) {
  return useQuery({
    queryKey: ['developer-keys', orgId],
    queryFn: () => apiClient.get<{ keys: DeveloperKey[] }>(`/api/developer/keys?organizationId=${orgId}`),
    staleTime: 60_000,
  });
}

export function useDeveloperAccessRequest(orgId: string) {
  return useQuery({
    queryKey: ['developer-access-request', orgId],
    queryFn: async () => {
      try {
        return await apiClient.get<DevAccessRequest | null>(
          `/api/developer/access-requests?organizationId=${orgId}`,
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useDeveloperAnalytics(orgId: string, from: string, to: string) {
  const enabled = !!from && !!to;

  const summary = useQuery({
    queryKey: ['developer-analytics-summary', orgId, from, to],
    queryFn: () =>
      apiClient.get<AnalyticsSummary>(
        `/api/developer/analytics/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&organizationId=${orgId}`,
      ),
    enabled,
    staleTime: 60_000,
  });

  const timeseries = useQuery({
    queryKey: ['developer-analytics-timeseries', orgId, from, to],
    queryFn: () =>
      apiClient.get<{ datapoints: Datapoint[] }>(
        `/api/developer/analytics/timeseries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&organizationId=${orgId}`,
      ),
    enabled,
    staleTime: 60_000,
  });

  const endpoints = useQuery({
    queryKey: ['developer-analytics-endpoints', orgId, from, to],
    queryFn: () =>
      apiClient.get<{ endpoints: EndpointStat[] }>(
        `/api/developer/analytics/endpoints?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&organizationId=${orgId}`,
      ),
    enabled,
    staleTime: 60_000,
  });

  return { summary, timeseries, endpoints };
}

export function useCreateDeveloperKey(orgId: string, onRawKey: (data: CreateKeyResponse) => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateKeyRequest) =>
      apiClient.post<CreateKeyResponse>('/api/developer/keys', { ...data, organization_id: orgId }),
    onSuccess: (response) => {
      // Extract raw key to callback BEFORE cache update — key is ephemeral
      onRawKey(response);
      void queryClient.invalidateQueries({ queryKey: ['developer-keys'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create key',
        description: getApiErrorMessage(error, 'Unable to create API key. Please try again.'),
        variant: 'destructive',
      });
    },
  });
}

export function useRevokeDeveloperKey() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (keyId: string) => apiClient.delete(`/api/developer/keys/${keyId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['developer-keys'] });
      toast({ title: 'Key revoked' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to revoke key',
        description: getApiErrorMessage(error, 'Unable to revoke API key. Please try again.'),
        variant: 'destructive',
      });
    },
  });
}

export function useRotateDeveloperKey(onRawKey: (data: RotateKeyResponse) => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ keyId, gracePeriodHours }: { keyId: string; gracePeriodHours: number }) =>
      apiClient.post<RotateKeyResponse>(`/api/developer/keys/${keyId}/rotate`, {
        gracePeriodHours: gracePeriodHours,
      }),
    onSuccess: (response) => {
      // Extract raw key to callback BEFORE cache update — key is ephemeral
      onRawKey(response);
      void queryClient.invalidateQueries({ queryKey: ['developer-keys'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to rotate key',
        description: getApiErrorMessage(error, 'Unable to rotate API key. Please try again.'),
        variant: 'destructive',
      });
    },
  });
}

export function useRenameDeveloperKey() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ keyId, name }: { keyId: string; name: string }) =>
      apiClient.patch(`/api/developer/keys/${keyId}`, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['developer-keys'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to rename key',
        description: getApiErrorMessage(error, 'Unable to rename API key.'),
        variant: 'destructive',
      });
    },
  });
}

export function useSubmitAccessRequest(orgId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { intended_use: string }) =>
      apiClient.post<DevAccessRequest>('/api/developer/access-requests', {
        ...data,
        organization_id: orgId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['developer-access-request'] });
      toast({ title: 'Application submitted', description: 'You will be notified by email when reviewed.' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to submit application',
        description: getApiErrorMessage(error, 'Unable to submit application. Please try again.'),
        variant: 'destructive',
      });
    },
  });
}

// ── Admin Hooks ───────────────────────────────────────────────────────────────

export function useAdminAccessRequests(status?: string) {
  return useQuery({
    queryKey: ['admin-developer-access-requests', status],
    queryFn: () => {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (status) params.set('status', status);
      return apiClient.get<{ items: AdminAccessRequest[] }>(
        `/api/admin/developer-access-requests?${params.toString()}`,
      );
    },
    staleTime: 30_000,
  });
}

export function useAdminApproveAccessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (requestId: string) =>
      apiClient.patch(`/api/admin/developer-access-requests/${requestId}`, { action: 'approve' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-developer-access-requests'] });
      toast({ title: 'Access approved', description: 'Organization can now create live keys.' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to approve request',
        description: getApiErrorMessage(error, 'Unable to approve request.'),
        variant: 'destructive',
      });
    },
  });
}

export function useAdminRejectAccessRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ requestId, adminNotes }: { requestId: string; adminNotes: string }) =>
      apiClient.patch(`/api/admin/developer-access-requests/${requestId}`, {
        action: 'reject',
        admin_notes: adminNotes,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-developer-access-requests'] });
      toast({ title: 'Request rejected' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to reject request',
        description: getApiErrorMessage(error, 'Unable to reject request.'),
        variant: 'destructive',
      });
    },
  });
}

export function useAdminPartnerActivity(from: string, to: string) {
  return useQuery({
    queryKey: ['admin-developer-partner-activity', from, to],
    queryFn: () =>
      apiClient.get<{ partners: PartnerActivity[] }>(
        `/api/admin/developer-analytics/partners?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      ),
    enabled: !!from && !!to,
    staleTime: 60_000,
  });
}
