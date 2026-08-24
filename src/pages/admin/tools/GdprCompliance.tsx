import { useState } from 'react';
import {
  FileText, Shield, Download, CheckCircle, XCircle, Clock,
  AlertTriangle, User, Database, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandIconButton,
  CommandEmptyState,
  CommandSection,
  CommandTabs,
} from '@/components/management/CommandSurface';
import {
  useGdprRequests, useGdprStats, useConsentRecords, useProcessGdprRequest,
  type GdprRequest, type ConsentRecord,
} from '@/hooks/useAdminQueries';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const LABEL_CLASS = 'block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500';

// ── Skeleton components ───────────────────────────────────────────────────────

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-20 -none bg-white/[0.025]" />
    ))}
  </div>
);

const RequestCardSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-24 -none bg-white/[0.025]" />
    ))}
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-12 -none bg-white/[0.025]" />
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
    { label: 'Pending', value: pendingRequests, icon: Clock, tone: 'text-amber-300' },
    { label: 'Completed Today', value: completedToday, icon: CheckCircle, tone: 'text-white' },
    { label: 'Export Requests', value: exportRequests, icon: Download, tone: 'text-white' },
    { label: 'Deletion Requests', value: deletionRequests, icon: XCircle, tone: 'text-red-300' },
    { label: 'Avg. Processing', value: `${avgProcessingDays}d`, icon: Database, tone: 'text-zinc-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-zinc-500" />
              <span className={LABEL_CLASS}>{item.label}</span>
            </div>
            <span className={`mt-2 block text-2xl font-black tabular-nums ${item.tone}`}>{item.value}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'border-amber-500/30 text-amber-300' },
    processing: { label: 'Processing', className: 'border-white/15 text-zinc-300' },
    completed: { label: 'Completed', className: 'border-white/40 text-white' },
    failed: { label: 'Failed', className: 'border-red-500/30 text-red-300' },
    rejected: { label: 'Rejected', className: 'border-rose-500/30 text-rose-300' },
  };
  const cfg = map[status.toLowerCase()] ?? { label: status, className: 'border-white/15 text-zinc-400' };
  return (
    <span className={`inline-flex shrink-0 items-center border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider capitalize ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  if (type.toLowerCase() === 'export') {
    return <span className="inline-flex shrink-0 items-center border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300">Export</span>;
  }
  return <span className="inline-flex shrink-0 items-center border border-rose-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300">Deletion</span>;
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
      <DialogContent className="max-w-md -none border-white/10 bg-[#0a0a0c] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold text-white">
            {action === 'approve' ? (
              <CheckCircle className="h-4 w-4 text-zinc-300" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" />
            )}
            {action === 'approve' ? 'Approve' : 'Reject'} GDPR Request
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 border border-white/10 bg-white/[0.025] p-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-white/10 text-xs text-white">
                {request?.username?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{request?.username ?? 'Unknown'}</p>
              <p className="truncate text-xs text-zinc-400">{request?.email ?? '—'}</p>
            </div>
            <div className="ml-auto shrink-0">
              {request && <TypeBadge type={request.requestType} />}
            </div>
          </div>

          {/* Deletion warning */}
          {action === 'approve' && isDeletion && (
            <div className="flex gap-3 -none border border-red-500/20 bg-red-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              <p className="text-sm leading-relaxed text-red-300">
                <strong className="text-red-300">Irreversible action.</strong> This will permanently anonymize
                the user's data. This action cannot be undone.
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="gdpr-notes" className={LABEL_CLASS}>
              Notes {action === 'reject' ? <span className="text-rose-400">*</span> : <span className="font-mono normal-case tracking-normal">(optional)</span>}
            </label>
            <Textarea
              id="gdpr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={action === 'reject' ? 'Reason for rejection (required)…' : 'Additional notes…'}
              className="h-24 resize-none -none border-white/10 bg-black/40 text-white placeholder:text-zinc-600 focus:border-rose-500 focus-visible:ring-rose-500/20"
            />
            {action === 'reject' && !notes.trim() && (
              <p className="text-xs text-rose-400">A reason is required when rejecting a request.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <CommandButton
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </CommandButton>
            <CommandButton
              variant={action === 'approve' ? 'primary' : 'danger'}
              size="sm"
              className="flex-1"
              onClick={handleSubmit}
              disabled={isPending || (action === 'reject' && !notes.trim())}
            >
              {isPending ? 'Processing…' : action === 'approve' ? 'Approve' : 'Reject'}
            </CommandButton>
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
    <article className="border border-white/10 bg-[#0a0a0c]/92 p-4 transition-colors hover:border-white/25">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-white/10 text-sm text-white">
            {request.username?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {request.username ?? 'Unknown User'}
            </span>
            <TypeBadge type={request.requestType} />
            <StatusBadge status={request.status} />
          </div>
          <p className="mb-1 truncate text-xs text-zinc-400">{request.email ?? '—'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-xs tabular-nums text-zinc-500">
            <span>Requested: {new Date(request.requestedAt).toLocaleDateString()}</span>
            {request.processedAt && (
              <span>Processed: {new Date(request.processedAt).toLocaleDateString()}</span>
            )}
            {request.processedByUsername && (
              <span>By: {request.processedByUsername}</span>
            )}
          </div>
          {request.notes && (
            <p className="mt-1.5 line-clamp-2 text-xs italic text-zinc-400">"{request.notes}"</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-2">
          {hasDownload && (
            <div className="space-y-1">
              <CommandButton variant="secondary" size="sm" asChild>
                <a href={request.downloadUrl!} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </CommandButton>
              {request.expiresAt && (
                <p className="text-center font-mono text-[10px] tabular-nums text-zinc-500">
                  Expires {new Date(request.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          {isPending && (
            <div className="flex gap-1.5">
              <CommandButton size="sm" onClick={() => onAction(request, 'approve')}>
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </CommandButton>
              <CommandButton variant="danger" size="sm" onClick={() => onAction(request, 'reject')}>
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </CommandButton>
            </div>
          )}
        </div>
      </div>
    </article>
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
      <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <CommandIconButton
          label="Previous page"
          variant="ghost"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft />
        </CommandIconButton>
        <CommandIconButton
          label="Next page"
          variant="ghost"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight />
        </CommandIconButton>
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
      <CommandSection className="flex flex-wrap gap-3">
        <Select value={statusFilter || '__all__'} onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44 -none border-white/10 bg-black/40 text-zinc-300 focus:border-rose-500">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-white">
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter || '__all__'} onValueChange={(v) => { setTypeFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44 -none border-white/10 bg-black/40 text-zinc-300 focus:border-rose-500">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-white">
            <SelectItem value="__all__">All Types</SelectItem>
            <SelectItem value="export">Export</SelectItem>
            <SelectItem value="deletion">Deletion</SelectItem>
          </SelectContent>
        </Select>
      </CommandSection>

      {/* Request list */}
      {isLoading ? (
        <RequestCardSkeleton />
      ) : isError ? (
        <CommandSection className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertTriangle className="h-8 w-8 text-red-300" />
          <p className="text-zinc-400">Failed to load GDPR requests.</p>
          <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
            Try again
          </CommandButton>
        </CommandSection>
      ) : !data?.requests?.length ? (
        <CommandEmptyState
          title="No requests found"
          description="No GDPR requests match the current filters."
          icon={<FileText className="h-5 w-5" />}
        />
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
      <CommandSection className="flex flex-wrap gap-3">
        <Select value={typeFilter || '__all__'} onValueChange={(v) => { setTypeFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-52 -none border-white/10 bg-black/40 text-zinc-300 focus:border-rose-500">
            <SelectValue placeholder="All Consent Types" />
          </SelectTrigger>
          <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-white">
            <SelectItem value="__all__">All Types</SelectItem>
            {CONSENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{formatConsentType(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={grantedFilter || '__all__'} onValueChange={(v) => { setGrantedFilter(v === '__all__' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40 -none border-white/10 bg-black/40 text-zinc-300 focus:border-rose-500">
            <SelectValue placeholder="All Consents" />
          </SelectTrigger>
          <SelectContent className="-none border-white/10 bg-[#0a0a0c] text-white">
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="true">Granted</SelectItem>
            <SelectItem value="false">Denied</SelectItem>
          </SelectContent>
        </Select>
      </CommandSection>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <CommandSection className="flex flex-col items-center justify-center gap-4 py-16">
          <AlertTriangle className="h-8 w-8 text-red-300" />
          <p className="text-zinc-400">Failed to load consent records.</p>
          <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
            Try again
          </CommandButton>
        </CommandSection>
      ) : !data?.records?.length ? (
        <CommandEmptyState
          title="No consent records"
          description="No records match the current filters."
          icon={<Shield className="h-5 w-5" />}
        />
      ) : (
        <CommandSection className="overflow-hidden p-0">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_90px_120px_120px_80px] gap-4 border-b border-white/10 bg-black/40 px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <span>User</span>
            <span>Consent Type</span>
            <span>Status</span>
            <span>IP Address</span>
            <span>Date</span>
            <span>Version</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {data.records.map((record: ConsentRecord) => (
              <div
                key={record.id}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-white/[0.02] md:grid md:grid-cols-[1fr_1fr_90px_120px_120px_80px] md:items-center md:gap-4"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="bg-white/10 text-[10px] text-white">
                      {record.username?.[0]?.toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm text-white">{record.username ?? <span className="text-zinc-500">Unknown</span>}</span>
                </div>
                <span className="text-sm text-zinc-300">{formatConsentType(record.consentType)}</span>
                <div>
                  {record.granted ? (
                    <span className="inline-flex items-center border border-white/25 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-200">Granted</span>
                  ) : (
                    <span className="inline-flex items-center border border-red-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-300">Denied</span>
                  )}
                </div>
                <span className="font-mono text-xs tabular-nums text-zinc-400">{record.ipAddress ?? '—'}</span>
                <span className="font-mono text-xs tabular-nums text-zinc-400">{new Date(record.recordedAt).toLocaleDateString()}</span>
                <span className="font-mono text-xs tabular-nums text-zinc-500">{record.version}</span>
              </div>
            ))}
          </div>
        </CommandSection>
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
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <AdminPage
      eyebrow="Security"
      title="GDPR Compliance"
      description="Manage data requests and consent records"
    >
      <div className="space-y-6">
        <CommandTabs
          tabs={[
            { value: 'requests', label: 'Data Requests' },
            { value: 'consent', label: 'Consent Records' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'requests' ? <DataRequestsTab /> : <ConsentRecordsTab />}
      </div>
    </AdminPage>
  );
};

export default GdprCompliance;
