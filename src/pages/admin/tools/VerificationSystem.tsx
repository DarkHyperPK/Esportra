import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
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
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { auditLog } from "@/lib/auditLog";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminVerificationRequests,
  useAdminVerificationAction,
  useAdminVerificationDelete,
} from "@/hooks/useAdminQueries";
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

const VerificationSystemTool = () => {
  const { toast } = useToast();
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
    const styles: Record<string, string> = {
      'pending': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      'approved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'rejected': 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return styles[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
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
      <div className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center justify-center text-zinc-500 h-32 border border-zinc-800">
        <ImageIcon className="w-6 h-6 mb-2 opacity-50" />
        <span className="text-xs">No {label}</span>
      </div>
    );

    if (error) return (
      <div className="bg-red-900/10 rounded-lg p-4 flex flex-col items-center justify-center text-red-500 h-32 border border-red-900/30">
        <XCircle className="w-6 h-6 mb-2 opacity-50" />
        <span className="text-xs">Failed to load</span>
      </div>
    );

    if (loading || !signedUrl) return (
      <div className="bg-zinc-900 rounded-lg p-4 flex flex-col items-center justify-center text-zinc-500 h-32 border border-zinc-800 animate-pulse">
        <RefreshCw className="w-6 h-6 mb-2 opacity-50 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );

    return (
      <div className="space-y-2">
        <p className="text-xs text-zinc-400 font-medium">{label}</p>
        <div className="relative group rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900">
          <img src={signedUrl} loading="lazy" alt={label} className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setPreviewOpen(true)}>
            <div className="text-white bg-black/50 p-2 rounded-full hover:bg-white/20">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Fullscreen Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="bg-zinc-950/95 border-zinc-800 max-w-5xl h-[90vh] flex flex-col p-2">
            <DialogHeader className="absolute top-4 left-4 z-10">
              <DialogTitle className="text-white drop-shadow-md bg-black/50 px-3 py-1 rounded-full text-sm">{label}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-black/50">
              <img src={signedUrl} loading="lazy" alt={label} className="max-w-full max-h-full object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Verification Requests</h1>
              <p className="text-zinc-500 text-sm">Review incoming organizer and venue applications</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-zinc-800 text-zinc-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={exportCSV}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.header>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: 'Total Requests', value: stats.total, icon: FileText, color: 'zinc' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'amber' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'emerald' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'red' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col md:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search by name, role, or business..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={`border-zinc-800 capitalize ${statusFilter === status ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'text-zinc-400'}`}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Requests Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900/50">
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Submitted</th>
                <th className="px-6 py-3 text-right text-xs font-mono text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-500">
                    No requests found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request, idx) => (
                  <motion.tr
                    key={request.id || `${request.user_id}-${request.requested_role || idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-700">
                          <User className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {request.first_name} {request.last_name}
                          </p>
                          <p className="text-xs text-zinc-500">@{request.profiles?.username || 'user'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-zinc-500/10 text-zinc-300 border-zinc-700 capitalize">
                        {request.requested_role?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-200">{request.business_name}</span>
                        <span className="text-xs text-gray-500 capitalize">{request.business_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`${getStatusBadge(request.status)} border text-xs capitalize`}>
                        {request.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0a0a0c] border-zinc-800">
                          <DropdownMenuItem
                            className="text-zinc-300 focus:text-white focus:bg-zinc-800 cursor-pointer"
                            onClick={() => setSelectedRequest(request)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {request.status === 'pending' && (
                            <DropdownMenuItem
                              className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10 cursor-pointer"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('approve');
                                setActionDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                          )}

                          {request.status === 'pending' && (
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('reject');
                                setActionDialogOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            className="text-red-500 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                            onClick={() => {
                              if (confirm('Delete this verification request permanently?')) {
                                verificationDelete.mutate(request.id);
                              }
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {actionType === 'approve' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400">
            Are you sure you want to {actionType} this verification request from{' '}
            <span className="text-white font-medium">
              {selectedRequest?.first_name} {selectedRequest?.last_name}
            </span>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} className="border-zinc-800">
              Cancel
            </Button>
            <Button
              className={actionType === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}
              onClick={() => selectedRequest && handleAction(selectedRequest.id, actionType)}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!selectedRequest && !actionDialogOpen} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="bg-[#111] border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {selectedRequest && (
            <>
              {/* Header Image/Banner */}
              <div className="h-32 bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-800 flex items-center px-8 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] bg-center"></div>
                <div className="flex items-center gap-4 z-10">
                  <div className="w-16 h-16 rounded-full bg-zinc-950 border-4 border-[#111] flex items-center justify-center shadow-xl">
                    <User className="w-8 h-8 text-zinc-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedRequest.first_name} {selectedRequest.last_name}</h2>
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <Badge variant="outline" className="bg-white/5 border-zinc-700 capitalize">{selectedRequest.requested_role?.replace('_', ' ')}</Badge>
                      <span>•</span>
                      <span>{selectedRequest.contact_email}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-auto z-10">
                  <Badge className={`${getStatusBadge(selectedRequest.status)} px-3 py-1 capitalize`}>{selectedRequest.status}</Badge>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="documents">Documents & Photos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6">
                    {/* Business Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Building className="w-4 h-4 text-rose-500" />
                          Business Details
                        </h3>
                        <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                          <div>
                            <label className="text-xs text-zinc-500 uppercase">Name</label>
                            <p className="text-white">{selectedRequest.business_name}</p>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 uppercase">Type</label>
                            <p className="text-white capitalize">{selectedRequest.business_type}</p>
                          </div>
                          <div>
                            <label className="text-xs text-zinc-500 uppercase">Description</label>
                            <p className="text-zinc-300 text-sm mt-1">{selectedRequest.business_description}</p>
                          </div>
                          {selectedRequest.venue_data?.business_address && (
                            <div>
                              <label className="text-xs text-zinc-500 uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</label>
                              <p className="text-white text-sm">{selectedRequest.venue_data.business_address}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-emerald-500" />
                          Contact & Stats
                        </h3>
                        <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                          {selectedRequest.organizer_data?.website || selectedRequest.venue_data?.website ? (
                            <div>
                              <label className="text-xs text-zinc-500 uppercase">Website</label>
                              <a href={selectedRequest.organizer_data?.website || selectedRequest.venue_data?.website} target="_blank" className="text-blue-400 block text-sm hover:underline">{selectedRequest.organizer_data?.website || selectedRequest.venue_data?.website}</a>
                            </div>
                          ) : null}

                          <div>
                            <label className="text-xs text-zinc-500 uppercase">Phone</label>
                            <p className="text-white text-sm">{selectedRequest.organizer_data?.contact_phone || selectedRequest.venue_data?.contact_phone || 'N/A'}</p>
                          </div>

                          {selectedRequest.requested_role === 'organizer' && (
                            <>
                              <div>
                                <label className="text-xs text-zinc-500 uppercase">Experience</label>
                                <p className="text-white text-sm">{selectedRequest.organizer_data?.years_experience || 0} Years</p>
                              </div>
                              <div>
                                <label className="text-xs text-zinc-500 uppercase">Socials</label>
                                <div className="flex gap-2 mt-1">
                                  {['twitter', 'discord', 'instagram'].map(social => {
                                    const link = selectedRequest.organizer_data?.social_media_links?.[social];
                                    if (!link) return null;
                                    return <Badge key={social} variant="secondary" className="capitalize">{social}: {link}</Badge>
                                  })}
                                </div>
                              </div>
                            </>
                          )}

                          {selectedRequest.requested_role === 'venue_owner' && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-zinc-500 uppercase">Total PCs</label>
                                  <p className="text-white text-sm">{selectedRequest.venue_data?.total_pcs || 0}</p>
                                </div>
                                <div>
                                  <label className="text-xs text-zinc-500 uppercase">Hourly Rate</label>
                                  <p className="text-white text-sm">PKR {selectedRequest.venue_data?.hourly_rate || 0}</p>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-zinc-500 uppercase">PC Specs</label>
                                <p className="text-zinc-300 text-xs mt-1 border-l-2 border-white/10 pl-2">{selectedRequest.venue_data?.pc_specs || 'N/A'}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents">
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Review Documents
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="bg-zinc-900/50 p-6 border-t border-zinc-800 flex justify-end gap-3 sticky bottom-0">
                <Button variant="ghost" onClick={() => setSelectedRequest(null)} className="text-zinc-400 hover:text-white">
                  Close
                </Button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button onClick={() => { setActionType('reject'); setActionDialogOpen(true); }} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/50 border">
                      Reject
                    </Button>
                    <Button onClick={() => { setActionType('approve'); setActionDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                      Approve Request
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerificationSystemTool;
