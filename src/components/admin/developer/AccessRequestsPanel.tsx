import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Eye, Loader2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CommandButton,
  CommandEmptyState,
  CommandPanel,
  CommandSegmentedButton,
} from '@/components/management/CommandSurface';
import {
  type AdminAccessRequest,
  useAdminAccessRequests,
  useAdminApproveAccessRequest,
  useAdminRejectAccessRequest,
} from '@/hooks/useDeveloperApi';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

function StatusBadge({ status }: { status: AdminAccessRequest['status'] }) {
  const cls =
    status === 'pending'
      ? 'border-amber-500/35 bg-amber-950/20 text-amber-300'
      : status === 'approved'
        ? 'border-emerald-500/35 bg-emerald-950/20 text-emerald-300'
        : 'border-red-500/35 bg-red-950/20 text-red-300';
  return (
    <span className={`inline-flex items-center border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

interface RejectDialogProps {
  request: AdminAccessRequest;
  onOpenChange: (open: boolean) => void;
}

function RejectDialog({ request, onOpenChange }: RejectDialogProps) {
  const [reason, setReason] = useState('');
  const rejectMutation = useAdminRejectAccessRequest();
  const canSubmit = reason.trim().length >= 10 && !rejectMutation.isPending;

  const handleReject = () => {
    rejectMutation.mutate(
      { requestId: request.id, adminNotes: reason.trim() },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Reject Access Request</DialogTitle>
          <DialogDescription>
            Provide a reason for rejection. This will be shown to the applicant.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">
            Organization: <strong className="text-white">{request.organization_name}</strong>
          </p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this request is being rejected (min 10 characters)..."
            className="min-h-[100px] rounded-none border-white/10 bg-[#0a0a0c] text-white placeholder:text-zinc-600 focus:border-rose-500"
          />
          {reason.trim().length > 0 && reason.trim().length < 10 && (
            <p className="text-xs text-rose-400">Minimum 10 characters required.</p>
          )}
        </div>
        <DialogFooter>
          <CommandButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </CommandButton>
          <CommandButton variant="danger" onClick={handleReject} disabled={!canSubmit}>
            {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reject
          </CommandButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DetailDialogProps {
  request: AdminAccessRequest;
  onOpenChange: (open: boolean) => void;
}

function DetailDialog({ request, onOpenChange }: DetailDialogProps) {
  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Access Request Detail</DialogTitle>
          <DialogDescription>{request.organization_name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Intended Use
            </p>
            <p className="mt-1 text-sm text-zinc-200 whitespace-pre-wrap">{request.intended_use}</p>
          </div>
          {request.admin_notes && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                Admin Notes
              </p>
              <p className="mt-1 text-sm text-zinc-400">{request.admin_notes}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <CommandButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </CommandButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AccessRequestsPanel() {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [rejectingRequest, setRejectingRequest] = useState<AdminAccessRequest | null>(null);
  const [viewingRequest, setViewingRequest] = useState<AdminAccessRequest | null>(null);
  const approveMutation = useAdminApproveAccessRequest();

  const { data, isLoading } = useAdminAccessRequests();
  const allRequests = data?.items ?? [];

  const counts = {
    all: allRequests.length,
    pending: allRequests.filter((r) => r.status === 'pending').length,
    approved: allRequests.filter((r) => r.status === 'approved').length,
    rejected: allRequests.filter((r) => r.status === 'rejected').length,
  };

  const filtered =
    filter === 'all' ? allRequests : allRequests.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((f) => (
          <CommandSegmentedButton
            key={f}
            active={filter === f}
            onClick={() => setFilter(f)}
          >
            {f} ({counts[f]})
          </CommandSegmentedButton>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-10 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
          Loading requests…
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <CommandEmptyState
          title="No requests"
          description={filter === 'pending' ? 'No pending access requests.' : 'Nothing here.'}
        />
      )}

      <div className="space-y-3">
        {filtered.map((req) => (
          <CommandPanel key={req.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-white">{req.organization_name}</p>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-xs text-zinc-500">
                  {req.requester_name} · {req.requester_email}
                </p>
                <p className="text-xs text-zinc-500">
                  Submitted{' '}
                  {formatDistanceToNow(new Date(req.submitted_at), { addSuffix: true })}
                </p>
                <p className="max-w-xl truncate text-sm text-zinc-400">
                  {req.intended_use}
                  {req.intended_use.length > 80 && (
                    <button
                      type="button"
                      onClick={() => setViewingRequest(req)}
                      className="ml-2 font-mono text-[10px] text-rose-400 hover:text-rose-300"
                    >
                      View full
                    </button>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <CommandButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setViewingRequest(req)}
                  aria-label="View full request"
                >
                  <Eye className="h-4 w-4" />
                </CommandButton>
                {req.status === 'pending' && (
                  <>
                    <CommandButton
                      size="sm"
                      variant="success"
                      onClick={() => approveMutation.mutate(req.id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approve
                    </CommandButton>
                    <CommandButton
                      size="sm"
                      variant="danger"
                      onClick={() => setRejectingRequest(req)}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </CommandButton>
                  </>
                )}
              </div>
            </div>
          </CommandPanel>
        ))}
      </div>

      {rejectingRequest && (
        <RejectDialog
          request={rejectingRequest}
          onOpenChange={(open) => { if (!open) setRejectingRequest(null); }}
        />
      )}
      {viewingRequest && (
        <DetailDialog
          request={viewingRequest}
          onOpenChange={(open) => { if (!open) setViewingRequest(null); }}
        />
      )}
    </div>
  );
}
