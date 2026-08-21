import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Eye, DollarSign, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { CancelButton, DangerButton, OutlineButton, SuccessButton } from '@/components/ui/app-buttons';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { resolvePaymentReceiptUrl } from '@/lib/storage';
import type { DashboardParticipant } from '@/hooks/useTournamentDashboard';

interface PaymentManagementProps {
  tournamentId: string;
  participants: DashboardParticipant[];
  onRefresh: () => void;
}

type PaymentFilter = 'all' | 'pending' | 'approved' | 'rejected';
const PAYMENT_PAGE_SIZE = 20;

const PaymentManagement: React.FC<PaymentManagementProps> = ({ tournamentId, participants, onRefresh }) => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<PaymentFilter>('pending');
  const [page, setPage] = useState(1);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<DashboardParticipant | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [receiptViewUrl, setReceiptViewUrl] = useState<string | null>(null);
  const [receiptMimeType, setReceiptMimeType] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptParticipant, setReceiptParticipant] = useState<DashboardParticipant | null>(null);
  const receiptBlobUrlRef = React.useRef<string | null>(null);
  const receiptFallbackAttemptedRef = React.useRef(false);

  const closeReceiptDialog = () => {
    if (receiptBlobUrlRef.current) {
      URL.revokeObjectURL(receiptBlobUrlRef.current);
      receiptBlobUrlRef.current = null;
    }
    setReceiptViewUrl(null);
    setReceiptMimeType(null);
    setReceiptLoading(false);
    setReceiptParticipant(null);
    receiptFallbackAttemptedRef.current = false;
  };

  const loadReceiptViaApi = async (participant: DashboardParticipant) => {
    try {
      const blob = await apiClient.getBlob(`/api/tournaments/${tournamentId}/participants/${participant.id}/receipt`);
      if (receiptBlobUrlRef.current) {
        URL.revokeObjectURL(receiptBlobUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(blob);
      receiptBlobUrlRef.current = objectUrl;
      setReceiptMimeType(blob.type || null);
      setReceiptViewUrl(objectUrl);
    } catch {
      toast({ title: 'Could not load receipt', variant: 'destructive' });
    } finally {
      setReceiptLoading(false);
    }
  };

  const paidParticipants = useMemo(
    () => participants.filter(p => p.payment_status && p.payment_status !== 'not_required'),
    [participants]
  );

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
      setRejectTarget(null);
      onRefresh();
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

  const viewReceipt = (participant: DashboardParticipant) => {
    const url = resolvePaymentReceiptUrl(participant.payment_receipt_url);
    if (!url) {
      toast({ title: 'No receipt available', variant: 'destructive' });
      return;
    }
    if (receiptBlobUrlRef.current) {
      URL.revokeObjectURL(receiptBlobUrlRef.current);
      receiptBlobUrlRef.current = null;
    }
    receiptFallbackAttemptedRef.current = false;
    setReceiptParticipant(participant);
    setReceiptMimeType(url.toLowerCase().includes('.pdf') ? 'application/pdf' : null);
    setReceiptLoading(true);
    setReceiptViewUrl(url);
  };

  const handleReceiptLoadError = () => {
    if (receiptFallbackAttemptedRef.current || !receiptParticipant) {
      setReceiptLoading(false);
      toast({ title: 'Could not load receipt', variant: 'destructive' });
      return;
    }
    receiptFallbackAttemptedRef.current = true;
    void loadReceiptViaApi(receiptParticipant);
  };

  React.useEffect(() => {
    setPage(1);
  }, [filter, filtered.length]);

  React.useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  if (paidParticipants.length === 0) {
    return (
      <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 mb-6">
        <CardContent className="p-0 flex flex-col items-center gap-2 py-8">
          <DollarSign className="w-8 h-8 text-zinc-600" />
          <p className="text-zinc-500 text-sm">No paid registrations yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6">
        <CardHeader className="p-0 border-b border-white/5 pb-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2 tracking-wide">
              <DollarSign className="w-5 h-5 text-rose-500" />
              Payment Review
              {counts.pending > 0 && (
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 ml-2">{counts.pending} pending</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {(['pending', 'approved', 'rejected', 'all'] as PaymentFilter[]).map(f => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    buttonVariants({ variant: filter === f ? 'default' : 'outline', size: 'sm' }),
                    filter === f ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'border-zinc-700 text-zinc-400 hover:text-white',
                  )}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && <span className="ml-1 text-xs opacity-70">({counts[f]})</span>}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
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
                            fetchpriority="low"
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
                          {p.entry_fee_amount ? formatCurrency(p.entry_fee_amount, p.currency || 'USD') : 'Paid'} · {new Date(p.registered_at).toLocaleDateString()}
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
                        <OutlineButton type="button" size="sm" onClick={() => viewReceipt(p)} className="gap-1">
                          <Eye className="w-3.5 h-3.5" /> Receipt
                        </OutlineButton>
                      )}
                      {!p.payment_receipt_url && p.payment_status === 'pending' && (
                        <span className="text-xs text-amber-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No receipt</span>
                      )}
                      {p.payment_status === 'pending' && (
                        <>
                          <SuccessButton size="sm" onClick={() => handleApprove(p)} disabled={processingId === p.id} className="gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </SuccessButton>
                          <button
                            type="button"
                            onClick={() => openRejectDialog(p)}
                            disabled={processingId === p.id}
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-red-500/50 text-red-400 hover:bg-red-500/10 gap-1')}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
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
        </CardContent>
      </Card>

      {/* Receipt Viewer Dialog */}
      <Dialog open={!!receiptViewUrl} onOpenChange={(open) => { if (!open) closeReceiptDialog(); }}>
        <DialogContent className="max-w-2xl bg-[#0a0a0c] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Payment Receipt</DialogTitle>
          </DialogHeader>
          {receiptViewUrl && (
            <div className="relative flex items-center justify-center max-h-[70vh] overflow-auto min-h-[200px]">
              {receiptLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Clock className="w-8 h-8 text-zinc-400 animate-pulse" />
                </div>
              )}
              {receiptMimeType === 'application/pdf' ? (
                <iframe
                  src={receiptViewUrl}
                  title="Payment Receipt"
                  className="w-full h-[65vh] rounded-lg border border-white/10"
                  onLoad={() => setReceiptLoading(false)}
                  onError={handleReceiptLoadError}
                />
              ) : (
                <img
                  src={receiptViewUrl}
                  alt="Payment Receipt"
                  loading="eager"
                  decoding="async"
                  className="max-w-full max-h-[65vh] object-contain rounded-lg"
                  onLoad={() => setReceiptLoading(false)}
                  onError={handleReceiptLoadError}
                />
              )}
            </div>
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
            <CancelButton type="button" onClick={() => setRejectDialogOpen(false)}>Cancel</CancelButton>
            <DangerButton onClick={handleReject} disabled={processingId === rejectTarget?.id}>
              Reject Payment
            </DangerButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentManagement;
