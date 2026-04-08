import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Shield, Download, CheckCircle, XCircle, Clock,
  AlertTriangle, User, Database, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  useGdprRequests, useGdprStats, useConsentRecords, useProcessGdprRequest,
  type GdprRequest, type ConsentRecord,
} from '@/hooks/useAdminQueries';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ── Skeleton components ───────────────────────────────────────────────────────

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-20 rounded-2xl bg-white/5" />
    ))}
  </div>
);

const RequestCardSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
    ))}
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-12 rounded-xl bg-white/5" />
    ))}
  </div>
);

// ── Stats Bar ─────────────────────────────────────────────────────────────────

interface StatsBarProps {
  pendingRequests: number;
  completedToday: number;
  exportRequests: number;
  deletionRequests: number;
  avgProcessingDays: number;
}

const StatsBar = ({ pendingRequests, completedToday, exportRequests, deletionRequests, avgProcessingDays }: StatsBarProps) => {
  const items = [
    {
      label: 'Pending',
      value: pendingRequests,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
    },
    {
      label: 'Completed Today',
      value: completedToday,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/20',
    },
    {
      label: 'Export Requests',
      value: exportRequests,
      icon: Download,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
    },
    {
      label: 'Deletion Requests',
      value: deletionRequests,
      icon: XCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-400/10',
      border: 'border-rose-400/20',
    },
    {
      label: 'Avg. Processing',
      value: `${avgProcessingDays}d`,
      icon: Database,
      color: 'text-zinc-400',
      bg: 'bg-zinc-400/10',
      border: 'border-zinc-400/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`flex flex-col gap-2 p-4 rounded-2xl border ${item.bg} ${item.border}`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-xs text-zinc-400 font-medium">{item.label}</span>
            </div>
            <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
    processing: { label: 'Processing', className: 'bg-blue-400/15 text-blue-400 border-blue-400/30' },
    completed: { label: 'Completed', className: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' },
    failed: { label: 'Failed', className: 'bg-red-400/15 text-red-400 border-red-400/30' },
    rejected: { label: 'Rejected', className: 'bg-rose-400/15 text-rose-400 border-rose-400/30' },
  };
  const cfg = map[status.toLowerCase()] ?? { label: status, className: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30' };
  return (
    <Badge className={`text-xs border ${cfg.className} capitalize`}>{cfg.label}</Badge>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  if (type.toLowerCase() === 'export') {
    return <Badge className="text-xs border bg-blue-400/15 text-blue-400 border-blue-400/30">Export</Badge>;
  }
  return <Badge className="text-xs border bg-rose-400/15 text-rose-400 border-rose-400/30">Deletion</Badge>;
};

// ── Process Dialog ─────────────────────────────────────────────────────────────

interface ProcessDialogProps {
  request: GdprRequest | null;
  action: 'approve' | 'reject' | null;
  onClose: () => void;
}

const ProcessDialog = ({ request, action, onClose }: ProcessDialogProps) => {
  const [notes, setNotes] = useState('');
  const { mutate, isPending } = useProcessGdprRequest();

  const open = !!(request && action);

  const handleSubmit = () => {
    if (!request || !action) return;
    if (action === 'reject' && !notes.trim()) return;
    mutate({ id: request.id, action, notes: notes.trim() || undefined }, {
      onSuccess: () => { onClose(); setNotes(''); },
    });
  };

  const handleClose = () => { onClose(); setNotes(''); };

  const isDeletion = request?.requestType?.toLowerCase() === 'deletion';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold text-white">
            {action === 'approve' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400" />
            )}
            {action === 'approve' ? 'Approve' : 'Reject'} GDPR Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-white/10 text-white text-xs">
                {request?.username?.[0]?.toUpperCase() ?? <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{request?.username ?? 'Unknown'}</p>
              <p className="text-xs text-zinc-400 truncate">{request?.email ?? '—'}</p>
            </div>
            <div className="ml-auto shrink-0">
              {request && <TypeBadge type={request.requestType} />}
            </div>
          </div>

          {/* Deletion warning */}
          {action === 'approve' && isDeletion && (
            <div className="flex gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300 leading-relaxed">
                <strong className="text-red-400">Irreversible action.</strong> This will permanently anonymize
                the user's data. This action cannot be undone.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Notes {action === 'reject' ? <span className="text-rose-400">*</span> : <span className="text-zinc-500">(optional)</span>}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === 'reject' ? 'Reason for rejection (required)…' : 'Additional notes…'}
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 resize-none h-24 focus:border-rose-500/50"
            />
            {action === 'reject' && !notes.trim() && (
              <p className="text-xs text-rose-400">A reason is required when rejecting a request.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-white/10 text-zinc-300 hover:bg-white/5"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 font-semibold ${
                action === 'approve'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : 'bg-rose-500 hover:bg-rose-600 text-white'
              }`}
              onClick={handleSubmit}
              disabled={isPending || (action === 'reject' && !notes.trim())}
            >
              {isPending ? 'Processing…' : action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Request Card ───────────────────────────────────────────────────────────────

interface RequestCardProps {
  request: GdprRequest;
  onAction: (request: GdprRequest, action: 'approve' | 'reject') => void;
}

const RequestCard = ({ request, onAction }: RequestCardProps) => {
  const isPending = request.status.toLowerCase() === 'pending';
  const isCompleted = request.status.toLowerCase() === 'completed';
  const hasDownload = isCompleted && request.downloadUrl;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-[#0a0a0c] border border-white/5 hover:border-white/10 transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-9 h-9 shrink-0">
          <AvatarFallback className="bg-white/10 text-white text-sm">
            {request.username?.[0]?.toUpperCase() ?? <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="font-semibold text-white text-sm">
              {request.username ?? 'Unknown User'}
            </span>
            <TypeBadge type={request.requestType} />
            <StatusBadge status={request.status} />
          </div>
          <p className="text-xs text-zinc-400 truncate mb-1">{request.email ?? '—'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
            <span>Requested: {new Date(request.requestedAt).toLocaleDateString()}</span>
            {request.processedAt && (
              <span>Processed: {new Date(request.processedAt).toLocaleDateString()}</span>
            )}
            {request.processedByUsername && (
              <span>By: {request.processedByUsername}</span>
            )}
          </div>
          {request.notes && (
            <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 italic">"{request.notes}"</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {hasDownload && (
            <div className="space-y-1">
              <a
                href={request.downloadUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-400 border border-blue-400/20 hover:bg-blue-500/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
              {request.expiresAt && (
                <p className="text-[10px] text-zinc-500 text-center">
                  Expires {new Date(request.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          {isPending && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20"
                onClick={() => onAction(request, 'approve')}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-rose-500/10 text-rose-400 border border-rose-400/20 hover:bg-rose-500/20"
                onClick={() => onAction(request, 'reject')}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Pagination ─────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}

const Pagination = ({ page, total, limit, onPage }: PaginationProps) => {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs text-zinc-500">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-white/10 text-zinc-400 hover:bg-white/5 disabled:opacity-30"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-white/10 text-zinc-400 hover:bg-white/5 disabled:opacity-30"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

// ── Data Requests Tab ──────────────────────────────────────────────────────────

const DataRequestsTab = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const [dialogRequest, setDialogRequest] = useState<GdprRequest | null>(null);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null);

  const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
  if (statusFilter) params.status = statusFilter;
  if (typeFilter) params.requestType = typeFilter;

  const { data: statsData, isLoading: statsLoading } = useGdprStats();
  const { data, isLoading, isError, refetch } = useGdprRequests(params);

  const openDialog = (req: GdprRequest, action: 'approve' | 'reject') => {
    setDialogRequest(req);
    setDialogAction(action);
  };

  const closeDialog = () => {
    setDialogRequest(null);
    setDialogAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : statsData ? (
        <StatsBar {...statsData} />
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter || '__all__'} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44 bg-[#0a0a0c] border-white/10 text-zinc-300 focus:border-rose-500/50">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-[#121214] border-white/10 text-white">
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter || '__all__'} onValueChange={(v) => { setTypeFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44 bg-[#0a0a0c] border-white/10 text-zinc-300 focus:border-rose-500/50">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-[#121214] border-white/10 text-white">
            <SelectItem value="__all__">All Types</SelectItem>
            <SelectItem value="export">Export</SelectItem>
            <SelectItem value="deletion">Deletion</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Request list */}
      {isLoading ? (
        <RequestCardSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
          <p className="text-zinc-400">Failed to load GDPR requests.</p>
          <Button variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : !data?.requests?.length ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <FileText className="w-10 h-10 text-zinc-600" />
          <p className="text-zinc-400 font-medium">No requests found</p>
          <p className="text-zinc-600 text-sm">No GDPR requests match the current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.requests.map((req) => (
            <RequestCard key={req.id} request={req} onAction={openDialog} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && (
        <Pagination page={page} total={data.total} limit={PAGE_SIZE} onPage={setPage} />
      )}

      {/* Process dialog */}
      <ProcessDialog request={dialogRequest} action={dialogAction} onClose={closeDialog} />
    </div>
  );
};

// ── Consent Records Tab ────────────────────────────────────────────────────────

const CONSENT_TYPES = ['marketing', 'analytics', 'third_party', 'terms_of_service'];

const ConsentRecordsTab = () => {
  const [typeFilter, setTypeFilter] = useState('');
  const [grantedFilter, setGrantedFilter] = useState('');
  const [page, setPage] = useState(1);

  const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
  if (typeFilter) params.consentType = typeFilter;
  if (grantedFilter) params.granted = grantedFilter;

  const { data, isLoading, isError, refetch } = useConsentRecords(params);

  const formatConsentType = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter || '__all__'} onValueChange={(v) => { setTypeFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-52 bg-[#0a0a0c] border-white/10 text-zinc-300 focus:border-rose-500/50">
            <SelectValue placeholder="All Consent Types" />
          </SelectTrigger>
          <SelectContent className="bg-[#121214] border-white/10 text-white">
            <SelectItem value="__all__">All Types</SelectItem>
            {CONSENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{formatConsentType(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={grantedFilter || '__all__'} onValueChange={(v) => { setGrantedFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40 bg-[#0a0a0c] border-white/10 text-zinc-300 focus:border-rose-500/50">
            <SelectValue placeholder="All Consents" />
          </SelectTrigger>
          <SelectContent className="bg-[#121214] border-white/10 text-white">
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="true">Granted</SelectItem>
            <SelectItem value="false">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
          <p className="text-zinc-400">Failed to load consent records.</p>
          <Button variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : !data?.records?.length ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Shield className="w-10 h-10 text-zinc-600" />
          <p className="text-zinc-400 font-medium">No consent records</p>
          <p className="text-zinc-600 text-sm">No records match the current filters.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_90px_120px_120px_80px] gap-4 px-4 py-3 bg-white/[0.03] border-b border-white/5">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">User</span>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Consent Type</span>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</span>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">IP Address</span>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Date</span>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Version</span>
          </div>

          {/* Rows */}
          {data.records.map((record: ConsentRecord, idx: number) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="flex flex-col md:grid md:grid-cols-[1fr_1fr_90px_120px_120px_80px] gap-2 md:gap-4 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarFallback className="bg-white/10 text-white text-[10px]">
                    {record.username?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-white truncate">{record.username ?? <span className="text-zinc-500">Unknown</span>}</span>
              </div>
              <span className="text-sm text-zinc-300">{formatConsentType(record.consentType)}</span>
              <div>
                {record.granted ? (
                  <Badge className="text-xs border bg-emerald-400/15 text-emerald-400 border-emerald-400/30">Granted</Badge>
                ) : (
                  <Badge className="text-xs border bg-red-400/15 text-red-400 border-red-400/30">Denied</Badge>
                )}
              </div>
              <span className="text-xs text-zinc-400 font-mono">{record.ipAddress ?? '—'}</span>
              <span className="text-xs text-zinc-400">{new Date(record.recordedAt).toLocaleDateString()}</span>
              <span className="text-xs text-zinc-500">{record.version}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && (
        <Pagination page={page} total={data.total} limit={PAGE_SIZE} onPage={setPage} />
      )}
    </div>
  );
};

// ── Page ───────────────────────────────────────────────────────────────────────

const GdprCompliance = () => {
  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <Shield className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
              GDPR Compliance
            </h1>
            <p className="text-sm text-zinc-400">Manage data requests and consent records</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="bg-[#0a0a0c] border border-white/5 p-1 rounded-xl">
            <TabsTrigger
              value="requests"
              className="data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-400 text-zinc-400 rounded-lg px-5 py-2 text-sm font-medium transition-all"
            >
              <FileText className="w-4 h-4 mr-2 inline-block" />
              Data Requests
            </TabsTrigger>
            <TabsTrigger
              value="consent"
              className="data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-400 text-zinc-400 rounded-lg px-5 py-2 text-sm font-medium transition-all"
            >
              <Shield className="w-4 h-4 mr-2 inline-block" />
              Consent Records
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-0">
            <DataRequestsTab />
          </TabsContent>

          <TabsContent value="consent" className="mt-0">
            <ConsentRecordsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GdprCompliance;
