import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { writeGhostModeSession, type GhostModeSession } from '@/lib/ghostModeSession';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { useAdminAccess } from '@/hooks/useAdminAccess';

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
  const { isActive: ghostIsActive } = useGhostMode();

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
      apiClient.post<{
        session_id: string;
        ghost_token: string;
        expires_at: string;
        target_user: { id: string; username: string };
      }>(`/api/admin/ghost/${targetUserId}`, { reason }),
    onSuccess: (data) => {
      if (data) {
        const sessionData: GhostModeSession = {
          token: data.ghost_token,
          sessionId: data.session_id,
          adminId: '',
          targetUserId: data.target_user.id,
          targetLabel: data.target_user.username,
          scopes: ['view'],
          expiresAt: data.expires_at,
        };
        writeGhostModeSession(sessionData);
        queryClient.invalidateQueries({ queryKey: ['admin', 'ghost-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'ghost-approvals', 'mine'] });
        toast.success(`Ghost mode started for ${data.target_user.username}`);
      }
      setStartingSessionFor(null);
    },
    onError: () => {
      toast.error('Failed to start ghost session');
      setStartingSessionFor(null);
    },
  });

  const activeSessions = sessions?.filter((s) => !s.ended_at && new Date(s.expires_at) > new Date()) ?? [];
  const pastSessions = sessions?.filter((s) => s.ended_at || new Date(s.expires_at) <= new Date()) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ghost Mode</h1>
          <p className="text-zinc-400 mt-1">
            Securely view user accounts with full audit trails
          </p>
        </div>
        <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserSearch className="w-4 h-4" />
              {isSuperAdmin ? 'Enter Ghost Mode' : 'Request Access'}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle>{isSuperAdmin ? 'Enter Ghost Mode' : 'Request Ghost Mode Access'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Search User</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search by username or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700"
                  />
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="mt-2 border border-zinc-700 rounded-lg overflow-hidden">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setTargetUserId(user.id);
                          setUserSearch(user.username);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
                          targetUserId === user.id ? 'bg-zinc-800' : ''
                        }`}
                      >
                        <span className="text-white">{user.username}</span>
                        <span className="text-zinc-500 ml-2">{user.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">
                  Reason for access
                </label>
                <Textarea
                  placeholder="Explain why you need to view this user's account..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  rows={3}
                />
              </div>

              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200/80">
                  {isSuperAdmin
                    ? 'Ghost mode access is logged and auditable. All viewed pages and unmasked fields are recorded.'
                    : 'Your request will be reviewed by a super admin. Ghost mode access is logged and auditable.'}
                </div>
              </div>

              <Button
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
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {isSuperAdmin ? 'Enter Ghost Mode' : 'Submit Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isSuperAdmin && pendingApprovals && pendingApprovals.length > 0 && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <h3 className="text-white font-medium flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-yellow-500" />
            Pending Approvals ({pendingApprovals.length})
          </h3>
          <div className="space-y-2">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg"
              >
                <div>
                  <div className="text-sm text-white">
                    <span className="font-medium">{approval.requester_name}</span>
                    {' wants to view '}
                    <span className="font-medium">{approval.target_user_name}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{approval.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => denyRequest.mutate({ id: approval.id, reason: 'Denied' })}
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approveRequest.mutate(approval.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isSuperAdmin && !ghostIsActive && myApprovedRequests && myApprovedRequests.length > 0 && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <h3 className="text-white font-medium flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Approved Requests ({myApprovedRequests.length})
          </h3>
          <div className="space-y-2">
            {myApprovedRequests.map((approval) => (
              <div
                key={approval.id}
                className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg"
              >
                <div>
                  <div className="text-sm text-white">
                    Ready to view{' '}
                    <span className="font-medium">{approval.target_user_name}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Approved by {approval.approver_name}
                    {approval.expires_at && (
                      <> · Expires {formatDistanceToNow(new Date(approval.expires_at), { addSuffix: true })}</>
                    )}
                  </p>
                </div>
                <Button
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
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  Enter Ghost Mode
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900/50 border border-zinc-800">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
        </TabsList>

        <TabsContent value="sessions" className="mt-4">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="space-y-6">
              {activeSessions.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Active Sessions</h3>
                  <div className="space-y-2">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <div>
                              <span className="text-white font-medium">
                                {session.admin_name}
                              </span>
                              <span className="text-zinc-400"> viewing </span>
                              <span className="text-white font-medium">
                                {session.target_user_name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {session.pages_viewed} pages
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
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
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Past Sessions</h3>
                {pastSessions.length > 0 ? (
                  <div className="space-y-2">
                    {pastSessions.map((session) => (
                      <div
                        key={session.id}
                        className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white font-medium">
                              {session.admin_name}
                            </span>
                            <span className="text-zinc-400"> viewed </span>
                            <span className="text-white font-medium">
                              {session.target_user_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {session.pages_viewed} pages
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
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
                  <div className="text-center py-8 text-zinc-500">
                    No past sessions
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="audit" className="mt-4">
            {loadingAudit ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs?.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">
                          {log.access_type}
                        </Badge>
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
                      <span className="text-xs text-zinc-500">
                        {format(new Date(log.accessed_at), 'MMM d HH:mm:ss')}
                      </span>
                    </div>
                  </div>
                ))}

                {auditLogs?.length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    No audit logs found
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
