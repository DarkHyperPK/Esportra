import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  CommandButton,
  CommandIconButton,
  CommandPanel,
  CommandSection,
  CommandTabs,
} from '@/components/management/CommandSurface';
import { AdminPage } from '@/components/admin/AdminPage';
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Clock, Image as ImageIcon, RefreshCw, X, Search, Send, ZoomIn, Shield, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import { downloadCsvExport } from '@/lib/exportUtils';

type Dispute = {
  id: string;
  reference_number?: string | null;
  tournament_id: string | null;
  title: string;
  description: string | null;
  status: string;
  dispute_reason: string | null;
  raised_by_user_id: string;
  evidence_url: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  tournament_name?: string;
  raised_by_name?: string;
};

const DISPUTE_REASON_LABELS: Record<string, string> = {
  cheating: 'Cheating / Hacking',
  unsportsmanlike: 'Unsportsmanlike Conduct',
  roster_violation: 'Unapproved Player / Roster Violation',
  match_result: 'Match Result Discrepancy',
  result_dispute: 'Match Result Dispute',
  scheduling: 'Scheduling / No-Show',
  technical_issue: 'Technical Issue / Server Problems',
  rule_violation: 'Tournament Rule Violation',
  ban_appeal: 'Ban Appeal',
  general_support: 'General Support',
  other: 'Other',
};

const defaultMeta = { label: 'Unknown', className: 'border-white/10 text-zinc-400', icon: Clock };
const statusMeta: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'Open', className: 'border-rose-500/30 text-rose-300', icon: Clock },
  in_review: { label: 'In Review', className: 'border-amber-500/30 text-amber-300', icon: Clock },
  resolved: { label: 'Closed', className: 'border-white/25 text-white', icon: CheckCircle },
  rejected: { label: 'Closed', className: 'border-white/10 text-zinc-400', icon: XCircle },
  closed: { label: 'Closed', className: 'border-white/10 text-zinc-400', icon: CheckCircle },
};

const DisputeCenter: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { roles, hasPermission } = useAdmin();
  const conn = useHub(HubPaths.Match);
  const isSuperAdmin = roles.includes('super_admin');
  const canHandleDisputes = isSuperAdmin || roles.includes('moderator') || roles.includes('ops_admin') || hasPermission('disputes:resolve');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'tournament' | 'general'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected'>('resolved');
  const [commentText, setCommentText] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; comment: string; created_at: string; user_name?: string; is_internal: boolean; attachment_url?: string }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [liftingBan, setLiftingBan] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const load = useCallback(async () => {
    try {
    setLoading(true);
      
      // Fetch all disputes (both tournament and general support)
      const disputesData = await apiClient.get<any[]>('/api/admin/disputes?order=created_at.desc');

      console.log('Fetched disputes:', disputesData?.length || 0, 'disputes');
      console.log('Disputes data:', disputesData);

      // Enrich with user and tournament names
      const enriched = await Promise.all(
        (disputesData || []).map(async (d: any) => {
          const dispute: Dispute = { ...d };
          
          // Get user who raised the dispute
          try {
            const profile = await apiClient.get<{ username?: string; full_name?: string }>(`/api/profiles/${d.raised_by_user_id}`);
            dispute.raised_by_name = profile?.full_name || profile?.username || 'Unknown User';
          } catch {
            dispute.raised_by_name = 'Unknown User';
          }
          
          // Get tournament name if it's a tournament dispute
          if (d.tournament_id) {
            try {
              const response = await apiClient.get<any>(`/api/tournaments/${d.tournament_id}`);
              const tournament = response?.tournament || response;
              dispute.tournament_name = tournament?.name || 'Unknown Tournament';
            } catch {
              dispute.tournament_name = 'Unknown Tournament';
            }
          } else {
            dispute.tournament_name = 'General Support';
          }
          
          return dispute;
        })
      );

      // Exclude disputes raised by the current user (prevent self-handling)
      const filtered = enriched.filter(d => d.raised_by_user_id !== user?.id);
      setDisputes(filtered);
    } catch (e: any) {
      console.error('Load disputes failed:', e);
      toast({ title: 'Failed to load disputes', description: e?.message || '', variant: 'destructive' });
    } finally {
    setLoading(false);
    }
  }, [toast, user?.id]);

  const fetchComments = useCallback(async (disputeId: string) => {
    try {
      setLoadingComments(true);
      const data = await apiClient.get<any[]>(`/api/admin/disputes/${disputeId}/comments`);

      // Manually fetch profile data for each comment
      const enrichedComments = await Promise.all(
        (data || []).map(async (comment) => {
          let userName = 'Unknown User';
          try {
            const profile = await apiClient.get<{ username?: string; full_name?: string }>(`/api/profiles/${comment.user_id}`);
            userName = profile?.full_name || profile?.username || 'Unknown User';
          } catch {
            // fallback already set
          }
          
          return {
            ...comment,
            user_name: userName,
          };
        })
      );

      setComments(enrichedComments);
      console.log('Fetched comments:', enrichedComments.length, 'comments');
      enrichedComments.forEach((c, idx) => {
        console.log(`Comment ${idx + 1}:`, {
          id: c.id,
          user_id: c.user_id,
          user_name: c.user_name,
          has_comment: !!c.comment,
          has_attachment: !!c.attachment_url,
          attachment_url: c.attachment_url,
        });
      });
    } catch (error: unknown) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load comments',
        variant: 'destructive',
      });
    } finally {
      setLoadingComments(false);
    }
  }, [toast]);

  useEffect(() => { 
    load(); 
  }, [load]);

  useEffect(() => {
    if (selectedDispute) {
      fetchComments(selectedDispute.id);
    } else {
      setComments([]);
    }
  }, [selectedDispute, fetchComments]);

  // SignalR subscription for real-time dispute updates
  useEffect(() => {
    if (!selectedDispute) return;

    let active = true;

    const handleDisputeEvent = () => {
      if (!active) return;
      fetchComments(selectedDispute.id);
    };

    const handleCommentAdded = (payload: { disputeId: string; userId: string }) => {
      if (!active) return;
      if (payload?.disputeId === selectedDispute.id && payload?.userId !== user?.id) {
        fetchComments(selectedDispute.id);
      }
    };

    conn.on('DisputeResolved', handleDisputeEvent);
    conn.on('ReportDisputed', handleDisputeEvent);
    conn.on('DisputeCommentAdded', handleCommentAdded);

    return () => {
      active = false;
      conn.off('DisputeResolved', handleDisputeEvent);
      conn.off('ReportDisputed', handleDisputeEvent);
      conn.off('DisputeCommentAdded', handleCommentAdded);
    };
  }, [selectedDispute, fetchComments, conn, user?.id]);

  const handleAddComment = async (disputeId: string) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add comments',
        variant: 'destructive',
      });
      return;
    }

    if (!commentText.trim() && !commentAttachment) return;

    try {
      setSubmittingComment(true);
      
      // Fetch dispute data (status + reason + tournament_id) in one call
      const disputeData = await apiClient.get<{ status?: string; dispute_reason?: string; tournament_id?: string | null }>(`/api/admin/disputes/${disputeId}`);

      // Upload attachment if provided
      let attachmentUrl: string | null = null;
      if (commentAttachment) {
        setUploadingAttachment(true);
        
        const disputeReason = disputeData?.dispute_reason || 'general';
        const folder = disputeData?.tournament_id
          ? `${disputeId}/${disputeReason}`
          : `${disputeId}/general_support`;

        const fd = new FormData();
        fd.append('file', commentAttachment);
        fd.append('bucket', 'tournaments.disputes.evidence');
        fd.append('folder', folder);
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        attachmentUrl = url;
        setUploadingAttachment(false);
      }

      await apiClient.post(`/api/admin/disputes/${disputeId}/comments`, {
        userId: user.id,
        comment: commentText.trim() || '',
        isInternal: false,
        attachmentUrl: attachmentUrl,
      });

      // Update dispute timestamp
      await apiClient.put(`/api/admin/disputes/${disputeId}`, {
        updated_at: new Date().toISOString(),
      });

      setCommentText('');
      setCommentAttachment(null);
      
      // Refresh comments and disputes
      await fetchComments(disputeId);
      await load();
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted.',
      });
    } catch (error: unknown) {
      console.error('Error adding comment:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any)?.message || JSON.stringify(error);
      toast({
        title: 'Error',
        description: `Failed to add comment: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const resolve = async () => {
    if (!selectedDispute) return;
    try {
      await apiClient.put(`/api/admin/disputes/${selectedDispute.id}`, {
        status: resolutionStatus,
        resolutionNotes: resolutionNotes || null,
      });

      toast({
        title: 'Updated',
        description: `Dispute marked as ${resolutionStatus}`,
      });

      setResolutionNotes('');
      setSelectedDispute(null);
      setComments([]);
      setCommentText('');
      await load();
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed',
        variant: 'destructive',
      });
    }
  };

  const liftBan = async () => {
    if (!selectedDispute) return;
    setLiftingBan(true);
    try {
      const result = await apiClient.post<{ success: boolean; banLifted: boolean; participantRestored: boolean }>(
        `/api/admin/disputes/${selectedDispute.id}/lift-ban`, {}
      );

      toast({
        title: 'Ban Lifted',
        description: result.participantRestored
          ? 'Ban lifted and participant registration restored.'
          : 'Ban lifted. Participant may need to re-register.',
      });

      setSelectedDispute(null);
      setComments([]);
      await load();
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message || 'Failed to lift ban',
        variant: 'destructive',
      });
    } finally {
      setLiftingBan(false);
    }
  };

  const tabFiltered = activeTab === 'all'
    ? disputes
    : activeTab === 'tournament'
      ? disputes.filter(d => d.tournament_id !== null)
      : disputes.filter(d => d.tournament_id === null);

  const filteredDisputes = searchQuery.trim()
    ? tabFiltered.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.raised_by_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tabFiltered;

  const openCount = disputes.filter(d => d.status === 'open').length;
  const closedCount = disputes.filter(d => d.status !== 'open').length;

  const leftBorderColor = (status: string) =>
    status === 'open' ? 'border-l-rose-500' : status === 'in_review' ? 'border-l-amber-500' : status === 'resolved' ? 'border-l-zinc-300' : status === 'rejected' ? 'border-l-red-500' : 'border-l-zinc-500';

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadCsvExport('/api/admin/export/disputes', {
        status: activeTab !== 'all' ? activeTab : undefined,
      }, `disputes_export_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: 'Export complete', description: 'Disputes CSV downloaded' });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminPage
      eyebrow="Operations"
      title="Disputes"
      description="Review evidence, follow conversations, and resolve or reject tournament and general support disputes."
      actions={
        <>
          <CommandButton variant="ghost" size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </CommandButton>
          <CommandButton variant="ghost" size="sm" onClick={() => load()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </CommandButton>
        </>
      }
    >
        {/* Stats row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-rose-500/30 bg-white/[0.025] px-3 py-1.5">
            <span className="h-1.5 w-1.5 bg-rose-500" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300">{openCount} Open</span>
          </div>
          <div className="flex items-center gap-2 border border-white/10 bg-white/[0.025] px-3 py-1.5">
            <span className="h-1.5 w-1.5 bg-zinc-400" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300">{closedCount} Closed</span>
          </div>
          <div className="flex items-center gap-2 border border-white/10 bg-white/[0.025] px-3 py-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">{disputes.length} Total</span>
          </div>
        </div>

        {/* 3-Panel Layout */}
        <div className="grid h-[calc(100vh-220px)] grid-cols-1 gap-5 lg:grid-cols-[320px_1fr_380px]">

          {/* ── Panel 1: Dispute List ─────────────────────────────────── */}
          <CommandSection className="flex flex-col overflow-hidden p-0">
            <div className="space-y-2.5 border-b border-white/10 p-3">
              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search disputes..."
                  className="w-full -none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <CommandTabs
                className="w-full border-none bg-transparent p-0"
                active={activeTab}
                onChange={(v) => setActiveTab(v as 'all' | 'tournament' | 'general')}
                tabs={[
                  { value: 'all', label: `All ${disputes.length}` },
                  { value: 'tournament', label: `Tournament ${disputes.filter(d => d.tournament_id !== null).length}` },
                  { value: 'general', label: `General ${disputes.filter(d => d.tournament_id === null).length}` },
                ]}
              />
            </div>

            <div className="flex-1 space-y-1.5 overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
              {loading ? (
                <div className="py-12 text-center text-zinc-400">
                  <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin text-zinc-500" />
                  <span className="text-sm">Loading disputes...</span>
                </div>
              ) : filteredDisputes.length === 0 ? (
                <div className="py-12 text-center text-zinc-500">
                  <AlertCircle className="mx-auto mb-2 h-6 w-6 opacity-30" />
                  <p className="text-sm">No disputes found</p>
                  {searchQuery && <p className="mt-1 text-xs text-zinc-600">Try a different search term</p>}
                </div>
              ) : (
                filteredDisputes.map((d) => {
                  const meta = statusMeta[d.status] || defaultMeta;
                  const isSelected = selectedDispute?.id === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDispute(d);
                        setResolutionNotes(d.resolution_notes || '');
                        setResolutionStatus(d.status === 'rejected' ? 'rejected' : 'resolved');
                        fetchComments(d.id);
                      }}
                      className={`w-full border border-white/10 border-l-[3px] p-3 text-left transition-colors duration-150 ${
                        isSelected
                          ? 'border-l-rose-500 border-rose-500/40 bg-rose-500/10'
                          : `${leftBorderColor(d.status)} bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]`
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {d.reference_number && (
                          <span className="shrink-0 font-mono text-[11px] text-rose-300">{d.reference_number}</span>
                        )}
                        <h3 className="flex-1 truncate text-sm font-medium text-white">{d.title}</h3>
                        <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                        <span>{d.raised_by_name}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="truncate">{d.tournament_name}</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-zinc-600">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CommandSection>

          {/* ── Panel 2: Evidence & Info ──────────────────────────────── */}
          <CommandSection className="flex flex-col overflow-hidden p-0">
            <AnimatePresence mode="wait">
            {selectedDispute ? (
              <motion.div
                key={selectedDispute.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex h-full flex-col"
              >
                <div className="border-b border-white/10 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    {selectedDispute.reference_number && (
                      <span className="shrink-0 font-mono text-sm text-rose-300">{selectedDispute.reference_number}</span>
                    )}
                    <h2 className="flex-1 text-lg font-semibold text-white">{selectedDispute.title}</h2>
                    <span className={`shrink-0 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${(statusMeta[selectedDispute.status] || defaultMeta).className}`}>
                      {(statusMeta[selectedDispute.status] || defaultMeta).label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>By: <strong className="font-mono text-zinc-300">{selectedDispute.raised_by_name}</strong></span>
                    <span className="text-zinc-700">•</span>
                    <span>{selectedDispute.tournament_name}</span>
                    {selectedDispute.dispute_reason && (
                      <>
                        <span className="text-zinc-700">•</span>
                        <span className="text-rose-300">{DISPUTE_REASON_LABELS[selectedDispute.dispute_reason] || selectedDispute.dispute_reason}</span>
                      </>
                    )}
                    <span className="text-zinc-700">•</span>
                    <span className="font-mono text-zinc-600">{formatDistanceToNow(new Date(selectedDispute.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4" data-lenis-prevent>
                  {/* Description */}
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Description</label>
                    <CommandPanel>
                      <p className="text-sm leading-relaxed text-white/90">
                        {selectedDispute.description || 'No description provided'}
                      </p>
                    </CommandPanel>
                  </div>

                  {/* Evidence */}
                  {selectedDispute.evidence_url && (
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Evidence
                      </label>
                      <div
                        className="group relative inline-block cursor-pointer"
                        onClick={() => setViewingImage(selectedDispute.evidence_url || null)}
                      >
                        <img
                          src={selectedDispute.evidence_url}
                          alt="Dispute evidence"
                          className="max-h-80 max-w-full border border-white/10 transition-all group-hover:brightness-75"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="text-red-400 text-sm">Failed to load image.</span>`;
                            }
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                          <ZoomIn className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resolution Section */}
                  {canHandleDisputes && selectedDispute.status === 'open' && (
                    <div>
                      <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Resolution</label>

                      {/* Lift Ban action for ban appeals */}
                      {selectedDispute.dispute_reason === 'ban_appeal' && selectedDispute.tournament_id && (
                        <CommandButton
                          variant="warning"
                          onClick={liftBan}
                          disabled={liftingBan}
                          className="mb-3 w-full"
                        >
                          <Shield className="h-4 w-4" />
                          {liftingBan ? 'Lifting Ban...' : 'Lift Ban & Restore Participant'}
                        </CommandButton>
                      )}

                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Enter resolution notes..."
                        className="mb-3 min-h-[100px] -none border-white/10 bg-white/[0.025] text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-rose-500"
                      />
                      <div className="flex gap-2">
                        <CommandButton
                          onClick={() => { setResolutionStatus('resolved'); resolve(); }}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Resolve
                        </CommandButton>
                        <CommandButton
                          variant="danger"
                          onClick={() => { setResolutionStatus('rejected'); resolve(); }}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </CommandButton>
                      </div>
                    </div>
                  )}

                  {/* Closed dispute notice */}
                  {(selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && selectedDispute.resolution_notes && (
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Resolution Notes</label>
                      <CommandPanel>
                        <p className="text-sm text-zinc-300">
                          {selectedDispute.resolution_notes}
                        </p>
                      </CommandPanel>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-1 items-center justify-center"
              >
                <div className="border border-dashed border-white/10 px-12 py-10 text-center">
                  <MessageSquare className="mx-auto mb-3 h-6 w-6 text-zinc-700 opacity-50" />
                  <p className="text-sm font-medium text-zinc-500">Select a dispute to view details</p>
                  <p className="mt-1 text-xs text-zinc-600">Evidence, info, and resolution controls will appear here</p>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </CommandSection>

          {/* ── Panel 3: Conversation ─────────────────────────────────── */}
          <CommandSection className="flex flex-col overflow-hidden p-0">
            <div className="border-b border-white/10 p-3">
              <h3 className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                <MessageSquare className="h-4 w-4" />
                Conversation
                {comments.length > 0 && (
                  <span className="border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">{comments.length}</span>
                )}
              </h3>
            </div>

            {selectedDispute ? (
              <>
                {/* Messages */}
                <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3" data-lenis-prevent>
                  {loadingComments ? (
                    <div className="py-12 text-center text-sm text-zinc-500">
                      <RefreshCw className="mx-auto mb-2 h-4 w-4 animate-spin text-zinc-500" />
                      Loading messages...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-12 text-center">
                      <MessageSquare className="mx-auto mb-2 h-6 w-6 text-zinc-700 opacity-30" />
                      <p className="text-sm text-zinc-600">No messages yet</p>
                      <p className="mt-1 text-xs text-zinc-700">Start the conversation</p>
                    </div>
                  ) : (
                    comments.map((comment) => {
                      const isAdmin = comment.user_id === user?.id;
                      return (
                        <div
                          key={comment.id}
                          className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] border p-3 ${
                              isAdmin
                                ? 'border-rose-500/30 bg-rose-500/10'
                                : 'border-white/10 bg-white/[0.04]'
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <span className={`font-mono text-[11px] ${isAdmin ? 'text-rose-300' : 'text-zinc-400'}`}>
                                {comment.user_name}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-600">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {comment.comment?.trim() && (
                              <p className="whitespace-pre-wrap text-sm text-white/90">{comment.comment}</p>
                            )}
                            {comment.attachment_url && (
                              <img
                                src={comment.attachment_url}
                                alt="Attachment"
                                className="mt-1.5 max-h-40 max-w-full cursor-pointer border border-white/10 transition hover:brightness-75"
                                onClick={() => setViewingImage(comment.attachment_url || null)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input Area */}
                {selectedDispute.status === 'open' ? (
                  canHandleDisputes ? (
                    <div className="space-y-2 border-t border-white/10 p-3">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 border border-white/10 bg-white/[0.025] transition-colors focus-within:border-rose-500/40">
                          <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Type a message..."
                            className="min-h-[44px] max-h-[120px] resize-none -none border-0 bg-transparent text-sm text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                          {commentAttachment && (
                            <div className="flex items-center gap-1 px-3 pb-2 font-mono text-[11px] text-zinc-400">
                              <ImageIcon className="h-3 w-3 shrink-0" />
                              <span className="max-w-[140px] truncate">{commentAttachment.name}</span>
                              <button onClick={() => setCommentAttachment(null)} className="shrink-0 text-red-400 hover:text-red-300">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 pb-0.5">
                          <label className="cursor-pointer border border-white/10 bg-white/[0.03] p-2 text-zinc-500 transition-colors hover:border-white/25 hover:text-white">
                            <ImageIcon className="h-4 w-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
                                    return;
                                  }
                                  setCommentAttachment(file);
                                }
                              }}
                            />
                          </label>
                          <CommandIconButton
                            label="Send message"
                            onClick={() => handleAddComment(selectedDispute.id)}
                            disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment)}
                          >
                            {submittingComment ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </CommandIconButton>
                        </div>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="border-t border-white/10 p-3">
                    <p className="text-center font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                      Dispute {selectedDispute.status === 'resolved' ? 'resolved' : 'rejected'} — closed
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <div className="border border-dashed border-white/10 px-8 py-8 text-center">
                  <MessageSquare className="mx-auto mb-2 h-5 w-5 text-zinc-700 opacity-30" />
                  <p className="text-sm text-zinc-600">No dispute selected</p>
                </div>
              </div>
            )}
          </CommandSection>
        </div>

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl -none border border-white/10 bg-[#0a0a0c] p-0">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative flex h-full w-full items-center justify-center">
            <CommandIconButton
              label="Close image viewer"
              variant="ghost"
              onClick={() => setViewingImage(null)}
              className="absolute right-4 top-4 z-10 border-black/50 bg-black/50 hover:border-white/25"
            >
              <X className="h-4 w-4" />
            </CommandIconButton>
            {viewingImage && (
              <img
                src={viewingImage}
                alt="Full size image"
                className="max-h-[90vh] max-w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="p-8 text-center"><span class="text-red-400">Failed to load image.</span></div>`;
                  }
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default DisputeCenter;
