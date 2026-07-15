import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

// ── Query Keys ──────────────────────────────────────────────────────────────
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  analytics: () => [...adminKeys.all, 'analytics'] as const,
  systemStats: () => [...adminKeys.all, 'system-stats'] as const,

  users: (params?: Record<string, any>) =>
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
  dashboardStats: () => [...adminKeys.all, 'dashboard-stats'] as const,
  activityFeed: (limit?: number) => [...adminKeys.all, 'activity-feed', limit] as const,
  trends: (days?: number) => [...adminKeys.all, 'trends', days] as const,
  alerts: (params?: Record<string, any>) => [...adminKeys.all, 'alerts', params ?? {}] as const,
  alertSummary: () => [...adminKeys.all, 'alert-summary'] as const,
  entityHistory: (targetType: string, targetId: string, page?: number) =>
    [...adminKeys.all, 'entity-history', targetType, targetId, page] as const,

  moderationQueue: (params?: Record<string, string>) =>
    ['admin', 'moderation-queue', params ?? {}] as const,
  moderationStats: () => ['admin', 'moderation-stats'] as const,

  systemSettings: (category?: string) =>
    [...adminKeys.all, 'system-settings', category ?? 'all'] as const,
  adminPermissions: () => [...adminKeys.all, 'permissions'] as const,

  activeSessions: (params?: Record<string, string>) =>
    ['admin', 'sessions-active', params ?? {}] as const,
  sessionAudit: (params?: Record<string, string>) =>
    ['admin', 'sessions-audit', params ?? {}] as const,
  onlineCount: () => ['admin', 'online-count'] as const,

  ipAllowlist: () => ['admin', 'ip-allowlist'] as const,
  ipAllowlistStatus: () => ['admin', 'ip-allowlist-status'] as const,

  reportSchedules: () => ['admin', 'report-schedules'] as const,
  reportHistory: (id: string) => ['admin', 'report-history', id] as const,

  gdprRequests: (params?: Record<string, string>) => ['admin', 'gdpr-requests', params] as const,
  gdprStats: () => ['admin', 'gdpr-stats'] as const,
  consentRecords: (params?: Record<string, string>) => ['admin', 'consent-records', params] as const,

  anomalies: (params?: Record<string, string>) => ['admin', 'anomalies', params] as const,
  anomalyRules: () => ['admin', 'anomaly-rules'] as const,

  dashboardWidgets: () => ['admin', 'dashboard-widgets'] as const,
  dashboardPreferences: () => ['admin', 'dashboard-preferences'] as const,
  operationsSystemConfig: (category?: string) => ['admin', 'operations-system-config', category ?? 'all'] as const,
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

// ── Dashboard ───────────────────────────────────────────────────────────────
export const useAdminDashboardStats = () =>
  useQuery({
    queryKey: adminKeys.dashboardStats(),
    queryFn: () => apiClient.get<any>('/api/admin/dashboard-stats'),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // auto-refresh every minute
  });

export const useAdminActivityFeed = (limit: number = 20) =>
  useQuery({
    queryKey: adminKeys.activityFeed(limit),
    queryFn: () => apiClient.get<any[]>(`/api/admin/activity-feed?limit=${limit}`),
    staleTime: 1000 * 15, // 15 seconds
    refetchInterval: 1000 * 30, // auto-refresh every 30s
  });

export const useAdminTrends = (days: number = 30) =>
  useQuery({
    queryKey: adminKeys.trends(days),
    queryFn: () => apiClient.get<{ userSignups: any[]; tournamentCreations: any[] }>(`/api/admin/trends?days=${days}`),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

// ── Users (paginated)───────────────────────────────────────────────────────
interface AdminUsersParams {
  limit?: number;
  offset?: number;
  search?: string;
  role?: string;
  status?: string;
  country?: string;
  joined_from?: string;
  joined_to?: string;
  verified?: string;
  has_team?: string;
  sort_by?: string;
  sort_dir?: string;
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
      if (params.status) qs.set('status', params.status);
      if (params.country) qs.set('country', params.country);
      if (params.joined_from) qs.set('joined_from', params.joined_from);
      if (params.joined_to) qs.set('joined_to', params.joined_to);
      if (params.verified) qs.set('verified', params.verified);
      if (params.has_team) qs.set('has_team', params.has_team);
      if (params.sort_by) qs.set('sort_by', params.sort_by);
      if (params.sort_dir) qs.set('sort_dir', params.sort_dir);
      return apiClient.get<AdminUsersResponse>(`/api/admin/users?${qs}`);
    },
    staleTime: 1000 * 30,
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
interface AdminTournamentsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  game?: string;
  format?: string;
  prize_min?: number;
  prize_max?: number;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: string;
}

export const useAdminTournaments = (params: AdminTournamentsParams = {}) =>
  useQuery({
    queryKey: [...adminKeys.tournaments(), params],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));
      if (params.status) qs.set('status', params.status);
      if (params.search) qs.set('search', params.search);
      if (params.game) qs.set('game', params.game);
      if (params.format) qs.set('format', params.format);
      if (params.prize_min !== undefined) qs.set('prize_min', String(params.prize_min));
      if (params.prize_max !== undefined) qs.set('prize_max', String(params.prize_max));
      if (params.date_from) qs.set('date_from', params.date_from);
      if (params.date_to) qs.set('date_to', params.date_to);
      if (params.sort_by) qs.set('sort_by', params.sort_by);
      if (params.sort_dir) qs.set('sort_dir', params.sort_dir);
      return apiClient.get<{ data: any[]; total: number }>(`/api/admin/tournaments?${qs}`);
    },
    staleTime: 1000 * 30,
  });

// ── Venues ──────────────────────────────────────────────────────────────────
export const useAdminVenues = () =>
  useQuery({
    queryKey: adminKeys.venues(),
    queryFn: () => apiClient.get<any[]>('/api/admin/venues?limit=100&order=created_at.desc'),
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
    mutationFn: ({
      userId,
      reason,
      suspensionType,
      suspensionUntil,
    }: {
      userId: string;
      reason: string;
      suspensionType?: string | null;
      suspensionUntil?: string | null;
    }) =>
      apiClient.post(`/api/admin/users/${userId}/suspend`, {
        reason,
        suspensionType: suspensionType ?? null,
        suspensionUntil: suspensionUntil ?? null,
      }),
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

export const useAdminVerificationDelete = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (requestId: string) =>
      apiClient.delete(`/api/admin/verification-requests/${requestId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.verificationRequests() });
      toast({ title: 'Verification request deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAdminLicenseDelete = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (licenseId: string) =>
      apiClient.delete(`/api/admin/licenses/${licenseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      toast({ title: 'License deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAdminVerifiedRoleCreate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { user_id: string; role: string; status: string; is_active: boolean }) =>
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

export const useAdminBulkUserAction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userIds, action, reason }: { userIds: string[]; action: string; reason?: string }) =>
      apiClient.post<{ success: boolean; affected: number }>('/api/admin/users/bulk-action', {
        userIds,
        action,
        reason,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      toast({ title: `Bulk ${variables.action} complete`, description: `${data.affected} user(s) affected` });
    },
    onError: (error: Error) => {
      toast({ title: 'Bulk action failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useAdminBulkTournamentAction = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ tournamentIds, action }: { tournamentIds: string[]; action: string }) =>
      apiClient.post<{ success: boolean; affected: number }>('/api/admin/tournaments/bulk-action', {
        tournamentIds,
        action,
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      toast({ title: `Bulk ${variables.action} complete`, description: `${data.affected} tournament(s) affected` });
    },
    onError: (error: Error) => {
      toast({ title: 'Bulk action failed', description: error.message, variant: 'destructive' });
    },
  });
};

// ── Admin Alerts ────────────────────────────────────────────────────────────

interface AlertSummary {
  active_count: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  acknowledged_count: number;
}

interface AdminAlert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  data: Record<string, any>;
  status: string;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface AdminAlertsParams {
  status?: string;
  severity?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const useAdminAlertSummary = () =>
  useQuery({
    queryKey: adminKeys.alertSummary(),
    queryFn: () => apiClient.get<AlertSummary>('/api/admin/alerts/summary'),
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
  });

export const useAdminAlerts = (params: AdminAlertsParams = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.severity) qs.set('severity', params.severity);
  if (params.type) qs.set('type', params.type);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs}` : '';

  return useQuery({
    queryKey: adminKeys.alerts(params),
    queryFn: () => apiClient.get<{ data: AdminAlert[]; total: number; page: number; limit: number }>(`/api/admin/alerts${query}`),
    staleTime: 1000 * 15,
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.put<{ success: boolean }>(`/api/admin/alerts/${id}/acknowledge`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: adminKeys.alertSummary() });
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.put<{ success: boolean }>(`/api/admin/alerts/${id}/resolve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: adminKeys.alertSummary() });
    },
  });
};

export const useBulkAcknowledgeAlerts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertIds: string[]) => apiClient.put<{ success: boolean; updated: number }>('/api/admin/alerts/bulk-acknowledge', { alertIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: adminKeys.alertSummary() });
    },
  });
};

// ── Entity Change History ───────────────────────────────────────────────────

interface EntityHistoryEntry {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_type: string;
  target_id: string;
  target_name?: string;
  details: Record<string, any> | null;
  severity?: string;
  created_at: string;
}

export const useEntityHistory = (targetType: string, targetId: string, page: number = 1, limit: number = 15) => {
  return useQuery({
    queryKey: adminKeys.entityHistory(targetType, targetId, page),
    queryFn: () => apiClient.get<{ data: EntityHistoryEntry[]; total: number; page: number; limit: number } | EntityHistoryEntry[]>(
      `/api/admin/entity-history/${targetType}/${targetId}?page=${page}&limit=${limit}`
    ),
    enabled: !!targetType && !!targetId,
    staleTime: 1000 * 30,
  });
};

// ── System Settings ─────────────────────────────────────────────────────────

export interface SystemSetting {
  key: string;
  value: string;
  category: string;
  label: string;
  description: string;
  data_type: 'string' | 'boolean' | 'number' | 'email' | 'url';
  is_sensitive: boolean;
  updated_at: string;
}

export const useSystemSettings = (category?: string) =>
  useQuery({
    queryKey: [...adminKeys.all, 'system-settings', category ?? 'all'] as const,
    queryFn: () => {
      const path = category
        ? `/api/admin/system-settings?category=${encodeURIComponent(category)}`
        : '/api/admin/system-settings';
      return apiClient.get<SystemSetting[]>(path);
    },
    staleTime: 1000 * 60, // 1 minute
  });

export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (settings: { key: string; value: string }[]) =>
      apiClient.put('/api/admin/system-settings', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'system-settings'] });
      toast({ title: 'Settings saved', description: 'System settings have been updated successfully.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      const message = body?.error || body?.message || (error as Error)?.message || 'Failed to save settings.';
      const details = Array.isArray(body?.details) ? body.details.join(', ') : null;
      toast({ title: 'Save failed', description: details || message, variant: 'destructive' });
    },
  });
};

// ── Operations Infrastructure ───────────────────────────────────────────────

export interface OperationsSystemConfig {
  key: string;
  value: boolean | number | string | Record<string, unknown> | null;
  category: string;
  label: string;
  description: string;
  data_type: 'boolean' | 'number' | 'string' | 'json';
  is_kill_switch: boolean;
  is_sensitive: boolean;
  updated_by: string | null;
  updated_at: string;
}

export const useOperationsSystemConfig = (category?: string) =>
  useQuery({
    queryKey: adminKeys.operationsSystemConfig(category),
    queryFn: () => {
      const qs = category ? `?category=${encodeURIComponent(category)}` : '';
      return apiClient.get<OperationsSystemConfig[]>(`/api/admin/operations/system-config${qs}`);
    },
    staleTime: 1000 * 15,
  });

export const useUpdateOperationsSystemConfig = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ key, value, reason }: { key: string; value: unknown; reason?: string }) =>
      apiClient.put(`/api/admin/operations/system-config/${encodeURIComponent(key)}`, { value, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'operations-system-config'] });
      toast({ title: 'Operations config updated', description: 'The change was written and audited.' });
    },
    onError: (error: unknown) => {
      const body = (error as any)?.body;
      toast({
        title: 'Config update failed',
        description: body?.error || (error as Error)?.message || 'Unable to update operations config.',
        variant: 'destructive',
      });
    },
  });
};

// ── Role Builder ────────────────────────────────────────────────────────────

interface AdminPermission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

interface AdminRoleDetail {
  id: string;
  name: string;
  key: string;
  description: string;
  created_at: string;
  permissions: AdminPermission[];
  user_count: number;
}

interface AdminRoleSummary {
  id: string;
  name: string;
  key: string;
  description: string;
  created_at: string;
  permission_count: number;
  user_count: number;
}

export const useAdminPermissions = () =>
  useQuery({
    queryKey: adminKeys.adminPermissions(),
    queryFn: () => apiClient.get<AdminPermission[]>('/api/admin/permissions'),
    staleTime: 1000 * 60 * 10,
  });

export const useAdminRoles = () =>
  useQuery({
    queryKey: adminKeys.adminRoles(),
    queryFn: () => apiClient.get<AdminRoleSummary[]>('/api/admin/roles'),
    staleTime: 1000 * 60,
  });

export const useAdminRoleDetail = (roleId: string) =>
  useQuery({
    queryKey: [...adminKeys.adminRoles(), roleId],
    queryFn: () => apiClient.get<AdminRoleDetail>(`/api/admin/roles/${roleId}`),
    enabled: !!roleId,
    staleTime: 1000 * 60,
  });

export const useCreateAdminRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { name: string; key: string; description: string; permissionIds: string[] }) =>
      apiClient.post('/api/admin/roles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.adminRoles() });
      toast({ title: 'Role created', description: 'New admin role has been created.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({ title: 'Failed to create role', description: body?.error || (error as Error)?.message || 'Unknown error', variant: 'destructive' });
    },
  });
};

export const useUpdateAdminRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ roleId, ...data }: { roleId: string; name: string; description: string; permissionIds: string[] }) =>
      apiClient.put(`/api/admin/roles/${roleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.adminRoles() });
      toast({ title: 'Role updated', description: 'Role permissions have been updated.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({ title: 'Failed to update role', description: body?.error || (error as Error)?.message || 'Unknown error', variant: 'destructive' });
    },
  });
};

export const useDeleteAdminRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (roleId: string) =>
      apiClient.delete(`/api/admin/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.adminRoles() });
      toast({ title: 'Role deleted', description: 'Custom role has been removed.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({ title: 'Failed to delete role', description: body?.error || (error as Error)?.message || 'Unknown error', variant: 'destructive' });
    },
  });
};

// ── Content Moderation ──────────────────────────────────────────────────────

export interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  field_name: string;
  content_text: string | null;
  content_url: string | null;
  reported_by: string | null;
  reporter_username: string | null;
  reporter_avatar_url: string | null;
  reporter_full_name: string | null;
  reported_reason: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string;
  auto_flagged: boolean;
  created_at: string;
}

export interface ModerationStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

interface ModerationQueueParams {
  status?: string;
  content_type?: string;
  page?: number;
  limit?: number;
}

interface ModerationQueueResponse {
  items: ModerationItem[];
  total: number;
  page: number;
  limit: number;
}

export const useModerationQueue = (params: ModerationQueueParams = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.content_type) qs.set('content_type', params.content_type);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs}` : '';

  return useQuery({
    queryKey: adminKeys.moderationQueue(params as Record<string, string>),
    queryFn: () => apiClient.get<ModerationQueueResponse>(`/api/admin/moderation-queue${query}`),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useModerationStats = () =>
  useQuery({
    queryKey: adminKeys.moderationStats(),
    queryFn: () => apiClient.get<ModerationStats>('/api/admin/moderation-queue/stats'),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

export const useReviewModeration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: string; notes?: string }) =>
      apiClient.post(`/api/admin/moderation-queue/${id}/review`, { action, notes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.moderationQueue() });
      queryClient.invalidateQueries({ queryKey: adminKeys.moderationStats() });
      toast({
        title: variables.action === 'approve' ? 'Content approved' : 'Content rejected',
        description: `Item has been ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Review failed',
        description: body?.error || (error as Error)?.message || 'Failed to review content.',
        variant: 'destructive',
      });
    },
  });
};

export const useDismissModeration = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/moderation-queue/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.moderationQueue() });
      queryClient.invalidateQueries({ queryKey: adminKeys.moderationStats() });
      toast({ title: 'Item dismissed', description: 'Moderation item has been removed.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Dismiss failed',
        description: body?.error || (error as Error)?.message || 'Failed to dismiss item.',
        variant: 'destructive',
      });
    },
  });
};

export const useReportContent = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { contentType: string; contentId: string; fieldName: string; reason: string }) =>
      apiClient.post('/api/report-content', data),
    onSuccess: () => {
      toast({ title: 'Content reported', description: 'Thank you — our team will review this shortly.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Report failed',
        description: body?.error || (error as Error)?.message || 'Failed to submit report.',
        variant: 'destructive',
      });
    },
  });
};

// ── Session Management ──────────────────────────────────────────────────────

export interface ActiveSession {
  userId: string;
  email: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  roles: string[];
  lastSignInAt: string | null;
  lastActivityAt?: string | null;
  hasRecentActivity?: boolean;
  createdAt: string;
}

export interface SessionAuditEntry {
  id: string;
  actionType: string;
  actorId: string;
  actorEmail: string | null;
  actorUsername: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  createdAt: string;
}

interface ActiveSessionsResponse {
  items: ActiveSession[];
  total: number;
  page: number;
  limit: number;
  source?: string;
  description?: string;
}

interface SessionAuditResponse {
  items: SessionAuditEntry[];
  total: number;
  page: number;
  limit: number;
}

export const useActiveSessions = (params: { page?: number; limit?: number; search?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  const query = qs.toString() ? `?${qs}` : '';

  return useQuery({
    queryKey: adminKeys.activeSessions(params as Record<string, string>),
    queryFn: () => apiClient.get<ActiveSessionsResponse>(`/api/admin/sessions/active${query}`),
    staleTime: 1000 * 60 * 2,
  });
};

export const useSessionAudit = (params: { page?: number; limit?: number; userId?: string } = {}) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.userId) qs.set('userId', params.userId);
  const query = qs.toString() ? `?${qs}` : '';

  return useQuery({
    queryKey: adminKeys.sessionAudit(params as Record<string, string>),
    queryFn: () => apiClient.get<SessionAuditResponse>(`/api/admin/sessions/audit${query}`),
    staleTime: 1000 * 60 * 2,
  });
};

export const useOnlineCount = () =>
  useQuery({
    queryKey: adminKeys.onlineCount(),
    queryFn: () => apiClient.get<{ count: number }>('/api/admin/sessions/online-count'),
    staleTime: 1000 * 30,
    refetchInterval: 30000,
  });

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      apiClient.post<{ success: boolean; partial?: boolean; message?: string }>(
        `/api/admin/sessions/${userId}/revoke`, { reason }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.activeSessions() });
      queryClient.invalidateQueries({ queryKey: adminKeys.onlineCount() });
      queryClient.invalidateQueries({ queryKey: adminKeys.sessionAudit() });
      if (data?.partial) {
        toast({
          title: 'Session partially revoked',
          description: data.message ?? 'Auth token invalidation failed, but cache was evicted.',
        });
      } else {
        toast({ title: 'Session revoked', description: 'User has been forcefully logged out.' });
      }
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Revoke failed',
        description: body?.error || (error as Error)?.message || 'Failed to revoke session.',
        variant: 'destructive',
      });
    },
  });
};

// ── IP Allowlist ────────────────────────────────────────────────────────────

export interface IpAllowlistEntry {
  id: string;
  ipAddress: string;
  label: string;
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface IpAllowlistStatus {
  enabled: boolean;
  totalEntries: number;
  activeEntries: number;
}

export const useIpAllowlist = () =>
  useQuery({
    queryKey: adminKeys.ipAllowlist(),
    queryFn: () => apiClient.get<IpAllowlistEntry[]>('/api/admin/ip-allowlist'),
    staleTime: 1000 * 60,
  });

export const useIpAllowlistStatus = () =>
  useQuery({
    queryKey: adminKeys.ipAllowlistStatus(),
    queryFn: () => apiClient.get<IpAllowlistStatus>('/api/admin/ip-allowlist/status'),
    staleTime: 1000 * 30,
  });

export const useAddIpAllowlist = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { ipAddress: string; label?: string; expiresAt?: string }) =>
      apiClient.post('/api/admin/ip-allowlist', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.ipAllowlist() });
      queryClient.invalidateQueries({ queryKey: adminKeys.ipAllowlistStatus() });
      toast({ title: 'IP added', description: 'IP address has been added to the allowlist.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Failed to add IP',
        description: body?.error || (error as Error)?.message || 'Could not add IP address.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateIpAllowlist = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; label?: string; isActive?: boolean; expiresAt?: string | null }) =>
      apiClient.put(`/api/admin/ip-allowlist/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.ipAllowlist() });
      queryClient.invalidateQueries({ queryKey: adminKeys.ipAllowlistStatus() });
      toast({ title: 'IP updated', description: 'IP allowlist entry has been updated.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Failed to update IP',
        description: body?.error || (error as Error)?.message || 'Could not update IP entry.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteIpAllowlist = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/ip-allowlist/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.ipAllowlist() });
      queryClient.invalidateQueries({ queryKey: adminKeys.ipAllowlistStatus() });
      toast({ title: 'IP deleted', description: 'IP address has been removed from the allowlist.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Failed to delete IP',
        description: body?.error || (error as Error)?.message || 'Could not remove IP address.',
        variant: 'destructive',
      });
    },
  });
};

export const useToggleIpAllowlist = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => apiClient.post<IpAllowlistStatus>('/api/admin/ip-allowlist/toggle', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.ipAllowlistStatus() });
      queryClient.invalidateQueries({ queryKey: adminKeys.ipAllowlist() });
      const enabled = data?.enabled;
      toast({
        title: enabled ? 'IP allowlist enabled' : 'IP allowlist disabled',
        description: enabled
          ? 'Only allowlisted IPs can now access the admin panel.'
          : 'All IPs can now access the admin panel.',
      });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Toggle failed',
        description: body?.error || (error as Error)?.message || 'Could not toggle IP allowlist.',
        variant: 'destructive',
      });
    },
  });
};

// ── Scheduled Reports ────────────────────────────────────────────────────────

export interface ReportSchedule {
  id: string;
  name: string;
  reportType: string;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  recipients: string[];
  format: string;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  lastRunStatus: string | null;
  lastRunRowCount: number | null;
}

export interface ReportRunLog {
  id: string;
  scheduleId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  rowCount: number | null;
  fileSizeBytes: number | null;
  errorMessage: string | null;
  downloadUrl: string | null;
  triggeredBy: string;
}

interface ReportHistoryParams {
  page?: number;
  limit?: number;
}

interface ReportHistoryResponse {
  items: ReportRunLog[];
  total: number;
  page: number;
  limit: number;
}

export const useReportSchedules = () =>
  useQuery({
    queryKey: adminKeys.reportSchedules(),
    queryFn: () => apiClient.get<ReportSchedule[]>('/api/admin/report-schedules'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

export const useReportHistory = (id: string, params: ReportHistoryParams = {}) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString() ? `?${qs}` : '';

  return useQuery({
    queryKey: [...adminKeys.reportHistory(id), params],
    queryFn: () => apiClient.get<ReportHistoryResponse>(`/api/admin/report-schedules/${id}/history${query}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
};

export const useCreateReportSchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: {
      name: string;
      reportType: string;
      frequency: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      timeOfDay: string;
      recipients: string[];
      format: string;
      filters?: Record<string, unknown>;
    }) => apiClient.post<ReportSchedule>('/api/admin/report-schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reportSchedules() });
      toast({ title: 'Schedule created', description: 'Report schedule has been created successfully.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as { body?: { error?: string } })?.body;
      toast({
        title: 'Failed to create schedule',
        description: body?.error || (error as Error)?.message || 'Could not create report schedule.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateReportSchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; isActive?: boolean; recipients?: string[]; format?: string }) =>
      apiClient.put<ReportSchedule>(`/api/admin/report-schedules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reportSchedules() });
      toast({ title: 'Schedule updated', description: 'Report schedule has been updated.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as { body?: { error?: string } })?.body;
      toast({
        title: 'Failed to update schedule',
        description: body?.error || (error as Error)?.message || 'Could not update report schedule.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteReportSchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/report-schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reportSchedules() });
      toast({ title: 'Schedule deleted', description: 'Report schedule has been removed.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as { body?: { error?: string } })?.body;
      toast({
        title: 'Failed to delete schedule',
        description: body?.error || (error as Error)?.message || 'Could not delete report schedule.',
        variant: 'destructive',
      });
    },
  });
};

export const useRunReportNow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/report-schedules/${id}/run`, {}),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reportSchedules() });
      queryClient.invalidateQueries({ queryKey: adminKeys.reportHistory(id) });
      toast({ title: 'Report triggered', description: 'Report is now running. Check history for results.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as { body?: { error?: string } })?.body;
      toast({
        title: 'Failed to run report',
        description: body?.error || (error as Error)?.message || 'Could not trigger report run.',
        variant: 'destructive',
      });
    },
  });
};

// ── GDPR & Compliance ────────────────────────────────────────────────────────

export interface GdprRequest {
  id: string;
  userId: string;
  username: string | null;
  email: string | null;
  requestType: string;
  status: string;
  requestedAt: string;
  processedAt: string | null;
  processedByUsername: string | null;
  notes: string;
  downloadUrl: string | null;
  expiresAt: string | null;
}

export interface GdprStats {
  pendingRequests: number;
  completedToday: number;
  exportRequests: number;
  deletionRequests: number;
  avgProcessingDays: number;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  username: string | null;
  consentType: string;
  granted: boolean;
  ipAddress: string | null;
  recordedAt: string;
  version: string;
}

export interface GdprRequestsResponse {
  requests: GdprRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface ConsentRecordsResponse {
  records: ConsentRecord[];
  total: number;
  page: number;
  limit: number;
}

export const useGdprRequests = (params?: Record<string, string>) =>
  useQuery({
    queryKey: adminKeys.gdprRequests(params),
    queryFn: () => {
      const qs = new URLSearchParams(params ?? {});
      return apiClient.get<GdprRequestsResponse>(`/api/admin/gdpr/requests?${qs}`);
    },
    staleTime: 1000 * 60 * 5,
  });

export const useGdprStats = () =>
  useQuery({
    queryKey: adminKeys.gdprStats(),
    queryFn: () => apiClient.get<GdprStats>('/api/admin/gdpr/stats'),
    staleTime: 1000 * 60 * 5,
  });

export const useConsentRecords = (params?: Record<string, string>) =>
  useQuery({
    queryKey: adminKeys.consentRecords(params),
    queryFn: () => {
      const qs = new URLSearchParams(params ?? {});
      return apiClient.get<ConsentRecordsResponse>(`/api/admin/gdpr/consent-records?${qs}`);
    },
    staleTime: 1000 * 60 * 5,
  });

export const useProcessGdprRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: 'approve' | 'reject'; notes?: string }) =>
      apiClient.post(`/api/admin/gdpr/requests/${id}/process`, { action, notes }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.gdprRequests() });
      queryClient.invalidateQueries({ queryKey: adminKeys.gdprStats() });
      toast({
        title: vars.action === 'approve' ? 'Request approved' : 'Request rejected',
        description: vars.action === 'approve'
          ? 'The GDPR request has been approved and will be processed.'
          : 'The GDPR request has been rejected.',
      });
    },
    onError: (error: unknown) => {
      const body = (error as { body?: { error?: string } })?.body;
      toast({
        title: 'Action failed',
        description: body?.error || (error as Error)?.message || 'Could not process GDPR request.',
        variant: 'destructive',
      });
    },
  });
};

export const useSubmitGdprRequest = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { requestType: 'export' | 'deletion' }) =>
      apiClient.post('/api/gdpr/request', data),
    onSuccess: () => {
      toast({
        title: 'Request submitted',
        description: 'Your data request has been submitted and will be reviewed shortly.',
      });
    },
    onError: (error: unknown) => {
      const body = (error as { body?: { error?: string } })?.body;
      toast({
        title: 'Submission failed',
        description: body?.error || (error as Error)?.message || 'Could not submit GDPR request.',
        variant: 'destructive',
      });
    },
  });
};

export const useRecordConsent = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { consentType: string; granted: boolean; version: string }) =>
      apiClient.post('/api/consent', data),
    onSuccess: () => {
      toast({ title: 'Consent recorded', description: 'Your consent preferences have been saved.' });
    },
    onError: (error: unknown) => {
      const body = (error as { body?: { error?: string } })?.body;
      toast({
        title: 'Failed to record consent',
        description: body?.error || (error as Error)?.message || 'Could not save consent preferences.',
        variant: 'destructive',
      });
    },
  });
};

// ── Anomaly Detection ────────────────────────────────────────────────────────

export interface AnomalyEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  severity: string;
  countObserved: number;
  thresholdCount: number;
  windowMinutes: number;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedByUsername: string | null;
  isResolved: boolean;
  details: Record<string, unknown> | null;
}

export interface AnomalyRule {
  id: string;
  name: string;
  metric: string;
  thresholdCount: number;
  windowMinutes: number;
  severity: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  cooldownMinutes: number;
  createdAt: string;
}

interface AnomaliesResponse {
  items: AnomalyEvent[];
  total: number;
  page: number;
  limit: number;
  /** Total unresolved events across all pages. */
  unresolvedTotal: number;
  /** Total unresolved critical-severity events across all pages. */
  criticalTotal: number;
  /** Total unresolved high-severity events across all pages. */
  highTotal: number;
}

interface ScanResult {
  scannedRules: number;
  detectedCount: number;
  detectedEvents: AnomalyEvent[];
}

export const useAnomalies = (params?: Record<string, string>) =>
  useQuery({
    queryKey: adminKeys.anomalies(params),
    queryFn: () => {
      const qs = new URLSearchParams(params ?? {});
      return apiClient.get<AnomaliesResponse>(`/api/admin/anomalies?${qs}`);
    },
    staleTime: 1000 * 30, // 30s — must be less than the 60s refetchInterval
    refetchInterval: 60000,
  });

export const useAnomalyRules = () =>
  useQuery({
    queryKey: adminKeys.anomalyRules(),
    queryFn: () => apiClient.get<AnomalyRule[]>('/api/admin/anomalies/rules'),
    staleTime: 1000 * 60 * 2,
  });

export const useUpdateAnomalyRule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      thresholdCount?: number;
      windowMinutes?: number;
      severity?: string;
      isActive?: boolean;
      cooldownMinutes?: number;
    }) => apiClient.put(`/api/admin/anomalies/rules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.anomalyRules() });
      toast({ title: 'Rule updated', description: 'Detection rule has been updated successfully.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Update failed',
        description: body?.error || (error as Error)?.message || 'Could not update detection rule.',
        variant: 'destructive',
      });
    },
  });
};

export const useResolveAnomaly = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apiClient.post(`/api/admin/anomalies/${id}/resolve`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.anomalies() });
      toast({ title: 'Anomaly resolved', description: 'The anomaly event has been marked as resolved.' });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Resolve failed',
        description: body?.error || (error as Error)?.message || 'Could not resolve anomaly.',
        variant: 'destructive',
      });
    },
  });
};

export const useScanAnomalies = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => apiClient.post<ScanResult>('/api/admin/anomalies/scan', {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.anomalies() });
      queryClient.invalidateQueries({ queryKey: adminKeys.anomalyRules() });
      toast({
        title: 'Scan complete',
        description: `Scanned ${data?.scannedRules ?? 0} rules — ${data?.detectedCount ?? 0} anomalies detected.`,
      });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Scan failed',
        description: body?.error || (error as Error)?.message || 'Could not complete anomaly scan.',
        variant: 'destructive',
      });
    },
  });
};


// ── Dashboard Customization ──────────────────────────────────────────────────

export interface DashboardWidget {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultRefreshInterval: number;
}

export interface WidgetConfig {
  widgetId: string;
  position: number;
  visible: boolean;
  refreshInterval: number | null;
}

export interface DashboardPreferences {
  layout: WidgetConfig[];
  isDefault?: boolean;
}

export const useDashboardWidgets = () =>
  useQuery({
    queryKey: adminKeys.dashboardWidgets(),
    queryFn: () => apiClient.get<DashboardWidget[]>('/api/admin/dashboard/widgets'),
    staleTime: Infinity,
  });

export const useDashboardPreferences = () =>
  useQuery({
    queryKey: adminKeys.dashboardPreferences(),
    queryFn: () => apiClient.get<DashboardPreferences>('/api/admin/dashboard/preferences'),
    staleTime: 1000 * 60 * 5,
  });

export const useSaveDashboardPreferences = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { layout: WidgetConfig[] }) =>
      apiClient.put<DashboardPreferences>('/api/admin/dashboard/preferences', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardPreferences() });
      toast({
        title: 'Layout saved',
        description: 'Your dashboard layout has been updated.',
      });
    },
    onError: (error: unknown) => {
       
      const body = (error as any)?.body;
      toast({
        title: 'Save failed',
        description: body?.error || (error as Error)?.message || 'Could not save dashboard preferences.',
        variant: 'destructive',
      });
    },
  });
};

