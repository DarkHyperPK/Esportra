import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare, Clock, CheckCircle, XCircle, RefreshCw, ExternalLink, Send, Image as ImageIcon, X,
  ShieldAlert, Trophy, Calendar, ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import DisputeEvidencePanel, {
  type DisputeReport,
  type DisputeRiotAccount,
  type MatchDisputeEvidence,
} from '@/components/organizer/DisputeEvidencePanel';
import {
  getPrimaryDisputeReport,
  parseDisputeReports,
  parseDisputeRiotAccounts,
  parseMatchDispute,
} from '@/utils/disputeReportUtils';

interface DisputeMatch {
  match_number?: number | null;
  round_index?: number | null;
  best_of?: number | null;
  bracket_type?: string | null;
  scheduled_time?: string | null;
  team1_score?: number | null;
  team2_score?: number | null;
  team1_name?: string | null;
  team2_name?: string | null;
  team1_id?: string | null;
  team2_id?: string | null;
}

interface Dispute {
  id: string;
  reference_number?: string | null;
  title: string;
  description: string;
  status: string;
  resolution_notes?: string | null;
  dispute_reason?: string | null;
  created_at: string;
  updated_at: string;
  tournament_id: string;
  tournament_name?: string;
  tournament_slug?: string;
  match_id?: string | null;
  evidence_url?: string | null;
  match?: DisputeMatch | null;
  reports?: DisputeReport[];
  riot_accounts?: DisputeRiotAccount[];
  match_dispute?: MatchDisputeEvidence | null;
}

function getDisputeMatchView(dispute: Dispute) {
  const match = dispute.match;
  const primaryReport = getPrimaryDisputeReport(parseDisputeReports(dispute.reports));
  return {
    team1Name: match?.team1_name ?? null,
    team2Name: match?.team2_name ?? null,
    team1Score: primaryReport?.team1_score ?? match?.team1_score ?? 0,
    team2Score: primaryReport?.team2_score ?? match?.team2_score ?? 0,
    scoreLabel: primaryReport ? 'Reported score' : 'Score at dispute',
    hasMatch: !!(match?.team1_name && match?.team2_name),
    matchNumber: match?.match_number ?? null,
    bestOf: match?.best_of ?? null,
    bracketType: match?.bracket_type ?? null,
    scheduledTime: match?.scheduled_time ?? null,
    matchContext: match ? {
      team1_name: match.team1_name ?? undefined,
      team2_name: match.team2_name ?? undefined,
      team1_id: match.team1_id ?? undefined,
      team2_id: match.team2_id ?? undefined,
      best_of: match.best_of ?? undefined,
    } : null,
  };
}

const statusMeta: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'Open', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40', icon: Clock },
  in_review: { label: 'In Review', className: 'bg-blue-500/15 text-blue-300 border-blue-500/40', icon: Clock },
  resolved: { label: 'Closed', className: 'bg-green-500/15 text-green-300 border-green-500/40', icon: CheckCircle },
  rejected: { label: 'Closed', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle },
  closed: { label: 'Closed', className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40', icon: CheckCircle },
};
const defaultStatusMeta = { label: 'Unknown', className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40', icon: Clock };

const DISPUTE_REASON_LABELS: Record<string, string> = {
  'cheating': 'Cheating / Hacking',
  'unsportsmanlike': 'Unsportsmanlike Conduct',
  'roster_violation': 'Unapproved Player / Roster Violation',
  'match_result': 'Match Result Discrepancy',
  'result_dispute': 'Match Result Dispute',
  'scheduling': 'Scheduling / No-Show',
  'technical_issue': 'Technical Issue / Server Problems',
  'rule_violation': 'Tournament Rule Violation',
  'ban_appeal': 'Ban Appeal',
  'general_support': 'General Support',
  'other': 'Other',
};

function formatBracketType(bt: string | null | undefined): string {
  if (!bt) return '';
  const map: Record<string, string> = {
    winners: 'Winners',
    losers: 'Losers',
    single: 'Elimination',
    swiss: 'Swiss',
    group: 'Group Stage',
    final: 'Grand Final',
    double: 'Double Elim',
  };
  return map[bt] ?? bt;
}

const MyDisputes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const conn = useHub(HubPaths.Match);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved' | 'rejected'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; comment: string; created_at: string; user_name?: string; is_internal: boolean; attachment_url?: string | null }>>([]);
  const [commentText, setCommentText] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const disputesRaw = await apiClient.get<Dispute[]>('/api/disputes/mine');
      const disputesData: Dispute[] = Array.isArray(disputesRaw) ? disputesRaw : [];

      setDisputes(disputesData.map((d) => ({
        ...d,
        tournament_name: d.tournament_name || (d.tournament_id ? 'Unknown Tournament' : 'General Support'),
      })));
    } catch (error: unknown) {
      console.error('Error fetching disputes:', error);
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || JSON.stringify(error);
      toast({ title: 'Error', description: `Failed to load disputes: ${errorMessage}`, variant: 'destructive' });
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const fetchComments = useCallback(async (disputeId: string, silent = false) => {
    if (!user?.id) return;

    try {
      if (!silent) setLoadingComments(true);
      const data = await apiClient.get<any[]>(`/api/disputes/${disputeId}/comments`);

      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const profileMap = new Map<string, { full_name?: string; username?: string }>();
      if (userIds.length > 0) {
        const profiles = await apiClient.get<any[]>(
          `/api/profiles?ids=${userIds.join(',')}`
        ).catch(() => []);
        (profiles || []).forEach((profile: any) => profileMap.set(profile.id, { full_name: profile.full_name, username: profile.username }));
      }

      const commentsWithNames = (data || []).map((c: any) => {
        const profile = profileMap.get(c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          comment: c.comment,
          is_internal: c.is_internal,
          created_at: c.created_at,
          attachment_url: c.attachment_url,
          user_name: profile?.full_name || profile?.username || 'Unknown',
        };
      });

      setComments(commentsWithNames);
    } catch (error: unknown) {
      console.error('Error fetching comments:', error);
      toast({ title: 'Error', description: 'Failed to load comments', variant: 'destructive' });
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [user?.id, toast]);

  const handleAddComment = async (disputeId: string) => {
    if (!user?.id || (!commentText.trim() && !commentAttachment)) return;

    try {
      setSubmittingComment(true);

      await apiClient.get<{ status: string }>(`/api/disputes/${disputeId}`).catch(() => null);

      let attachmentUrl: string | null = null;
      if (commentAttachment) {
        setUploadingAttachment(true);
        const disputeInfo = await apiClient.get<{ dispute_reason?: string; tournament_id?: string }>(
          `/api/disputes/${disputeId}`
        ).catch(() => null);

        const disputeReason = disputeInfo?.dispute_reason || 'general';

        const { error: uploadError } = await apiClient.upload<{ url: string; path: string }>(
          '/api/storage/upload',
          (() => {
            const fd = new FormData();
            fd.append('file', commentAttachment);
            fd.append('bucket', 'tournaments.disputes.evidence');
            fd.append('folder', disputeInfo?.tournament_id
              ? `${disputeId}/${disputeReason}`
              : `${disputeId}/general_support`);
            return fd;
          })(),
        ).then(result => {
          attachmentUrl = result.url;
          setUploadingAttachment(false);
          return { error: null as any };
        }).catch(err => {
          return { error: err };
        });

        if (uploadError) throw uploadError;
      }

      await apiClient.post(`/api/disputes/${disputeId}/comments`, {
        dispute_id: disputeId,
        user_id: user.id,
        comment: commentText.trim() || '',
        is_internal: false,
        attachment_url: attachmentUrl,
      });

      await apiClient.patch(`/api/disputes/${disputeId}`, { updated_at: new Date().toISOString() });

      setCommentText('');
      setCommentAttachment(null);
      fetchComments(disputeId, true);
      toast({ title: 'Comment added', description: 'Your comment has been posted.' });
    } catch (error: unknown) {
      console.error('Error adding comment:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
      setUploadingAttachment(false);
    }
  };

  const openDisputeDialog = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDisputeDialogOpen(true);
    fetchComments(dispute.id);
  };

  // SignalR subscription for real-time dispute updates
  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    const handleDisputeEvent = () => {
      if (!active) return;
      fetchDisputes();
    };

    const handleCommentAdded = (payload: { disputeId: string; userId: string }) => {
      if (!active) return;
      if (payload?.userId !== user?.id && selectedDispute?.id === payload?.disputeId) {
        fetchComments(payload.disputeId, true);
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
  }, [user?.id, fetchDisputes, fetchComments, selectedDispute?.id, conn]);

  const filteredDisputes = activeTab === 'all'
    ? disputes
    : activeTab === 'resolved'
      ? disputes.filter(d => d.status === 'resolved' || d.status === 'rejected' || d.status === 'closed')
      : disputes.filter(d => d.status === activeTab);

  const stats = {
    all: disputes.length,
    open: disputes.filter(d => d.status === 'open' || d.status === 'in_review').length,
    closed: disputes.filter(d => d.status === 'resolved' || d.status === 'rejected' || d.status === 'closed').length,
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-rose-500 mx-auto mb-4" />
            <p className="text-white/70">Loading your disputes...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-transparent py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <ShieldAlert className="h-7 w-7 text-rose-500" />
                  My Disputes
                </h1>
                <p className="text-white/40 text-sm mt-1">Track and respond to your submitted disputes</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-yellow-500/10 text-yellow-300/80 px-2.5 py-1 rounded-full border border-yellow-500/20 tabular-nums">
                  {stats.open} Open
                </span>
                <span className="text-xs bg-white/[0.04] text-white/50 px-2.5 py-1 rounded-full border border-white/[0.06] tabular-nums">
                  {stats.closed} Closed
                </span>
                <span className="text-xs bg-white/[0.04] text-white/50 px-2.5 py-1 rounded-full border border-white/[0.06] tabular-nums">
                  {stats.all} Total
                </span>
              </div>
            </div>
            <Button onClick={() => navigate('/user/raise-dispute')} className="bg-rose-600 hover:bg-rose-500 text-white shrink-0">
              <ShieldAlert className="w-4 h-4 mr-2" />
              Raise a Dispute
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-6">
            {([
              { key: 'all', label: 'All' },
              { key: 'open', label: 'Open' },
              { key: 'resolved', label: 'Closed' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'bg-white/[0.04] text-white/50 hover:text-white/70 hover:bg-white/[0.08] border border-white/[0.06]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div>
              {filteredDisputes.length === 0 ? (
                <div className="bg-[#0a0a0c] border border-white/[0.06] rounded-2xl py-16 text-center">
                  <ShieldAlert className="h-14 w-14 text-white/10 mx-auto mb-4" />
                  <p className="text-white/70 text-lg font-semibold mb-1">
                    {activeTab === 'all' ? 'No disputes yet' : `No ${activeTab === 'resolved' ? 'closed' : activeTab} disputes`}
                  </p>
                  <p className="text-white/35 text-sm mb-6 max-w-sm mx-auto">
                    {activeTab === 'all'
                      ? "File a dispute if you encounter any issues with a match or tournament."
                      : `You have no disputes with "${activeTab === 'resolved' ? 'closed' : activeTab}" status.`}
                  </p>
                  {activeTab === 'all' && (
                    <Button onClick={() => navigate('/user/raise-dispute')} className="bg-rose-600 hover:bg-rose-500 text-white">
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Raise a Dispute
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                  {filteredDisputes.map((dispute, index) => {
                    const meta = statusMeta[dispute.status] || defaultStatusMeta;
                    const Icon = meta.icon;
                    const reasonLabel = dispute.dispute_reason
                      ? DISPUTE_REASON_LABELS[dispute.dispute_reason] || dispute.dispute_reason
                      : null;
                    const matchView = getDisputeMatchView(dispute);

                    return (
                      <motion.div
                        key={dispute.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <button
                          className="w-full text-left bg-[#0a0a0c] border border-white/[0.06] rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:border-white/20 transition-all duration-200"
                          onClick={() => openDisputeDialog(dispute)}
                        >
                          <div className="flex">
                            {/* Left accent bar */}
                            <div className={`w-[3px] shrink-0 ${dispute.status === 'open' ? 'bg-yellow-500' : dispute.status === 'resolved' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div className="flex-1 min-w-0">
                              {/* Card top bar: status + tournament + time */}
                              <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge className={`${meta.className} flex items-center gap-1 border text-xs shrink-0`}>
                                    <Icon className="w-3 h-3" />
                                    {meta.label}
                                  </Badge>
                                  {dispute.reference_number && (
                                    <span className="text-xs font-mono text-white/50 shrink-0">
                                      #{dispute.reference_number}
                                    </span>
                                  )}
                                  <span className="text-xs text-white/40 truncate">{dispute.tournament_name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-white/25">
                                    {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-white/15" />
                                </div>
                              </div>

                              {/* Dispute title + reason */}
                              <div className="px-4 pb-2">
                                <h3 className="text-sm font-semibold text-white truncate">{dispute.title}</h3>
                                {reasonLabel && (
                                  <p className="text-xs text-rose-400/80 font-medium mt-0.5">{reasonLabel}</p>
                                )}
                              </div>

                              {/* Match context block */}
                              {matchView.hasMatch ? (
                                <div className="mx-4 mb-3 rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                                  <div className="px-4 py-3 flex items-center justify-between gap-4">
                                    <span className="text-sm font-semibold text-white truncate flex-1 text-left">
                                      {matchView.team1Name}
                                    </span>
                                    <div className="flex flex-col items-center shrink-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-white tabular-nums">
                                          {matchView.team1Score}
                                        </span>
                                        <span className="text-white/30 text-xs font-medium">–</span>
                                        <span className="text-xl font-bold text-white tabular-nums">
                                          {matchView.team2Score}
                                        </span>
                                      </div>
                                      <span className="text-[10px] text-white/30 mt-0.5">{matchView.scoreLabel}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-white truncate flex-1 text-right">
                                      {matchView.team2Name}
                                    </span>
                                  </div>
                                  <div className="px-4 py-2 border-t border-white/[0.05] bg-white/[0.02] flex items-center gap-3 flex-wrap">
                                    {matchView.matchNumber !== null && matchView.matchNumber !== undefined && (
                                      <span className="text-xs text-white/45 flex items-center gap-1">
                                        <Trophy className="w-3 h-3" />
                                        Match #{matchView.matchNumber}
                                      </span>
                                    )}
                                    {matchView.bestOf !== null && matchView.bestOf !== undefined && (
                                      <span className="text-xs text-white/45">BO{matchView.bestOf}</span>
                                    )}
                                    {matchView.bracketType && (
                                      <span className="text-xs text-white/45">{formatBracketType(matchView.bracketType)}</span>
                                    )}
                                    {matchView.scheduledTime && (
                                      <span className="text-xs text-white/45 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(matchView.scheduledTime), 'MMM d, HH:mm')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : dispute.match_id ? (
                                <div className="mx-4 mb-3 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.03] text-xs text-white/35">
                                  Match linked (ID: {dispute.match_id?.slice(0, 8)}…)
                                </div>
                              ) : null}

                              {/* Dispute description preview */}
                              <div className="px-4 pb-3">
                                <p className="text-sm text-white/50 line-clamp-2">{dispute.description}</p>
                              </div>

                              {/* Resolution banner */}
                              {dispute.resolution_notes && (dispute.status === 'resolved' || dispute.status === 'rejected') && (
                                <div className={`px-4 py-2 border-t ${dispute.status === 'resolved' ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-red-500/15 bg-red-500/5'}`}>
                                  <p className={`text-xs font-medium ${dispute.status === 'resolved' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {dispute.status === 'resolved' ? '✓ Resolved' : '✗ Rejected'} — click to view notes
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      </motion.div>
                    );
                  })}
                  </AnimatePresence>
                </div>
              )}
          </div>

          {/* ─── Dispute Detail Dialog ─────────────────────────────────── */}
          <Dialog open={disputeDialogOpen} onOpenChange={(open) => {
            setDisputeDialogOpen(open);
            if (!open) {
              setSelectedDispute(null);
              setComments([]);
              setCommentText('');
              setCommentAttachment(null);
            }
          }}>
            <DialogContent className="bg-[#0a0a0c] border border-white/[0.06] max-w-3xl h-[92vh] max-h-[92vh] min-h-0 !grid grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
              {selectedDispute && (() => {
                const meta = statusMeta[selectedDispute.status] || defaultStatusMeta;
                const Icon = meta.icon;
                const reasonLabel = selectedDispute.dispute_reason
                  ? DISPUTE_REASON_LABELS[selectedDispute.dispute_reason] || selectedDispute.dispute_reason
                  : null;
                const matchView = getDisputeMatchView(selectedDispute);
                const safeReports = parseDisputeReports(selectedDispute.reports);
                const safeRiotAccounts = parseDisputeRiotAccounts(selectedDispute.riot_accounts);
                const matchDispute = parseMatchDispute(selectedDispute.match_dispute);
                const primaryReport = getPrimaryDisputeReport(safeReports);
                const canComment = selectedDispute.status === 'open' || selectedDispute.status === 'in_review';

                return (
                  <>
                    {/* Header — fixed */}
                    <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-white/[0.06]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={`${meta.className} flex items-center gap-1 border text-xs`}>
                              <Icon className="w-3 h-3" />
                              {meta.label}
                            </Badge>
                            {selectedDispute.reference_number && (
                              <span className="text-xs font-mono text-white/40">#{selectedDispute.reference_number}</span>
                            )}
                            <span className="text-xs text-white/50">{selectedDispute.tournament_name}</span>
                            {selectedDispute.tournament_slug && (
                              <button
                                onClick={() => navigate(`/tournaments/${selectedDispute.tournament_slug}`)}
                                className="text-white/30 hover:text-white/60 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <DialogTitle className="text-white text-lg leading-snug">
                            {matchView.hasMatch
                              ? `${matchView.team1Name} vs ${matchView.team2Name}`
                              : selectedDispute.title}
                          </DialogTitle>
                          {reasonLabel && (
                            <DialogDescription className="text-rose-400/70 text-xs mt-0.5">
                              {reasonLabel}
                            </DialogDescription>
                          )}
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="grid grid-rows-[minmax(0,1fr)_minmax(180px,38vh)] min-h-0 overflow-hidden">
                    {/* Scrollable evidence / match details */}
                    <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                      {matchView.hasMatch && (
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                          <div className="px-5 py-4 flex items-center justify-between gap-4">
                            <div className="flex-1 text-left">
                              <p className="text-base font-semibold text-white">{matchView.team1Name}</p>
                              <p className="text-xs text-white/40 mt-0.5">Team 1</p>
                            </div>
                            <div className="text-center shrink-0">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-white tabular-nums">{matchView.team1Score}</span>
                                <span className="text-white/30 text-sm">–</span>
                                <span className="text-3xl font-bold text-white tabular-nums">{matchView.team2Score}</span>
                              </div>
                              <p className="text-xs text-white/30 mt-1">{matchView.scoreLabel}</p>
                            </div>
                            <div className="flex-1 text-right">
                              <p className="text-base font-semibold text-white">{matchView.team2Name}</p>
                              <p className="text-xs text-white/40 mt-0.5">Team 2</p>
                            </div>
                          </div>
                          <div className="px-5 py-2.5 border-t border-white/[0.07] bg-white/[0.02] flex items-center gap-4 flex-wrap">
                            {matchView.matchNumber !== null && matchView.matchNumber !== undefined && (
                              <div className="flex items-center gap-1.5 text-xs text-white/50">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>Match #{matchView.matchNumber}</span>
                              </div>
                            )}
                            {matchView.bestOf !== null && matchView.bestOf !== undefined && (
                              <span className="text-xs text-white/50">BO{matchView.bestOf}</span>
                            )}
                            {matchView.bracketType && (
                              <span className="text-xs text-white/50">{formatBracketType(matchView.bracketType)}</span>
                            )}
                            {matchView.scheduledTime && (
                              <div className="flex items-center gap-1.5 text-xs text-white/50">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{format(new Date(matchView.scheduledTime), 'MMM d, HH:mm')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <DisputeEvidencePanel
                        reports={safeReports}
                        riotAccounts={safeRiotAccounts}
                        matchDispute={matchDispute}
                        fallbackEvidenceUrl={selectedDispute.evidence_url}
                        disputeDescription={selectedDispute.description}
                        matchContext={matchView.matchContext}
                        onImageClick={(url) => setViewingImage(url)}
                      />

                      {safeReports.length === 0 && !matchDispute && !selectedDispute.evidence_url && (
                        <div>
                          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Dispute Details</label>
                          <div className="p-4 bg-white/[0.04] rounded-xl text-white/85 text-sm border border-white/[0.08] leading-relaxed whitespace-pre-wrap min-h-[60px]">
                            {selectedDispute.description || 'No description provided.'}
                          </div>
                        </div>
                      )}

                      {/* Resolution / rejection notes */}
                      {selectedDispute.resolution_notes && (selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && (
                        <div className={`p-4 rounded-lg border ${selectedDispute.status === 'resolved' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${selectedDispute.status === 'resolved' ? 'text-green-400' : 'text-red-400'}`}>
                            {selectedDispute.status === 'resolved' ? 'Resolution Notes' : 'Rejection Reason'}
                          </p>
                          <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedDispute.resolution_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Chat section — pinned below evidence */}
                    <div className="flex flex-col min-h-0 border-t border-white/[0.06] overflow-hidden bg-[#0a0a0c]">
                      <div className="shrink-0 px-6 py-2.5 flex items-center gap-2 border-b border-white/[0.05]">
                        <MessageSquare className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Conversation</span>
                        {comments.length > 0 && (
                          <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full">{comments.length}</span>
                        )}
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                        {loadingComments ? (
                          <div className="flex items-center justify-center py-6 text-white/40 text-sm">
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                            Loading...
                          </div>
                        ) : comments.length === 0 ? (
                          <div className="text-center py-6">
                            <MessageSquare className="w-8 h-8 text-white/10 mx-auto mb-2" />
                            <p className="text-white/30 text-sm">
                              {canComment
                                ? 'No messages yet. Start the conversation below.'
                                : 'No messages were exchanged.'}
                            </p>
                          </div>
                        ) : (
                          comments.map((comment) => {
                            const isUser = comment.user_id === user?.id;
                            return (
                              <div key={comment.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                                  isUser
                                    ? 'bg-rose-500/15 border border-rose-500/20 rounded-br-sm'
                                    : 'bg-white/[0.06] border border-white/[0.08] rounded-bl-sm'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[11px] font-semibold ${isUser ? 'text-rose-300' : 'text-blue-300'}`}>
                                      {isUser ? 'You' : (comment.user_name || 'Staff')}
                                    </span>
                                    <span className="text-[10px] text-white/25">
                                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  {comment.comment && comment.comment.trim() && (
                                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{comment.comment}</p>
                                  )}
                                  {comment.attachment_url && (
                                    <div className="mt-2">
                                      <img
                                        src={comment.attachment_url}
                                        alt="Attachment"
                                        className="max-w-full max-h-40 rounded-lg border border-white/15 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setViewingImage(comment.attachment_url || null)}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Composer */}
                      {canComment ? (
                        <div className="shrink-0 px-6 py-3 border-t border-white/[0.07] bg-white/[0.02]">
                          <div className="flex items-end gap-2">
                            <label className="shrink-0 p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 cursor-pointer transition-colors">
                              <ImageIcon className="h-4 w-4" />
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
                                    return;
                                  }
                                  if (!file.type.startsWith('image/')) {
                                    toast({ title: 'Invalid file type', description: 'Images only', variant: 'destructive' });
                                    return;
                                  }
                                  setCommentAttachment(file);
                                }}
                              />
                            </label>
                            <div className="flex-1 min-w-0">
                              {commentAttachment && (
                                <div className="flex items-center gap-2 mb-1.5 px-2 py-1 bg-white/5 rounded-lg text-xs text-white/50">
                                  <ImageIcon className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{commentAttachment.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setCommentAttachment(null)}
                                    className="text-white/30 hover:text-white ml-auto shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              <Textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Type a message..."
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/25 min-h-[40px] max-h-[100px] text-sm resize-none rounded-xl"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleAddComment(selectedDispute.id);
                                  }
                                }}
                              />
                            </div>
                            <Button
                              onClick={() => handleAddComment(selectedDispute.id)}
                              disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment)}
                              size="sm"
                              className="shrink-0 bg-rose-600 hover:bg-rose-500 text-white h-10 w-10 p-0 rounded-full"
                            >
                              {(uploadingAttachment || submittingComment)
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Send className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="px-6 py-3 border-t border-white/[0.07] bg-white/[0.02]">
                          <p className="text-white/30 text-xs text-center">
                            This dispute is {selectedDispute.status}. No further messages can be sent.
                          </p>
                        </div>
                      )}
                    </div>
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>

          {/* Image viewer */}
          <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
            <DialogContent className="bg-[#0a0a0c] border border-white/[0.06] max-w-5xl max-h-[92vh] p-2">
              <div className="relative flex items-center justify-center">
                <button
                  onClick={() => setViewingImage(null)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                {viewingImage && (
                  <img
                    src={viewingImage}
                    alt="Full size"
                    className="max-w-full max-h-[88vh] object-contain rounded-lg"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PageTransition>
  );
};

export default MyDisputes;
