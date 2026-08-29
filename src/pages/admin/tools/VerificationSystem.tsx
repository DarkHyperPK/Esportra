import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Clock,
  User,
  Building,
  FileText,
  MapPin,
  Globe,
  ImageIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { auditLog } from "@/lib/auditLog";
import { useToast } from "@/hooks/use-toast";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  useAdminVerificationRequests,
  useAdminVerificationAction,
  useAdminVerificationDelete,
} from "@/hooks/useAdminQueries";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  CommandButton,
  CommandIconButton,
  CommandSection,
  CommandSegmentedButton,
  CommandToolbar,
} from "@/components/management/CommandSurface";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VerificationRequest {
  id: string;
  user_id: string;
  requested_role: 'organizer' | 'venue_owner';
  status: string;

  // Top level fields
  first_name: string;
  last_name: string;
  business_name: string;
  business_type: string;
  business_description: string;
  contact_email: string;
  cnic_front_url: string | null;
  cnic_back_url: string | null;

  // New top-level fields from backend update
  experience_description: string | null;
  website_url: string | null;
  phone: string | null;
  date_of_birth: string | null;

  // JSONB Data
  organizer_data: any;
  venue_data: any;

  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    email: string | null;
  };
}

const STATUS_BADGE: Record<string, string> = {
  'pending': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  'approved': 'border-white/25 bg-white/[0.05] text-white',
  'rejected': 'border-red-500/30 bg-red-500/10 text-red-300',
  'stale': 'border-amber-500/30 bg-amber-500/10 text-amber-300',
};

const VerificationSystemTool = () => {
  const { toast } = useToast();
  const { can } = useAdminAccess();
  const { data: rawRequests, isLoading: loading, refetch } = useAdminVerificationRequests();
  const verificationAction = useAdminVerificationAction();
  const verificationDelete = useAdminVerificationDelete();

  const requests = useMemo<VerificationRequest[]>(() =>
    (rawRequests || []).map((r: any) => ({
      ...r,
      profiles: r.profiles || {
        username: r.profile_username || null,
        full_name: r.profile_full_name || null,
        email: r.profile_email || null,
      },
    })),
    [rawRequests]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    try {
      await verificationAction.mutateAsync({
        requestId,
        updates: { status: newStatus }
      });

      await auditLog.log(action as any, 'user', requestId, `${selectedRequest?.first_name} ${selectedRequest?.last_name}`, {
        status: newStatus,
        role: selectedRequest?.requested_role
      });

      toast({
        title: action === 'approve' ? 'Request Approved' : 'Request Rejected',
        description: action === 'approve'
          ? `Application approved for ${selectedRequest?.requested_role.replace('_', ' ')}.`
          : 'Verification request has been rejected.'
      });
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process request.',
        variant: 'destructive'
      });
    }

    setActionDialogOpen(false);
    setSelectedRequest(null);
  };

  const exportCSV = () => {
    const csv = [
      ['ID', 'User', 'Role', 'Status', 'Created At'],
      ...filteredRequests.map(r => [
        r.id,
        r.profiles?.full_name || r.profiles?.username || r.user_id,
        r.requested_role,
        r.status,
        r.created_at
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verification_requests_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = !searchTerm ||
      r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.requested_role?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const getStatusBadge = (status: string) => {
    return STATUS_BADGE[status] || 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  };

  // Helper to render image or placeholder
  const RenderImage = ({ path, label }: { path: string | null; label: string }) => {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
      if (!path) return;

      // If it's already a full http URL, use it directly (legacy support)
      if (path.startsWith('http')) {
        setSignedUrl(path);
        return;
      }

      const fetchSignedUrl = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .storage
          .from('users.documents.kyc')
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          setSignedUrl(data.signedUrl);
          setError(false);
        } else {
          console.error('[VerificationSystem] Error signing URL:', error);
          if (error) console.error('[VerificationSystem] Failed path:', path);
          setError(true);
        }
        setLoading(false);
      };

      fetchSignedUrl();
    }, [path]);

    if (!path) return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 border border-white/10 bg-white/[0.02] p-4 text-xs text-zinc-500">
        <ImageIcon className="h-5 w-5 opacity-50" />
        <span>No {label}</span>
      </div>
    );

    if (error) return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 border border-red-500/30 bg-red-950/10 p-4 text-xs text-red-300">
        <XCircle className="h-5 w-5 opacity-50" />
        <span>Failed to load</span>
      </div>
    );

    if (loading || !signedUrl) return (
      <div className="flex h-32 animate-pulse flex-col items-center justify-center gap-1 border border-white/10 bg-white/[0.02] p-4 text-xs text-zinc-500">
        <RefreshCw className="h-5 w-5 animate-spin opacity-50" />
        <span>Loading...</span>
      </div>
    );

    return (
      <div className="space-y-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{label}</p>
        <div className="group relative overflow-hidden border border-white/10 bg-black/40">
          <img src={signedUrl} loading="lazy" alt={label} className="h-48 w-full object-contain" />
          <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setPreviewOpen(true)}>
            <div className="border border-white/20 bg-black/60 p-2 text-white hover:bg-white/10">
              <Eye className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Fullscreen Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="flex h-[90vh] max-w-5xl flex-col -none border-white/10 bg-[#0a0a0c] p-2">
            <DialogHeader className="absolute left-4 top-4 z-10">
              <DialogTitle className="border border-white/10 bg-black/70 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-white">{label}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-1 items-center justify-center overflow-hidden border border-white/10 bg-black/50">
              <img src={signedUrl} loading="lazy" alt={label} className="max-h-full max-w-full object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <AdminPage
      eyebrow="Users & Access"
      title="Verifications"
      description="Review incoming organizer and venue applications"
      actions={
        <>
          <CommandButton variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </CommandButton>
          <CommandButton variant="ghost" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Export
          </CommandButton>
        </>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Requests', value: stats.total, icon: FileText, tone: 'text-zinc-400' },
          { label: 'Pending', value: stats.pending, icon: Clock, tone: 'text-amber-300' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, tone: 'text-white' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, tone: 'text-red-300' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-white/10 bg-white/[0.025] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.tone}`} />
            </div>
            <p className="mt-3 text-2xl font-black tabular-nums text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <CommandToolbar>
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            placeholder="Search by name, role, or business..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full -none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto" data-lenis-prevent>
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <CommandSegmentedButton
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status === 'all' ? 'All' : status}
            </CommandSegmentedButton>
          ))}
        </div>
      </CommandToolbar>

      {/* Requests Table */}
      <CommandSection className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead className="bg-black/40 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No requests found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, idx) => (
                  <tr
                    key={request.id || `${request.user_id}-${request.requested_role || idx}`}
                    className="text-zinc-300 transition-colors hover:bg-white/[0.03]"
                    style={{ animationDelay: `${idx * 0.01}s` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 text-zinc-400">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {request.first_name} {request.last_name}
                          </p>
                          <p className="truncate font-mono text-[10px] text-zinc-500">@{request.profiles?.username || 'user'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="border border-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                        {request.requested_role?.replace('_', ' ') || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-zinc-200">{request.business_name}</span>
                        <span className="text-xs capitalize text-zinc-500">{request.business_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-zinc-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <CommandIconButton label="Request actions" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </CommandIconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="-none border-white/10 bg-[#0a0a0c]">
                          <DropdownMenuItem
                            className="cursor-pointer text-zinc-300 focus:bg-white/5 focus:text-white"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {request.status === 'pending' && can("verification:approve") && (
                            <DropdownMenuItem
                              className="cursor-pointer text-white focus:bg-white/10 focus:text-white"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('approve');
                                setActionDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                          )}

                          {request.status === 'pending' && can("verification:approve") && (
                            <DropdownMenuItem
                              className="cursor-pointer text-red-300 focus:bg-red-500/10 focus:text-red-200"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('reject');
                                setActionDialogOpen(true);
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          )}

                          {can("verification:delete") && (
                            <DropdownMenuItem
                              className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
                              onClick={() => {
                                if (confirm('Delete this verification request permanently?')) {
                                  verificationDelete.mutate(request.id);
                                }
                              }}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CommandSection>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="-none border-white/10 bg-[#0a0a0c]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              {actionType === 'approve' ? (
                <CheckCircle className="h-4 w-4 text-white" />
              ) : (
                <XCircle className="h-4 w-4 text-red-300" />
              )}
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400">
            Are you sure you want to {actionType} this verification request from{' '}
            <span className="font-medium text-white">
              {selectedRequest?.first_name} {selectedRequest?.last_name}
            </span>?
          </p>
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </CommandButton>
            {can("verification:approve") && (
              <CommandButton
                variant={actionType === 'approve' ? 'primary' : 'danger'}
                size="sm"
                onClick={() => selectedRequest && handleAction(selectedRequest.id, actionType)}
              >
                {actionType === 'approve' ? 'Approve' : 'Reject'}
              </CommandButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!selectedRequest && !actionDialogOpen} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl gap-0 overflow-y-auto overscroll-contain -none border-white/10 bg-[#0a0a0c] p-0" data-lenis-prevent>
          {selectedRequest && (
            <>
              {/* Header Strip */}
              <div className="flex flex-wrap items-center gap-4 border-b border-white/10 bg-black/40 px-6 py-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 text-zinc-400">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black uppercase tracking-tight text-white">{selectedRequest.first_name} {selectedRequest.last_name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-400">
                    <span className="border border-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-300">{selectedRequest.requested_role?.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{selectedRequest.contact_email}</span>
                  </div>
                </div>
                <div className="ml-auto">
                  <span className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(selectedRequest.status)}`}>{selectedRequest.status}</span>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="mb-6 -none border border-white/10 bg-black/40">
                    <TabsTrigger value="details" className="-none font-mono text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-white/[0.06] data-[state=active]:text-white">Details</TabsTrigger>
                    <TabsTrigger value="experience" className="-none font-mono text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-white/[0.06] data-[state=active]:text-white">Experience</TabsTrigger>
                    <TabsTrigger value="documents" className="-none font-mono text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-white/[0.06] data-[state=active]:text-white">Documents & Photos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6">
                    {/* Business Info */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                          <Building className="h-4 w-4" />
                          Business Details
                        </h3>
                        <div className="space-y-3 border border-white/10 bg-white/[0.025] p-4">
                          <div>
                            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Name</label>
                            <p className="text-white">{selectedRequest.business_name}</p>
                          </div>
                          <div>
                            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Type</label>
                            <p className="capitalize text-white">{selectedRequest.business_type}</p>
                          </div>
                          <div>
                            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Description</label>
                            <p className="mt-1 text-sm text-zinc-300">{selectedRequest.business_description}</p>
                          </div>
                          {selectedRequest.venue_data?.business_address && (
                            <div>
                              <label className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500"><MapPin className="h-3 w-3" /> Address</label>
                              <p className="text-sm text-white">{selectedRequest.venue_data.business_address}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                          <Globe className="h-4 w-4" />
                          Contact & Stats
                        </h3>
                        <div className="space-y-3 border border-white/10 bg-white/[0.025] p-4">
                          {selectedRequest.organizer_data?.website || selectedRequest.venue_data?.website ? (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Website</label>
                              <a href={selectedRequest.organizer_data?.website || selectedRequest.venue_data?.website} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-rose-300 transition-colors hover:text-rose-200 hover:underline">{selectedRequest.organizer_data?.website || selectedRequest.venue_data?.website}</a>
                            </div>
                          ) : null}

                          <div>
                            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Phone</label>
                            <p className="text-sm text-white">{selectedRequest.organizer_data?.contact_phone || selectedRequest.venue_data?.contact_phone || 'N/A'}</p>
                          </div>

                          {selectedRequest.requested_role === 'organizer' && (
                            <>
                              <div>
                                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Experience</label>
                                <p className="text-sm tabular-nums text-white">{selectedRequest.organizer_data?.years_experience || 0} Years</p>
                              </div>
                              <div>
                                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Socials</label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {['twitter', 'discord', 'instagram'].map(social => {
                                    const link = selectedRequest.organizer_data?.social_media_links?.[social];
                                    if (!link) return null;
                                    return <span key={social} className="border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] capitalize text-zinc-300">{social}: {link}</span>
                                  })}
                                </div>
                              </div>
                            </>
                          )}

                          {selectedRequest.requested_role === 'venue_owner' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Total PCs</label>
                                  <p className="text-sm tabular-nums text-white">{selectedRequest.venue_data?.total_pcs || 0}</p>
                                </div>
                                <div>
                                  <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Hourly Rate</label>
                                  <p className="text-sm tabular-nums text-white">PKR {selectedRequest.venue_data?.hourly_rate || 0}</p>
                                </div>
                              </div>
                              <div>
                                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">PC Specs</label>
                                <p className="mt-1 border-l-2 border-white/10 pl-2 text-xs text-zinc-300">{selectedRequest.venue_data?.pc_specs || 'N/A'}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="experience" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {/* Personal Info */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                          <User className="h-4 w-4" />
                          Personal Information
                        </h3>
                        <div className="space-y-3 border border-white/10 bg-white/[0.025] p-4">
                          {selectedRequest.date_of_birth && (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Date of Birth</label>
                              <p className="font-mono text-sm tabular-nums text-white">{new Date(selectedRequest.date_of_birth).toLocaleDateString()}</p>
                            </div>
                          )}
                          {selectedRequest.phone && (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Phone</label>
                              <p className="font-mono text-sm tabular-nums text-white">{selectedRequest.phone}</p>
                            </div>
                          )}
                          {selectedRequest.website_url && (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Website</label>
                              <a href={selectedRequest.website_url} target="_blank" rel="noopener noreferrer" className="block break-all text-sm text-rose-300 transition-colors hover:text-rose-200 hover:underline">{selectedRequest.website_url}</a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Experience Details */}
                      <div className="space-y-4">
                        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                          <FileText className="h-4 w-4" />
                          Experience
                        </h3>
                        <div className="space-y-3 border border-white/10 bg-white/[0.025] p-4">
                          {selectedRequest.organizer_data?.years_experience != null && (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Years of Experience</label>
                              <p className="text-sm tabular-nums text-white">{selectedRequest.organizer_data.years_experience} years</p>
                            </div>
                          )}
                          {selectedRequest.organizer_data?.staff_count != null && (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Staff Count</label>
                              <p className="text-sm tabular-nums text-white">{selectedRequest.organizer_data.staff_count} people</p>
                            </div>
                          )}
                          {selectedRequest.organizer_data?.equipment_list && (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Equipment</label>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{selectedRequest.organizer_data.equipment_list}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Experience Description - Full Width */}
                    {selectedRequest.experience_description && (
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                          <FileText className="h-4 w-4" />
                          Experience Description
                        </h3>
                        <div className="border border-white/10 bg-white/[0.025] p-4">
                          <p className="whitespace-pre-wrap text-sm text-zinc-300">{selectedRequest.experience_description}</p>
                        </div>
                      </div>
                    )}

                    {/* Organizer Socials */}
                    {selectedRequest.requested_role === 'organizer' && selectedRequest.organizer_data?.social_media_links && (
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                          <Globe className="h-4 w-4" />
                          Social Media
                        </h3>
                        <div className="border border-white/10 bg-white/[0.025] p-4">
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(selectedRequest.organizer_data.social_media_links as Record<string, string | null | undefined>).map(([platform, url]) => (
                              url && (
                                <a
                                  key={platform}
                                  href={url as string}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                                >
                                  {platform}
                                </a>
                              )
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Venue Specific */}
                    {selectedRequest.requested_role === 'venue_owner' && selectedRequest.venue_data && (
                      <div className="space-y-3">
                        <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                          <MapPin className="h-4 w-4" />
                          Venue Specifications
                        </h3>
                        <div className="grid grid-cols-2 gap-4 border border-white/10 bg-white/[0.025] p-4 md:grid-cols-4">
                          {selectedRequest.venue_data.total_pcs != null && (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Total PCs</label>
                              <p className="text-lg font-black tabular-nums text-white">{selectedRequest.venue_data.total_pcs}</p>
                            </div>
                          )}
                          {selectedRequest.venue_data.hourly_rate != null && (
                            <div>
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Hourly Rate</label>
                              <p className="text-lg font-black tabular-nums text-white">PKR {selectedRequest.venue_data.hourly_rate}</p>
                            </div>
                          )}
                          {selectedRequest.venue_data.operating_hours && (
                            <div className="col-span-2">
                              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Operating Hours</label>
                              <p className="text-sm text-white">{selectedRequest.venue_data.operating_hours}</p>
                            </div>
                          )}
                        </div>
                        {selectedRequest.venue_data.pc_specs && (
                          <div className="mt-3 border border-white/10 bg-white/[0.025] p-4">
                            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">PC Specifications</label>
                            <p className="whitespace-pre-wrap font-mono text-sm text-zinc-300">{selectedRequest.venue_data.pc_specs}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="documents">
                    <div className="space-y-6">
                      <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                        <FileText className="h-4 w-4" />
                        Review Documents
                      </h3>

                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* CNIC - Standard for all */}
                        <RenderImage
                          path={selectedRequest.organizer_data?.cnic_front_path || selectedRequest.venue_data?.cnic_front_path || selectedRequest.cnic_front_url}
                          label="CNIC Front"
                        />
                        <RenderImage
                          path={selectedRequest.organizer_data?.cnic_back_path || selectedRequest.venue_data?.cnic_back_path || selectedRequest.cnic_back_url}
                          label="CNIC Back"
                        />

                        {/* Venue - Extra Images */}
                        {selectedRequest.requested_role === 'venue_owner' && selectedRequest.venue_data?.venue_images && (
                          <>
                            <RenderImage path={selectedRequest.venue_data.venue_images.exterior} label="Venue Exterior" />
                            <RenderImage path={selectedRequest.venue_data.venue_images.interior} label="Venue Interior" />
                            <RenderImage path={selectedRequest.venue_data.venue_images.gaming_area} label="Gaming Area" />
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-black/60 p-6 backdrop-blur-sm">
                <CommandButton variant="ghost" size="sm" onClick={() => setSelectedRequest(null)}>
                  Close
                </CommandButton>
                {selectedRequest.status === 'pending' && can("verification:approve") && (
                  <>
                    <CommandButton variant="danger" size="sm" onClick={() => { setActionType('reject'); setActionDialogOpen(true); }}>
                      Reject
                    </CommandButton>
                    <CommandButton size="sm" onClick={() => { setActionType('approve'); setActionDialogOpen(true); }}>
                      Approve Request
                    </CommandButton>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default VerificationSystemTool;
