import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

// ── Query Keys ──────────────────────────────────────────────────────────────
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  analytics: () => [...adminKeys.all, 'analytics'] as const,
  systemStats: () => [...adminKeys.all, 'system-stats'] as const,

  users: (params?: { limit?: number; offset?: number; search?: string; role?: string }) =>
    [...adminKeys.all, 'users', params ?? {}] as const,
  userRoles: () => [...adminKeys.all, 'user-roles'] as const,
  adminRoles: () => [...adminKeys.all, 'roles'] as const,
  adminUserRoles: () => [...adminKeys.all, 'admin-user-roles'] as const,

  tournaments: () => [...adminKeys.all, 'tournaments'] as const,
  venues: () => [...adminKeys.all, 'venues'] as const,
  sponsors: () => [...adminKeys.all, 'sponsors'] as const,
  sponsorApplications: () => [...adminKeys.all, 'sponsor-applications'] as const,

  auditLogs: (params?: { limit?: number; offset?: number; search?: string; target_type?: string; from?: string; to?: string }) =>
    [...adminKeys.all, 'audit-logs', params ?? {}] as const,

  verificationRequests: () => [...adminKeys.all, 'verification-requests'] as const,
  recentUsers: (limit?: number) => [...adminKeys.all, 'recent-users', limit] as const,
  recentTournaments: (limit?: number) => [...adminKeys.all, 'recent-tournaments', limit] as const,
};

// ── Stats ───────────────────────────────────────────────────────────────────
export const useAdminStats = () =>
  useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => apiClient.get<any>('/api/admin/stats'),
    staleTime: 1000 * 60, // 1 minute
  });

export const useAdminAnalytics = () =>
  useQuery({
    queryKey: adminKeys.analytics(),
    queryFn: () => apiClient.get<any>('/api/admin/analytics'),
    staleTime: 1000 * 60, // 1 minute
  });

export const useAdminSystemStats = () =>
  useQuery({
    queryKey: adminKeys.systemStats(),
    queryFn: () => apiClient.get<any>('/api/admin/system-stats'),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

// ── Users (paginated) ───────────────────────────────────────────────────────
interface AdminUsersParams {
  limit?: number;
  offset?: number;
  search?: string;
  role?: string;
}

interface AdminUsersResponse {
  users: any[];
  total: number;
  roleCounts?: Record<string, number>;
  adminCount?: number;
}

export const useAdminUsersList = (params: AdminUsersParams = {}) =>
  useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.offset !== undefined) qs.set('offset', String(params.offset));
      if (params.search) qs.set('search', params.search);
      if (params.role) qs.set('role', params.role);
      return apiClient.get<AdminUsersResponse>(`/api/admin/users?${qs}`);
    },
    staleTime: 1000 * 30, // 30 seconds — admin data changes frequently
  });

// ── Roles ───────────────────────────────────────────────────────────────────
export const useAdminRoleDefinitions = () =>
  useQuery({
    queryKey: adminKeys.adminRoles(),
    queryFn: () => apiClient.get<Array<{ id: string; name: string }>>('/api/admin/roles'),
    staleTime: 1000 * 60 * 10, // 10 minutes — role defs rarely change
  });

export const useAdminUserRoleAssignments = () =>
  useQuery({
    queryKey: adminKeys.adminUserRoles(),
    queryFn: () => apiClient.get<Array<any>>('/api/admin/admin-user-roles'),
    staleTime: 1000 * 60, // 1 minute
  });

// ── Tournaments ─────────────────────────────────────────────────────────────
export const useAdminTournaments = () =>
  useQuery({
    queryKey: adminKeys.tournaments(),
    queryFn: () => apiClient.get<any[]>('/api/admin/tournaments?order=created_at.desc'),
    staleTime: 1000 * 30,
  });

// ── Venues ──────────────────────────────────────────────────────────────────
export const useAdminVenues = () =>
  useQuery({
    queryKey: adminKeys.venues(),
    queryFn: () => apiClient.get<any[]>('/api/admin/venues?order=created_at.desc'),
    staleTime: 1000 * 30,
  });

// ── Sponsors ────────────────────────────────────────────────────────────────
export const useAdminSponsors = () =>
  useQuery({
    queryKey: adminKeys.sponsors(),
    queryFn: () => apiClient.get<any[]>('/api/sponsors'),
    staleTime: 1000 * 60,
  });

export const useAdminSponsorApplications = () =>
  useQuery({
    queryKey: adminKeys.sponsorApplications(),
    queryFn: () => apiClient.get<any[]>('/api/sponsors/applications'),
    staleTime: 1000 * 30,
  });

// ── Audit Logs (paginated) ──────────────────────────────────────────────────
interface AuditLogParams {
  limit?: number;
  offset?: number;
  search?: string;
  target_type?: string;
  from?: string;
  to?: string;
}

export const useAdminAuditLogs = (params: AuditLogParams = {}) =>
  useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.offset !== undefined) qs.set('offset', String(params.offset));
      if (params.search) qs.set('search', params.search);
      if (params.target_type) qs.set('target_type', params.target_type);
      if (params.from) qs.set('from', params.from);
      if (params.to) qs.set('to', params.to);
      return apiClient.get<any>(`/api/admin/audit-logs?${qs}`);
    },
    staleTime: 1000 * 15, // 15 seconds — logs are near-real-time
  });

// ── Verification Requests ───────────────────────────────────────────────────
export const useAdminVerificationRequests = () =>
  useQuery({
    queryKey: adminKeys.verificationRequests(),
    queryFn: () => apiClient.get<any[]>('/api/admin/verification-requests?order=created_at.desc'),
    staleTime: 1000 * 30,
  });

// ── Mutations ───────────────────────────────────────────────────────────────
export const useAdminTournamentUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.put(`/api/admin/tournaments/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.tournaments() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAdminVenueUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.put(`/api/admin/venues/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.venues() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAdminUserSuspend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiClient.post(`/api/admin/users/${userId}/suspend`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
};

export const useAdminUserUnsuspend = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.post(`/api/admin/users/${userId}/unsuspend`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
};

export const useAdminVerificationAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, updates }: { requestId: string; updates: any }) =>
      apiClient.put(`/api/admin/verification-requests/${requestId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.verificationRequests() });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
};

export const useAdminVerifiedRoleCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string; role: string; verified_by: string }) =>
      apiClient.post('/api/admin/verified-roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.verificationRequests() });
    },
  });
};

export const useAdminUserRoleUpdate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string; role: string }) =>
      apiClient.post('/api/admin/user-roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
};
