import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Loader2,
  UserSearch,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Shield,
  AlertTriangle,
  Search,
  Play,
} from 'lucide-react';
import { useGhostMode } from '@/hooks/useGhostMode';
import { usePlatformFeatures, FEATURES } from '@/hooks/usePlatformFeatures';
import { FeatureUnavailable } from '@/components/admin/FeatureUnavailable';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandEmptyState,
  CommandIconButton,
  CommandPanel,
  CommandSection,
  CommandTabs,
} from '@/components/management/CommandSurface';

interface GhostApproval {
  id: string;
  requester_id: string;
  target_user_id: string;
  reason: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  denied_reason: string | null;
  created_at: string;
  requester_name: string;
  target_user_name: string;
  approver_name: string | null;
}

interface GhostSession {
  id: string;
  admin_id: string;
  target_user_id: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  pages_viewed: number;
  fields_unmasked: number;
  admin_name: string;
  target_user_name: string;
}

interface AuditLog {
  id: string;
  session_id: string;
  access_type: string;
  resource_type: string;
  resource_id: string;
  field_name: string | null;
  accessed_at: string;
}

interface ApprovedRequest {
  id: string;
  target_user_id: string;
  reason: string;
  status: string;
  approved_at: string;
  expires_at: string | null;
  created_at: string;
  target_user_name: string;
  target_avatar: string | null;
  approver_name: string;
}


export default function GhostMode() {
  const [activeTab, setActiveTab] = useState('sessions');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [reason, setReason] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [startingSessionFor, setStartingSessionFor] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAdminAccess();
  const { isActive: ghostIsActive, start: startGhostSession } = useGhostMode();
  const { isEnabled: ghostEnabled, isLoading: featuresLoading } = usePlatformFeatures();

  const { data: pendingApprovals } = useQuery({
    queryKey: ['admin', 'ghost-approvals', 'pending'],
    queryFn: () => apiClient.get<GhostApproval[]>('/api/admin/ghost/approvals/pending'),
    enabled: isSuperAdmin,
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['admin', 'ghost-sessions'],
    queryFn: () => apiClient.get<GhostSession[]>('/api/admin/ghost/sessions'),
  });

  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['admin', 'ghost-audit'],
    queryFn: () => apiClient.get<AuditLog[]>('/api/admin/ghost/audit'),
    enabled: isSuperAdmin,
  });

  const { data: myApprovedRequests } = useQuery({
    queryKey: ['admin', 'ghost-approvals', 'mine'],
    queryFn: () => apiClient.get<ApprovedRequest[]>('/api/admin/ghost/approvals/mine'),
    enabled: !isSuperAdmin,
  });

  const { data: searchResponse } = useQuery({
    queryKey: ['admin', 'users-search', userSearch],
    queryFn: () =>
      apiClient.get<{ users: { id: string; username: string; email: string }[] }>(
        `/api/admin/users?search=${encodeURIComponent(userSearch)}&limit=5`
      ),
    enabled: userSearch.length >= 2,
  });
  const searchResults = searchResponse?.users;

  const requestApproval = useMutation({
    mutationFn: () =>
      apiClient.post('/api/admin/ghost/request', { target_user_id: targetUserId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ghost-approvals'] });
      toast.success('Approval request submitted');
      setRequestDialogOpen(false);
      setTargetUserId('');
      setReason('');
    },
    onError: () => {
      toast.error('Failed to submit request');
    },
  });

  const approveRequest = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/admin/ghost/approvals/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ghost-approvals'] });
      toast.success('Request approved');
    },
  });

  const denyRequest = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/api/admin/ghost/approvals/${id}/deny`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ghost-approvals'] });
      toast.success('Request denied');
    },
  });

  const enterGhostMode = useMutation({
    mutationFn: ({ targetUserId, reason }: { targetUserId: string; reason: string }) =>
      startGhostSession({ targetUserId, reason, scopes: ['view'] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ghost-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ghost-approvals', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Ghost session started');
      setStartingSessionFor(null);
    },
    onError: () => {
      toast.error('Failed to start ghost session');
      setStartingSessionFor(null);
    },
  });

  const activeSessions = sessions?.filter((s) => !s.ended_at && new Date(s.expires_at) > new Date()) ?? [];
  const pastSessions = sessions?.filter((s) => s.ended_at || new Date(s.expires_at) <= new Date()) ?? [];

  if (!featuresLoading && !ghostEnabled(FEATURES.ghostMode)) {
    return <FeatureUnavailable featureName="Ghost Mode" backTo="/admin/dashboard" backLabel="Command Centre" />;
  }

  return (
    <AdminPage
      eyebrow="Security"
      title="Ghost Mode"
      description="Securely view user accounts with full audit trails"
      actions={
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <CommandButton size="sm">
              <UserSearch className="h-4 w-4" />
              {isSuperAdmin ? 'Enter Ghost Mode' : 'Request Access'}
            </CommandButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isSuperAdmin ? 'Enter Ghost Mode' : 'Request Ghost Mode Access'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  Search User
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    placeholder="Search by username or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-2 border border-white/10 bg-[#0a0a0c]">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setTargetUserId(user.id);
                          setUserSearch(user.username);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/[0.05] ${
                          targetUserId === user.id ? 'bg-white/[0.07]' : ''
                        }`}
                      >
                        <span className="text-white">{user.username}</span>
                        <span className="ml-2 font-mono text-xs text-zinc-500">{user.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  Reason for access
                </label>
                <Textarea
                  placeholder="Explain why you need to view this user's account..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-start gap-3 border border-amber-500/20 bg-amber-500/10 p-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-300" />
                <div className="text-sm text-amber-200/80">
                  {isSuperAdmin
                    ? 'Ghost mode access is logged and auditable. All viewed pages and unmasked fields are recorded.'
                    : 'Your request will be reviewed by a super admin. Ghost mode access is logged and auditable.'}
                </div>
              </div>

              <CommandButton
                onClick={() => {
                  if (isSuperAdmin) {
                    enterGhostMode.mutate({ targetUserId, reason });
                    setRequestDialogOpen(false);
                    setTargetUserId('');
                    setReason('');
                    setUserSearch('');
                  } else {
                    requestApproval.mutate();
                  }
                }}
                disabled={!targetUserId || !reason || requestApproval.isPending || enterGhostMode.isPending}
                className="w-full"
              >
                {(requestApproval.isPending || enterGhostMode.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isSuperAdmin ? 'Enter Ghost Mode' : 'Submit Request'}
              </CommandButton>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {isSuperAdmin && pendingApprovals && pendingApprovals.length > 0 && (
        <CommandPanel className="border-amber-500/20 bg-amber-500/10">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Clock className="h-4 w-4 text-amber-300" />
            Pending Approvals ({pendingApprovals.length})
          </h3>
          <div className="space-y-2">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="flex flex-col justify-between gap-3 border border-white/10 bg-[#0a0a0c]/60 p-3 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="text-sm text-white">
                    <span className="font-medium">{approval.requester_name}</span>
                    {' wants to view '}
                    <span className="font-medium">{approval.target_user_name}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{approval.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <CommandIconButton
                    variant="danger"
                    label="Deny request"
                    onClick={() => denyRequest.mutate({ id: approval.id, reason: 'Denied' })}
                  >
                    <XCircle />
                  </CommandIconButton>
                  <CommandButton size="sm" onClick={() => approveRequest.mutate(approval.id)}>
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </CommandButton>
                </div>
              </div>
            ))}
          </div>
        </CommandPanel>
      )}

      {!isSuperAdmin && !ghostIsActive && myApprovedRequests && myApprovedRequests.length > 0 && (
        <CommandPanel>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <CheckCircle className="h-4 w-4 text-white" />
            Approved Requests ({myApprovedRequests.length})
          </h3>
          <div className="space-y-2">
            {myApprovedRequests.map((approval) => (
              <div
                key={approval.id}
                className="flex flex-col justify-between gap-3 border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="text-sm text-white">
                    Ready to view{' '}
                    <span className="font-medium">{approval.target_user_name}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    Approved by {approval.approver_name}
                    {approval.expires_at && (
                      <> · Expires {formatDistanceToNow(new Date(approval.expires_at), { addSuffix: true })}</>
                    )}
                  </p>
                </div>
                <CommandButton
                  size="sm"
                  onClick={() => {
                    setStartingSessionFor(approval.target_user_id);
                    enterGhostMode.mutate({
                      targetUserId: approval.target_user_id,
                      reason: approval.reason,
                    });
                  }}
                  disabled={enterGhostMode.isPending || startingSessionFor === approval.target_user_id}
                >
                  {startingSessionFor === approval.target_user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Enter Ghost Mode
                </CommandButton>
              </div>
            ))}
          </div>
        </CommandPanel>
      )}

      <CommandTabs
        tabs={[
          { value: 'sessions', label: 'Sessions' },
          ...(isSuperAdmin ? [{ value: 'audit', label: 'Audit Log' }] : []),
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'sessions' &&
        (loadingSessions ? (
          <CommandSection className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </CommandSection>
        ) : (
          <div className="space-y-6">
            {activeSessions.length > 0 && (
              <div>
                <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                  Active Sessions
                </h3>
                <div className="space-y-2">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-white/15 bg-white/[0.03] p-4 transition-colors hover:border-white/30"
                    >
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                        <div className="flex items-center gap-3">
                          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-rose-500" />
                          <div className="text-sm">
                            <span className="font-medium text-white">
                              {session.admin_name}
                            </span>
                            <span className="text-zinc-400"> viewing </span>
                            <span className="font-medium text-white">
                              {session.target_user_name}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {session.pages_viewed} pages
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {session.fields_unmasked} unmasked
                          </span>
                          <span>
                            Expires{' '}
                            {formatDistanceToNow(new Date(session.expires_at), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                Past Sessions
              </h3>
              {pastSessions.length > 0 ? (
                <div className="space-y-2">
                  {pastSessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-white/10 bg-white/[0.025] p-4 transition-colors hover:border-white/25"
                    >
                      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                        <div className="text-sm">
                          <span className="font-medium text-white">
                            {session.admin_name}
                          </span>
                          <span className="text-zinc-400"> viewed </span>
                          <span className="font-medium text-white">
                            {session.target_user_name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tabular-nums text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {session.pages_viewed} pages
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {session.fields_unmasked} unmasked
                          </span>
                          <span>
                            {format(new Date(session.started_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <CommandEmptyState
                  title="No past sessions"
                  icon={<Eye className="h-5 w-5" />}
                />
              )}
            </div>
          </div>
        ))}

      {isSuperAdmin && activeTab === 'audit' &&
        (loadingAudit ? (
          <CommandSection className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </CommandSection>
        ) : (
          <div className="space-y-2">
            {auditLogs?.map((log) => (
              <div
                key={log.id}
                className="flex flex-col justify-between gap-2 border border-white/10 bg-white/[0.025] p-3 sm:flex-row sm:items-center"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="border border-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {log.access_type}
                  </span>
                  <span className="text-sm text-white">
                    {log.resource_type}
                    {log.field_name && (
                      <span className="text-zinc-400">
                        {' '}
                        / {log.field_name}
                      </span>
                    )}
                  </span>
                </div>
                <span className="font-mono text-xs tabular-nums text-zinc-500">
                  {format(new Date(log.accessed_at), 'MMM d HH:mm:ss')}
                </span>
              </div>
            ))}

            {auditLogs?.length === 0 && (
              <CommandEmptyState
                title="No audit logs found"
                icon={<Shield className="h-5 w-5" />}
              />
            )}
          </div>
        ))}
    </AdminPage>
  );
}
