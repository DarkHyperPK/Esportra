import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Clock, CheckCircle, XCircle,
  RefreshCw, AlertCircle, Send, Image as ImageIcon, X,
  Trophy, Calendar, Search, MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
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
  match_number: number | null;
  round_index: number | null;
  best_of: number | null;
  bracket_type: string | null;
  scheduled_time: string | null;
  team1_score: number | null;
  team2_score: number | null;
  team1_name: string | null;
  team2_name: string | null;
  team1_id?: string | null;
  team2_id?: string | null;
}

interface Dispute {
  id: string;
  reference_number?: string | null;
  title: string;
  description: string | null;
  status: string;
  dispute_reason: string | null;
  resolution_notes: string | null;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
  tournament_id: string | null;
  tournament_name: string;
  match_id: string | null;
  raised_by_user_id: string;
  raised_by_name: string;
  match: DisputeMatch | null;
  reports?: DisputeReport[];
  riot_accounts?: DisputeRiotAccount[];
  match_dispute?: MatchDisputeEvidence | null;
}

const defaultMeta = { label: 'Unknown', className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40', icon: Clock };
const statusMeta: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'Open', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40', icon: Clock },
  in_review: { label: 'In Review', className: 'bg-blue-500/15 text-blue-300 border-blue-500/40', icon: Clock },
  resolved: { label: 'Closed', className: 'bg-green-500/15 text-green-300 border-green-500/40', icon: CheckCircle },
  rejected: { label: 'Closed', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle },
  closed: { label: 'Closed', className: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40', icon: CheckCircle },
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

function formatBracketType(bt: string | null | undefined): string {
  if (!bt) return '';
  const map: Record<string, string> = {
    winners: 'Winners', losers: 'Losers', single: 'Elimination',
    swiss: 'Swiss', group: 'Group Stage', final: 'Grand Final', double: 'Double Elim',
  };
  return map[bt] ?? bt;
}

const OrganizerDisputesPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const conn = useHub(HubPaths.Match);

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Comments
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; comment: string; created_at: string; user_name: string; attachment_url: string | null }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Resolution
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // ─── Load disputes scoped to this organizer's tournaments ─────────────────
  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      const data = await apiClient.get<any[]>('/api/organizer/disputes');

      const enriched: Dispute[] = (data || []).map((d: any) => {
        const m = typeof d.match === 'string' ? JSON.parse(d.match) : d.match;
        return {
          ...d,
          tournament_name: d.tournament_name || 'Unknown Tournament',
          raised_by_name: d.raised_by_name || 'Unknown',
          match: m || null,
          reports: parseDisputeReports(d.reports),
          riot_accounts: parseDisputeRiotAccounts(d.riot_accounts),
        };
      });

      setDisputes(enriched);
    } catch (e: any) {
      console.error('Load organizer disputes failed:', e);
      toast({ title: 'Failed to load disputes', description: e?.message || '', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => { load(); }, [load]);

  // Realtime removed — disputes are refreshed on user action (resolve, comment)

  // ─── Comments ─────────────────────────────────────────────────────────────
  const fetchComments = useCallback(async (disputeId: string) => {
    try {
      setLoadingComments(true);
      const data = await apiClient.get<any[]>(`/api/organizer/disputes/${disputeId}/comments`);
      setComments((data || []).map((c: any) => ({ ...c, user_name: c.user_name || 'Unknown' })));
    } catch (e: any) {
      console.error('Fetch comments error:', e);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  // Fetch comments when a dispute is selected
  useEffect(() => {
    if (!selectedDispute) return;
    fetchComments(selectedDispute.id);
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

  const handleAddComment = async () => {
    if (!user?.id || !selectedDispute || (!commentText.trim() && !commentAttachment)) return;
    try {
      setSubmittingComment(true);
      let attachmentUrl: string | null = null;

      if (commentAttachment) {
        setUploadingAttachment(true);
        const fd = new FormData();
        fd.append('file', commentAttachment);
        fd.append('bucket', 'tournaments.disputes.evidence');
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        attachmentUrl = url;
        setUploadingAttachment(false);
      }

      await apiClient.post<{ autoPromoted?: boolean }>(`/api/organizer/disputes/${selectedDispute.id}/comments`, {
        comment: commentText.trim() || '',
        attachmentUrl,
      });

      setCommentText('');
      setCommentAttachment(null);
      fetchComments(selectedDispute.id);
      load();
      toast({ title: 'Comment sent' });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to add comment', variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
      setUploadingAttachment(false);
    }
  };

  // ─── Resolution ───────────────────────────────────────────────────────────
  const handleResolve = async (newStatus: 'resolved' | 'rejected') => {
    if (!selectedDispute) return;
    try {
      setResolving(true);
      await apiClient.post(`/api/organizer/disputes/${selectedDispute.id}/resolve`, {
        status: newStatus,
        resolutionNotes: resolutionNotes || null,
      });

      toast({ title: newStatus === 'resolved' ? 'Dispute resolved' : 'Dispute rejected' });
      setSelectedDispute(null);
      setResolutionNotes('');
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed', variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  const selectDispute = (d: Dispute) => {
    setSelectedDispute(d);
    setResolutionNotes(d.resolution_notes || '');
    setCommentText('');
    setCommentAttachment(null);
  };

  const statusFiltered = activeStatus === 'all'
    ? disputes
    : activeStatus === 'open'
      ? disputes.filter(d => d.status === 'open')
      : disputes.filter(d => d.status !== 'open');

  const filtered = searchQuery.trim()
    ? statusFiltered.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.raised_by_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tournament_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : statusFiltered;

  const openCount = disputes.filter(d => d.status === 'open').length;
  const closedCount = disputes.filter(d => d.status !== 'open').length;

  const leftBorderColor = (status: string) =>
    status === 'open' ? 'border-l-yellow-500' : status === 'resolved' ? 'border-l-green-500' : status === 'rejected' ? 'border-l-red-500' : 'border-l-zinc-500';

  const statusDotColor = (status: string) =>
    status === 'open' ? 'bg-yellow-500' : status === 'resolved' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : 'bg-zinc-500';

  return (
    <div className="min-h-screen bg-transparent py-8 px-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10">
              <ShieldAlert className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">Dispute Center</h1>
              <p className="text-zinc-500 text-sm">Review and resolve disputes for your tournaments</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load()}
            className="text-zinc-400 hover:text-white hover:bg-white/[0.06] gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-yellow-300 text-xs font-medium">{openCount} Open</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-300 text-xs font-medium">{closedCount} Closed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <span className="text-zinc-400 text-xs font-medium">{disputes.length} Total</span>
          </div>
        </div>

        {/* 3-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_400px] gap-5 h-[calc(100vh-160px)] min-h-0">

          {/* ── Panel 1: Dispute List ─────────────────────────────────── */}
          <div className="min-h-0 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/[0.06] space-y-2.5">
              <Tabs value={activeStatus} onValueChange={(v) => setActiveStatus(v as 'all' | 'open' | 'closed')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/[0.04] h-8 rounded-lg">
                  <TabsTrigger value="all" className="text-zinc-400 text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white rounded-md">
                    All ({disputes.length})
                  </TabsTrigger>
                  <TabsTrigger value="open" className="text-zinc-400 text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white rounded-md">
                    Open ({openCount})
                  </TabsTrigger>
                  <TabsTrigger value="closed" className="text-zinc-400 text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white rounded-md">
                    Closed ({closedCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search disputes..."
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-rose-500/40 transition"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5 scrollbar-thin" data-lenis-prevent>
              {loading ? (
                <div className="text-zinc-400 text-center py-12">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                  <span className="text-sm">Loading disputes...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-zinc-500 text-center py-12">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">
                    {activeStatus === 'all' && !searchQuery ? 'No disputes in your tournaments yet.' : 'No disputes found'}
                  </p>
                  {searchQuery && <p className="text-xs text-zinc-600 mt-1">Try a different search term</p>}
                </div>
              ) : (
                filtered.map((d) => {
                  const isSelected = selectedDispute?.id === d.id;
                  const reasonLabel = d.dispute_reason ? DISPUTE_REASON_LABELS[d.dispute_reason] || d.dispute_reason : null;
                  const hasMatch = !!(d.match?.team1_name && d.match?.team2_name);
                  return (
                    <button
                      key={d.id}
                      onClick={() => selectDispute(d)}
                      className={`w-full text-left p-3 rounded-xl border-l-[3px] border border-white/[0.04] transition-all duration-150 ${
                        isSelected
                          ? 'border-l-rose-500 bg-rose-500/[0.12] border-rose-500/20'
                          : `${leftBorderColor(d.status)} bg-white/[0.02] hover:bg-white/[0.05] hover:-translate-y-0.5`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {d.reference_number && (
                          <span className="text-rose-400/70 font-mono text-[11px] shrink-0">{d.reference_number}</span>
                        )}
                        <h3 className="text-white text-sm font-medium truncate flex-1">{d.title}</h3>
                        <Badge className={`${(statusMeta[d.status] || defaultMeta).className} text-[10px] px-1.5 py-0 gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor(d.status)} inline-block`} />
                          {(statusMeta[d.status] || defaultMeta).label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <span>{d.raised_by_name}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="truncate">{d.tournament_name}</span>
                      </div>
                      {reasonLabel && (
                        <div className="text-[11px] text-rose-400/70 mt-0.5">{reasonLabel}</div>
                      )}
                      {hasMatch && (
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          {d.match!.team1_name} vs {d.match!.team2_name}
                        </div>
                      )}
                      <div className="text-[11px] text-zinc-600 mt-0.5">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Panel 2: Evidence & Info ──────────────────────────────── */}
          <div className="min-h-0 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
            {selectedDispute ? (() => {
              const hasMatch = !!(selectedDispute.match?.team1_name && selectedDispute.match?.team2_name);
              const canAct = selectedDispute.status === 'open';
              const safeReports = parseDisputeReports(selectedDispute.reports);
              const safeRiotAccounts = parseDisputeRiotAccounts(selectedDispute.riot_accounts);
              const matchDispute = parseMatchDispute(selectedDispute.match_dispute);
              const primaryReport = getPrimaryDisputeReport(safeReports);
              const headerTeam1Score = primaryReport?.team1_score
                ?? selectedDispute.match?.team1_score
                ?? 0;
              const headerTeam2Score = primaryReport?.team2_score
                ?? selectedDispute.match?.team2_score
                ?? 0;
              return (
                <motion.div
                  key={selectedDispute.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full min-h-0"
                >
                  <div className="shrink-0 p-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-1">
                      {selectedDispute.reference_number && (
                        <span className="text-rose-400/70 font-mono text-sm shrink-0">{selectedDispute.reference_number}</span>
                      )}
                      <h2 className="text-white text-lg font-semibold flex-1">
                        {hasMatch
                          ? `${selectedDispute.match!.team1_name} vs ${selectedDispute.match!.team2_name}`
                          : selectedDispute.title}
                      </h2>
                      <Badge className={(statusMeta[selectedDispute.status] || defaultMeta).className}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor(selectedDispute.status)} inline-block mr-1`} />
                        {(statusMeta[selectedDispute.status] || defaultMeta).label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span>By: <strong className="text-zinc-300">{selectedDispute.raised_by_name}</strong></span>
                      <span className="text-zinc-700">•</span>
                      <span>{selectedDispute.tournament_name}</span>
                      {selectedDispute.dispute_reason && (
                        <>
                          <span className="text-zinc-700">•</span>
                          <span className="text-rose-400">{DISPUTE_REASON_LABELS[selectedDispute.dispute_reason] || selectedDispute.dispute_reason}</span>
                        </>
                      )}
                      <span className="text-zinc-700">•</span>
                      <span className="text-zinc-600">{formatDistanceToNow(new Date(selectedDispute.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10" data-lenis-prevent>
                    {/* Match context panel */}
                    {hasMatch && (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                        <div className="px-5 py-4 flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-base font-semibold text-white">{selectedDispute.match!.team1_name}</p>
                            <p className="text-xs text-white/40 mt-0.5">Team 1</p>
                          </div>
                          <div className="text-center shrink-0">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl font-bold text-white tabular-nums">{headerTeam1Score}</span>
                              <span className="text-white/30 text-sm">–</span>
                              <span className="text-3xl font-bold text-white tabular-nums">{headerTeam2Score}</span>
                            </div>
                            <p className="text-xs text-white/30 mt-1">
                              {primaryReport ? 'Reported score' : 'Score at dispute'}
                            </p>
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-base font-semibold text-white">{selectedDispute.match!.team2_name}</p>
                            <p className="text-xs text-white/40 mt-0.5">Team 2</p>
                          </div>
                        </div>
                        <div className="px-5 py-2.5 border-t border-white/[0.07] bg-white/[0.02] flex items-center gap-4 flex-wrap">
                          {selectedDispute.match!.match_number !== null && (
                            <span className="text-xs text-white/50 flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />Match #{selectedDispute.match!.match_number}</span>
                          )}
                          {selectedDispute.match!.best_of !== null && (
                            <span className="text-xs text-white/50"><span className="text-white/30">Series: </span>Best of {selectedDispute.match!.best_of}</span>
                          )}
                          {selectedDispute.match!.round_index !== null && (
                            <span className="text-xs text-white/50"><span className="text-white/30">Round: </span>{selectedDispute.match!.round_index + 1}</span>
                          )}
                          {selectedDispute.match!.bracket_type && (
                            <span className="text-xs text-white/50"><span className="text-white/30">Stage: </span>{formatBracketType(selectedDispute.match!.bracket_type)}</span>
                          )}
                          {selectedDispute.match!.scheduled_time && (
                            <span className="text-xs text-white/50 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />{format(new Date(selectedDispute.match!.scheduled_time), 'MMM d, yyyy · HH:mm')}
                            </span>
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
                      matchContext={selectedDispute.match ? {
                        team1_name: selectedDispute.match.team1_name ?? undefined,
                        team2_name: selectedDispute.match.team2_name ?? undefined,
                        team1_id: selectedDispute.match.team1_id ?? undefined,
                        team2_id: selectedDispute.match.team2_id ?? undefined,
                        best_of: selectedDispute.match.best_of ?? undefined,
                      } : null}
                      onImageClick={(url) => setViewingImage(url)}
                    />

                    {!primaryReport && (
                      <div>
                        <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block font-medium">Description</label>
                        <p className="text-white/90 text-sm bg-[#121214] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                          {selectedDispute.description || 'No description provided.'}
                        </p>
                      </div>
                    )}

                    {/* Resolution notes (if already resolved/rejected) */}
                    {!canAct && selectedDispute.resolution_notes && (
                      <div>
                        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
                        <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block font-medium">Resolution Notes</label>
                        <p className="text-zinc-300 text-sm bg-[#121214] p-3 rounded-xl border border-white/[0.06]">
                          {selectedDispute.resolution_notes}
                        </p>
                      </div>
                    )}

                    {/* Resolution panel (if open) */}
                    {canAct && (
                      <div>
                        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
                        <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block font-medium">Resolution</label>
                        <Textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Add resolution notes (optional but recommended)..."
                          className="bg-[#121214] border-white/[0.06] text-white placeholder:text-zinc-600 min-h-[100px] rounded-xl mb-3 focus:border-rose-500/40"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleResolve('resolved')}
                            disabled={resolving}
                            className="bg-emerald-600 text-white border-transparent hover:bg-emerald-600 hover:text-white flex-1"
                          >
                            <CheckCircle className="h-4 w-4 mr-1.5" />
                            Resolve
                          </Button>
                          <Button
                            onClick={() => handleResolve('rejected')}
                            disabled={resolving}
                            className="bg-rose-600 hover:bg-rose-500 text-white flex-1 transition-colors"
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })() : (
              <motion.div
                key="empty-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center border-2 border-dashed border-white/[0.06] rounded-2xl px-12 py-10">
                  <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-zinc-700 opacity-40" />
                  <p className="text-zinc-500 text-sm font-medium">Select a dispute to view details</p>
                  <p className="text-zinc-600 text-xs mt-1">Evidence, info, and resolution controls will appear here</p>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* ── Panel 3: Conversation ─────────────────────────────────── */}
          <div className="min-h-0 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
            <div className="shrink-0 p-3 border-b border-white/[0.06]">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-zinc-500" />
                Conversation
                {comments.length > 0 && (
                  <span className="text-[11px] text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded-full font-medium">{comments.length}</span>
                )}
              </h3>
            </div>

            {selectedDispute ? (() => {
              const canAct = selectedDispute.status === 'open';
              return (
                <>
                  {/* Messages */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-3 scrollbar-thin" data-lenis-prevent>
                    {loadingComments ? (
                      <div className="text-center text-zinc-500 text-sm py-12">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-rose-500" />
                        Loading messages...
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-zinc-700 opacity-20" />
                        <p className="text-zinc-600 text-sm">No messages yet</p>
                        {canAct && <p className="text-zinc-700 text-xs mt-1">Start the conversation</p>}
                      </div>
                    ) : (
                      comments.map((c) => {
                        const isMe = c.user_id === user?.id;
                        return (
                          <div
                            key={c.id}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] p-3 ${
                                isMe
                                  ? 'bg-rose-500/[0.15] rounded-2xl rounded-br-sm'
                                  : 'bg-white/[0.06] rounded-2xl rounded-bl-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[11px] font-medium ${isMe ? 'text-rose-400' : 'text-zinc-400'}`}>
                                  {isMe ? 'You (Organizer)' : c.user_name}
                                </span>
                                <span className="text-[10px] text-zinc-600">
                                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              {c.comment?.trim() && (
                                <p className="text-sm text-white/90 whitespace-pre-wrap">{c.comment}</p>
                              )}
                              {c.attachment_url && (
                                <img
                                  src={c.attachment_url}
                                  alt="Attachment"
                                  className="max-w-full max-h-40 rounded-lg border border-white/[0.06] mt-1.5 cursor-pointer hover:brightness-75 transition"
                                  onClick={() => setViewingImage(c.attachment_url)}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Composer */}
                  {canAct ? (
                    <div className="p-3 border-t border-white/[0.06] space-y-2">
                      <div className="flex items-end gap-2">
                        <div className="flex-1 bg-[#121214] rounded-xl border border-white/[0.06] focus-within:border-rose-500/30 transition">
                          <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Type a message..."
                            className="bg-transparent border-0 text-white placeholder:text-zinc-600 min-h-[44px] max-h-[120px] rounded-xl text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                          {commentAttachment && (
                            <div className="flex items-center gap-1 px-3 pb-2 text-[11px] text-zinc-400">
                              <ImageIcon className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[140px]">{commentAttachment.name}</span>
                              <button onClick={() => setCommentAttachment(null)} className="text-red-400 hover:text-red-300 shrink-0">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 pb-0.5">
                          <label className="cursor-pointer p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition">
                            <ImageIcon className="h-4 w-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' }); return; }
                                if (!file.type.startsWith('image/')) { toast({ title: 'Images only', variant: 'destructive' }); return; }
                                setCommentAttachment(file);
                              }}
                            />
                          </label>
                          <Button
                            size="icon"
                            onClick={handleAddComment}
                            disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment)}
                            className="bg-rose-600 hover:bg-rose-500 text-white h-9 w-9 rounded-full shrink-0 transition-colors"
                          >
                            {submittingComment ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 border-t border-white/[0.06]">
                      <p className="text-zinc-600 text-xs text-center">
                        Dispute {selectedDispute.status === 'resolved' ? 'resolved' : 'rejected'} — closed
                      </p>
                    </div>
                  )}
                </>
              );
            })() : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center border-2 border-dashed border-white/[0.06] rounded-2xl px-8 py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-zinc-700 opacity-20" />
                  <p className="text-zinc-600 text-sm">No dispute selected</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image viewer */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="bg-[#121214] border border-white/[0.06] max-w-5xl max-h-[90vh] p-0">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label="Close image viewer"
            >
              <X className="w-6 h-6" />
            </button>
            {viewingImage && (
              <img
                src={viewingImage}
                alt="Full size"
                className="max-w-full max-h-[90vh] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerDisputesPage;
