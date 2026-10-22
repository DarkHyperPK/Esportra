import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Eye, DollarSign, AlertTriangle, ChevronLeft, ChevronRight, Upload, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { CommandButton } from '@/components/management/CommandSurface';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import type { DashboardParticipant } from '@/hooks/useTournamentDashboard';

interface PaymentManagementProps {
  tournamentId: string;
  participants: DashboardParticipant[];
  currency: string;
  onRefresh: () => void;
}

type PaymentFilter = 'all' | 'pending' | 'approved' | 'rejected';
const PAYMENT_PAGE_SIZE = 20;

const imgFetchPriority = { fetchpriority: 'low' } as const;

const PaymentManagement: React.FC<PaymentManagementProps> = ({ tournamentId, participants, currency, onRefresh }) => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<PaymentFilter>('pending');
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<DashboardParticipant | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [withdrawalProcessing, setWithdrawalProcessing] = useState<Set<string>>(new Set());
  const [proofFiles, setProofFiles] = useState<Map<string, File>>(new Map());
  const [refundNotes, setRefundNotes] = useState<Map<string, string>>(new Map());
  const [denyTarget, setDenyTarget] = useState<DashboardParticipant | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const proofInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptParticipant, setReceiptParticipant] = useState<DashboardParticipant | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const receiptBlobUrlRef = React.useRef<string | null>(null);
  const receiptCacheRef = React.useRef<Map<string, string>>(new Map());

  const paidParticipants = useMemo(
    () => participants.filter(p => p.payment_status && p.payment_status !== 'not_required' && p.status !== 'withdrawal_pending'),
    [participants]
  );

  const withdrawalParticipants = useMemo(
    () => participants.filter(p => p.status === 'withdrawal_pending'),
    [participants]
  );

  const handleProcessRefund = async (participant: DashboardParticipant) => {
    const file = proofFiles.get(participant.id);
    if (!file) {
      toast({ title: 'Upload refund proof first', variant: 'destructive' });
      return;
    }
    setWithdrawalProcessing(prev => new Set(prev).add(participant.id));
    try {
      const fd = new FormData();
      fd.append('proof', file);
      const notes = refundNotes.get(participant.id) || '';
      if (notes) fd.append('notes', notes);
      await apiClient.upload(`/api/tournaments/${tournamentId}/participants/${participant.id}/process-refund`, fd);
      toast({ title: 'Refund Processed', description: `${participant.team_name || participant.gamer_tag || 'Participant'} registration cancelled and proof recorded.` });
      setProofFiles(prev => { const m = new Map(prev); m.delete(participant.id); return m; });
      setRefundNotes(prev => { const m = new Map(prev); m.delete(participant.id); return m; });
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Failed to process refund', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setWithdrawalProcessing(prev => { const s = new Set(prev); s.delete(participant.id); return s; });
    }
  };

  const handleDenyWithdrawal = async () => {
    if (!denyTarget) return;
    setWithdrawalProcessing(prev => new Set(prev).add(denyTarget.id));
    try {
      await apiClient.post(`/api/tournaments/${tournamentId}/participants/${denyTarget.id}/deny-withdrawal`, { reason: denyReason || undefined });
      toast({ title: 'Withdrawal Denied', description: `${denyTarget.team_name || denyTarget.gamer_tag || 'Participant'} restored to approved.` });
      setDenyTarget(null);
      setDenyReason('');
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Failed to deny withdrawal', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setWithdrawalProcessing(prev => { const s = new Set(prev); s.delete(denyTarget.id); return s; });
    }
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return paidParticipants;
    return paidParticipants.filter(p => p.payment_status === filter);
  }, [paidParticipants, filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAYMENT_PAGE_SIZE));
  const pagedParticipants = useMemo(() => {
    const start = (page - 1) * PAYMENT_PAGE_SIZE;
    return filtered.slice(start, start + PAYMENT_PAGE_SIZE);
  }, [filtered, page]);
  const rangeStart = filtered.length === 0 ? 0 : ((page - 1) * PAYMENT_PAGE_SIZE) + 1;
  const rangeEnd = Math.min(page * PAYMENT_PAGE_SIZE, filtered.length);

  const counts = useMemo(() => ({
    pending:  paidParticipants.filter(p => p.payment_status === 'pending').length,
    approved: paidParticipants.filter(p => p.payment_status === 'approved').length,
    rejected: paidParticipants.filter(p => p.payment_status === 'rejected').length,
  }), [paidParticipants]);

  const pendingWithReceipts = useMemo(
    () => paidParticipants.filter(p => p.payment_status === 'pending' && p.payment_receipt_url),
    [paidParticipants]
  );

  const openReceipt = async (participant: DashboardParticipant) => {
    if (!participant.payment_receipt_url) {
      toast({ title: 'No receipt available', variant: 'destructive' });
      return;
    }
    const cached = receiptCacheRef.current.get(participant.id);
    if (cached) {
      setReceiptParticipant(participant);
      setReceiptUrl(cached);
      receiptBlobUrlRef.current = cached;
      return;
    }
    setReceiptLoadingId(participant.id);
    setReceiptParticipant(participant);
    setReceiptLoading(true);
    setReceiptUrl(null);
    try {
      const blob = await apiClient.getBlob(
        `/api/tournaments/${tournamentId}/participants/${participant.id}/receipt`
      );
      const url = URL.createObjectURL(blob);
      receiptCacheRef.current.set(participant.id, url);
      receiptBlobUrlRef.current = url;
      setReceiptUrl(url);
    } catch {
      toast({ title: 'Could not load receipt', variant: 'destructive' });
      setReceiptParticipant(null);
    } finally {
      setReceiptLoading(false);
      setReceiptLoadingId(null);
    }
  };

  const closeReceipt = () => {
    receiptBlobUrlRef.current = null;
    setReceiptUrl(null);
    setReceiptParticipant(null);
    setReceiptLoading(false);
  };

  const navigateReceipt = (direction: -1 | 1) => {
    if (!receiptParticipant) return;
    const idx = pendingWithReceipts.findIndex(p => p.id === receiptParticipant.id);
    if (idx === -1) return;
    const next = pendingWithReceipts[idx + direction];
    if (next) openReceipt(next);
  };

  const handleApproveFromDialog = async () => {
    if (!receiptParticipant) return;
    setProcessingId(receiptParticipant.id);
    try {
      await apiClient.post(`/api/tournaments/${tournamentId}/participants/${receiptParticipant.id}/approve-payment`);
      toast({ title: 'Payment Approved', description: `${receiptParticipant.team_name || receiptParticipant.gamer_tag || 'Participant'} registered.` });
      const idx = pendingWithReceipts.findIndex(p => p.id === receiptParticipant.id);
      const next = pendingWithReceipts[idx + 1] ?? pendingWithReceipts[idx - 1];
      onRefresh();
      if (next && next.id !== receiptParticipant.id) {
        openReceipt(next);
      } else {
        closeReceipt();
      }
    } catch (err: any) {
      toast({ title: 'Approval Failed', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectFromDialog = () => {
    if (!receiptParticipant) return;
    setRejectTarget(receiptParticipant);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleApprove = async (participant: DashboardParticipant) => {
    setProcessingId(participant.id);
    try {
      await apiClient.post(`/api/tournaments/${tournamentId}/participants/${participant.id}/approve-payment`);
      toast({ title: 'Payment Approved', description: `${participant.team_name || participant.gamer_tag || 'Participant'} is now registered.` });
      onRefresh();
    } catch (err: any) {
      toast({ title: 'Approval Failed', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectDialog = (participant: DashboardParticipant) => {
    setRejectTarget(participant);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    try {
      await apiClient.post(`/api/tournaments/${tournamentId}/participants/${rejectTarget.id}/reject-payment`, { reason: rejectReason || 'Payment not verified.' });
      toast({ title: 'Payment Rejected', description: `${rejectTarget.team_name || rejectTarget.gamer_tag || 'Participant'} has been notified.` });
      setRejectDialogOpen(false);
      const wasFromReceiptDialog = receiptParticipant?.id === rejectTarget.id;
      setRejectTarget(null);
      onRefresh();
      if (wasFromReceiptDialog) {
        const idx = pendingWithReceipts.findIndex(p => p.id === receiptParticipant?.id);
        const next = pendingWithReceipts[idx + 1] ?? pendingWithReceipts[idx - 1];
        if (next && next.id !== receiptParticipant?.id) {
          openReceipt(next);
        } else {
          closeReceipt();
        }
      }
    } catch (err: any) {
      toast({ title: 'Rejection Failed', description: err.message || 'Try again.', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadge = (status: string | null | undefined) => {
    switch (status) {
      case 'pending':  return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge className="bg-green-500/20 text-green-300 border-green-500/40"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-500/20 text-red-300 border-red-500/40"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return null;
    }
  };

  React.useEffect(() => {
    setPage(1);
  }, [filter, filtered.length]);

  React.useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const receiptIdx = receiptParticipant ? pendingWithReceipts.findIndex(p => p.id === receiptParticipant.id) : -1;
  const hasPrev = receiptIdx > 0;
  const hasNext = receiptIdx >= 0 && receiptIdx < pendingWithReceipts.length - 1;

  if (paidParticipants.length === 0 && withdrawalParticipants.length === 0) {
    return (
      <div className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden p-6 mb-6">
        <div className="flex flex-col items-center gap-2 py-8">
          <DollarSign className="w-8 h-8 text-zinc-600" />
          <p className="text-zinc-500 text-sm">No paid registrations yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden p-6 sm:p-8 mb-6">
        <div className="p-0 border-b border-white/5 pb-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
              <DollarSign className="w-5 h-5 text-rose-500" />
              Payment Review
              {counts.pending > 0 && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 ml-2">{counts.pending} pending</Badge>
              )}
            </p>
            <div className="flex gap-2 flex-wrap">
              {(['pending', 'approved', 'rejected', 'all'] as PaymentFilter[]).map(f => (
                <CommandButton
                  key={f}
                  variant={filter === f ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className={filter === f ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'border-zinc-700 text-zinc-400 hover:text-white'}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && <span className="ml-1 text-xs opacity-70">({counts[f]})</span>}
                </CommandButton>
              ))}
            </div>
          </div>
        </div>
        <div className="p-0">
          {filtered.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-6">No {filter} payments.</p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {pagedParticipants.map(p => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 bg-zinc-900/50 border border-white/5 rounded-xl p-4"
                  >
                    {/* Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {p.team_logo ? (
                          <img
                            src={p.team_logo}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            {...imgFetchPriority}
                            className="w-10 h-10 rounded-lg object-cover border border-white/10"
                          />
                        ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold">
                          {(p.team_name || p.gamer_tag || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{p.team_name || p.gamer_tag || p.user?.username || 'Unknown'}</p>
                        <p className="text-zinc-500 text-xs">
                          {p.entry_fee_amount ? formatCurrency(p.entry_fee_amount, currency) : 'Paid'} · {new Date(p.registered_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {statusBadge(p.payment_status)}
                    </div>

                    {/* Receipt + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.payment_receipt_url && (
                        <CommandButton
                          variant="ghost"
                          size="sm"
                          onClick={() => openReceipt(p)}
                          disabled={receiptLoadingId === p.id}
                          className="gap-1"
                        >
                          {receiptLoadingId === p.id
                            ? <Clock className="w-3.5 h-3.5 animate-pulse" />
                            : <Eye className="w-3.5 h-3.5" />}
                          Receipt
                        </CommandButton>
                      )}
                      {!p.payment_receipt_url && p.payment_status === 'pending' && (
                        <span className="text-xs text-amber-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No receipt</span>
                      )}
                      {p.payment_status === 'pending' && (
                        <>
                          <CommandButton variant="success" size="sm" onClick={() => handleApprove(p)} disabled={processingId === p.id} className="gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </CommandButton>
                          <CommandButton
                            variant="ghost"
                            size="sm"
                            onClick={() => openRejectDialog(p)}
                            disabled={processingId === p.id}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10 gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </CommandButton>
                        </>
                      )}
                      {p.payment_status === 'rejected' && p.payment_rejection_reason && (
                        <span className="text-xs text-red-400 max-w-[200px] truncate" title={p.payment_rejection_reason}>
                          Reason: {p.payment_rejection_reason}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
          {filtered.length > 0 && totalPages > 1 && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-500">
                Showing {rangeStart}-{rangeEnd} of {filtered.length}
              </p>
              <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#payments"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page > 1) {
                          setPage((current) => current - 1);
                        }
                      }}
                      className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#payments"
                      isActive
                      onClick={(event) => event.preventDefault()}
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                    >
                      {page} / {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#payments"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page < totalPages) {
                          setPage((current) => current + 1);
                        }
                      }}
                      className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Review Dialog — inline preview + approve/reject */}
      <Dialog open={!!(receiptUrl || receiptLoading)} onOpenChange={(open) => { if (!open) closeReceipt(); }}>
        <DialogContent className="max-w-2xl bg-[#0a0a0c] border border-white/10">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">
                {receiptParticipant?.team_name || receiptParticipant?.gamer_tag || 'Receipt'}
                {receiptParticipant?.entry_fee_amount
                  ? ` · ${formatCurrency(receiptParticipant.entry_fee_amount, currency)}`
                  : ''}
              </DialogTitle>
              {receiptIdx >= 0 && (
                <span className="text-xs text-zinc-500 mr-8">{receiptIdx + 1} / {pendingWithReceipts.length}</span>
              )}
            </div>
          </DialogHeader>

          <div className="relative flex items-center justify-center max-h-[60vh] min-h-[200px] overflow-auto">
            {receiptLoading && (
              <div className="flex items-center justify-center py-16">
                <Clock className="w-8 h-8 text-zinc-400 animate-pulse" />
              </div>
            )}
            {receiptUrl && (
              <img
                src={receiptUrl}
                alt="Payment Receipt"
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
                onError={() => {
                  toast({ title: 'Could not display receipt image', variant: 'destructive' });
                }}
              />
            )}
          </div>

          {receiptParticipant?.payment_status === 'pending' && (
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <CommandButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateReceipt(-1)}
                  disabled={!hasPrev || receiptLoading}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </CommandButton>
                <CommandButton
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateReceipt(1)}
                  disabled={!hasNext || receiptLoading}
                  className="gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </CommandButton>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                <CommandButton
                  variant="ghost"
                  size="sm"
                  onClick={handleRejectFromDialog}
                  disabled={processingId === receiptParticipant.id}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </CommandButton>
                <CommandButton
                  variant="success"
                  size="sm"
                  onClick={handleApproveFromDialog}
                  disabled={processingId === receiptParticipant.id}
                  className="gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </CommandButton>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-[#0a0a0c] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Payment</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 text-sm">
            Rejecting payment for <span className="text-white font-semibold">{rejectTarget?.team_name || rejectTarget?.gamer_tag || 'this participant'}</span>.
            They will be notified and can re-upload a receipt.
          </p>
          <Textarea
            placeholder="Reason for rejection (optional)..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white"
            rows={3}
          />
          <DialogFooter>
            <CommandButton variant="ghost" type="button" onClick={() => setRejectDialogOpen(false)}>Cancel</CommandButton>
            <CommandButton variant="danger" onClick={handleReject} disabled={processingId === rejectTarget?.id}>
              Reject Payment
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Withdrawal Dialog */}
      <Dialog open={!!denyTarget} onOpenChange={(open) => { if (!open) { setDenyTarget(null); setDenyReason(''); } }}>
        <DialogContent className="bg-[#0a0a0c] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Deny Withdrawal Request</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 text-sm">
            <span className="text-white font-semibold">{denyTarget?.team_name || denyTarget?.gamer_tag || 'This participant'}</span> will be restored to approved status and remain in the tournament.
          </p>
          <Textarea
            placeholder="Reason for denial (optional)..."
            value={denyReason}
            onChange={e => setDenyReason(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white"
            rows={2}
          />
          <DialogFooter>
            <CommandButton variant="ghost" type="button" onClick={() => { setDenyTarget(null); setDenyReason(''); }}>Cancel</CommandButton>
            <CommandButton variant="primary" onClick={handleDenyWithdrawal} disabled={withdrawalProcessing.has(denyTarget?.id ?? '')}>
              Deny Request
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Queue */}
      {withdrawalParticipants.length > 0 && (
        <div className="relative bg-black/20 backdrop-blur-md border border-amber-500/20 rounded-lg overflow-hidden p-6 sm:p-8 mb-6">
          <div className="border-b border-white/5 pb-4 mb-6">
            <p className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              Withdrawal Requests
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 ml-2">{withdrawalParticipants.length}</Badge>
            </p>
            <p className="text-xs text-zinc-500 mt-1">Upload refund proof and process each withdrawal, or deny to keep the participant registered.</p>
          </div>

          <div className="space-y-4">
            {withdrawalParticipants.map(p => {
              const proofFile = proofFiles.get(p.id);
              const notes = refundNotes.get(p.id) ?? '';
              const isProcessing = withdrawalProcessing.has(p.id);
              return (
                <div key={p.id} className="bg-zinc-900/50 border border-amber-500/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {p.team_logo ? (
                      <img src={p.team_logo} alt="" loading="lazy" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold">
                        {(p.team_name || p.gamer_tag || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{p.team_name || p.gamer_tag || p.user?.username || 'Unknown'}</p>
                      <p className="text-zinc-500 text-xs">
                        {p.entry_fee_amount ? formatCurrency(p.entry_fee_amount, currency) : 'Paid'} · Requested {p.withdrawal_requested_at ? new Date(p.withdrawal_requested_at).toLocaleDateString() : 'recently'}
                      </p>
                    </div>
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">Pending Refund</Badge>
                  </div>

                  {p.withdrawal_reason && (
                    <p className="text-xs text-zinc-400 bg-zinc-800/50 rounded p-2">
                      <span className="text-zinc-500">Reason: </span>{p.withdrawal_reason}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <input
                        ref={el => { if (el) proofInputRefs.current.set(p.id, el); }}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) setProofFiles(prev => new Map(prev).set(p.id, f));
                        }}
                      />
                      <CommandButton
                        variant="secondary"
                        size="sm"
                        onClick={() => proofInputRefs.current.get(p.id)?.click()}
                        className="w-full gap-1.5 justify-start"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {proofFile ? proofFile.name : 'Upload Refund Proof'}
                      </CommandButton>
                    </div>
                    <div className="flex gap-2">
                      <CommandButton
                        variant="success"
                        size="sm"
                        onClick={() => handleProcessRefund(p)}
                        disabled={isProcessing || !proofFile}
                        className="gap-1"
                      >
                        {isProcessing ? <Clock className="w-3.5 h-3.5 animate-pulse" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Process Refund
                      </CommandButton>
                      <CommandButton
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDenyTarget(p); setDenyReason(''); }}
                        disabled={isProcessing}
                        className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Deny
                      </CommandButton>
                    </div>
                  </div>

                  <Textarea
                    placeholder="Refund notes (optional — recorded with proof)..."
                    value={notes}
                    onChange={e => setRefundNotes(prev => new Map(prev).set(p.id, e.target.value))}
                    className="bg-zinc-900 border-zinc-700 text-white text-xs resize-none"
                    rows={2}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentManagement;
