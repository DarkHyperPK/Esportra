import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare, Clock, CheckCircle, XCircle, RefreshCw,
  AlertCircle, ExternalLink, Send, Image as ImageIcon, X,
  ShieldAlert, Trophy, Calendar, ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

interface Dispute {
  id: string;
  reference_number?: string | null;
  title: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  resolution_notes?: string | null;
  dispute_reason?: string | null;
  created_at: string;
  updated_at: string;
  tournament_id: string;
  tournament_name?: string;
  tournament_slug?: string;
  match_id?: string | null;
  evidence_url?: string | null;
  // Match context (populated when match_id exists)
  match_team1_name?: string | null;
  match_team2_name?: string | null;
  match_team1_score?: number | null;
  match_team2_score?: number | null;
  match_number?: number | null;
  round_index?: number | null;
  best_of?: number | null;
  bracket_type?: string | null;
  scheduled_time?: string | null;
}

const statusMeta: Record<Dispute['status'], { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'Open', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40', icon: Clock },
  in_review: { label: 'In Review', className: 'bg-blue-500/15 text-blue-300 border-blue-500/40', icon: MessageSquare },
  resolved: { label: 'Resolved', className: 'bg-green-500/15 text-green-300 border-green-500/40', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle },
};

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
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'in_review' | 'resolved' | 'rejected'>('all');
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

      const disputesData = await apiClient.get<any[]>('/api/disputes/mine');

      // Fetch tournament names
      const tournamentIds = Array.from(new Set((disputesData || []).map((d: any) => d.tournament_id).filter(Boolean)));
      let tournamentsMap = new Map<string, { name: string; slug: string }>();
      if (tournamentIds.length > 0) {
        const tournamentsData = await apiClient.get<any[]>(
          `/api/tournaments?ids=${tournamentIds.join(',')}`
        ).catch(() => []);
        (tournamentsData || []).forEach((t: any) => tournamentsMap.set(t.id, { name: t.name, slug: t.slug }));
      }

      // Fetch match context for disputes that have a match_id
      const matchIds = [...new Set((disputesData || []).filter((d: any) => d.match_id).map((d: any) => d.match_id as string))];
      let matchesMap = new Map<string, any>();
      if (matchIds.length > 0) {
        const matchesData = await apiClient.get<any[]>(
          `/api/brackets/matches?ids=${matchIds.join(',')}`
        ).catch(() => []);
        (matchesData || []).forEach((m: any) => matchesMap.set(m.id, m));
      }

      const disputesWithData: Dispute[] = (disputesData || []).map((d: any) => {
        const tournament = d.tournament_id ? tournamentsMap.get(d.tournament_id) : null;
        const match = d.match_id ? matchesMap.get(d.match_id) : null;
        return {
          ...d,
          tournament_name: tournament?.name || (d.tournament_id ? 'Unknown Tournament' : 'General Support'),
          tournament_slug: tournament?.slug || null,
          match_team1_name: match?.team1?.name || null,
          match_team2_name: match?.team2?.name || null,
          match_team1_score: match?.team1_score ?? null,
          match_team2_score: match?.team2_score ?? null,
          match_number: match?.match_number ?? null,
          round_index: match?.round_index ?? null,
          best_of: match?.best_of ?? null,
          bracket_type: match?.bracket_type ?? null,
          scheduled_time: match?.scheduled_time ?? null,
        };
      });

      setDisputes(disputesWithData);
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

  const fetchComments = useCallback(async (disputeId: string) => {
    if (!user?.id) return;

    try {
      setLoadingComments(true);
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

      const disputeData = await apiClient.get<{ status: string }>(`/api/disputes/${disputeId}`).catch(() => null);

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

      const updateData: { updated_at: string; status?: string } = { updated_at: new Date().toISOString() };
      if (disputeData?.status === 'open') updateData.status = 'in_review';

      await apiClient.patch(`/api/disputes/${disputeId}`, updateData);

      setCommentText('');
      setCommentAttachment(null);
      fetchComments(disputeId);
      fetchDisputes();
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

  // SignalR subscription for dispute events (replaces Supabase realtime)
  useEffect(() => {
    if (!user?.id) return;

    let active = true;

    const handleDisputeEvent = () => {
      if (!active) return;
      fetchDisputes();
    };

    conn.on('DisputeResolved', handleDisputeEvent);
    conn.on('ReportDisputed', handleDisputeEvent);

    return () => {
      active = false;
      conn.off('DisputeResolved', handleDisputeEvent);
      conn.off('ReportDisputed', handleDisputeEvent);
    };
  }, [user?.id, fetchDisputes, conn]);

  const filteredDisputes = activeTab === 'all' ? disputes : disputes.filter(d => d.status === activeTab);

  const stats = {
    all: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    in_review: disputes.filter(d => d.status === 'in_review').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    rejected: disputes.filter(d => d.status === 'rejected').length,
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-red-400 mx-auto mb-4" />
            <p className="text-white/70">Loading your disputes...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#0a0a0f] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-red-400" />
              My Disputes
            </h1>
            <p className="text-white/50 text-sm">Track and respond to your submitted disputes</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { key: 'all', label: 'Total', value: stats.all, color: 'text-white' },
              { key: 'open', label: 'Open', value: stats.open, color: 'text-yellow-300' },
              { key: 'in_review', label: 'In Review', value: stats.in_review, color: 'text-blue-300' },
              { key: 'resolved', label: 'Resolved', value: stats.resolved, color: 'text-green-300' },
              { key: 'rejected', label: 'Rejected', value: stats.rejected, color: 'text-red-300' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setActiveTab(s.key as any)}
                className={`p-3 rounded-xl border transition-all text-center ${
                  activeTab === s.key
                    ? 'bg-white/10 border-white/30'
                    : 'bg-[#12121a] border-white/10 hover:border-white/20'
                }`}
              >
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Filter Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-[#12121a] border border-white/10 mb-5">
              <TabsTrigger value="all" className="text-white/60 data-[state=active]:text-white text-xs">All</TabsTrigger>
              <TabsTrigger value="open" className="text-white/60 data-[state=active]:text-white text-xs">Open</TabsTrigger>
              <TabsTrigger value="in_review" className="text-white/60 data-[state=active]:text-white text-xs">In Review</TabsTrigger>
              <TabsTrigger value="resolved" className="text-white/60 data-[state=active]:text-white text-xs">Resolved</TabsTrigger>
              <TabsTrigger value="rejected" className="text-white/60 data-[state=active]:text-white text-xs">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {filteredDisputes.length === 0 ? (
                <Card className="bg-[#12121a] border border-white/10">
                  <CardContent className="pt-12 pb-12 text-center">
                    <AlertCircle className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 text-base mb-1">
                      {activeTab === 'all' ? 'No disputes yet' : `No ${activeTab.replace('_', ' ')} disputes`}
                    </p>
                    <p className="text-white/40 text-sm mb-6">
                      {activeTab === 'all'
                        ? "Disputes you file will appear here."
                        : `You have no disputes with "${activeTab.replace('_', ' ')}" status.`}
                    </p>
                    <Button onClick={() => navigate('/user/raise-dispute')} className="bg-red-600 hover:bg-red-700 text-white">
                      <ShieldAlert className="w-4 h-4 mr-2" />
                      Raise a Dispute
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredDisputes.map((dispute) => {
                    const meta = statusMeta[dispute.status];
                    const Icon = meta.icon;
                    const reasonLabel = dispute.dispute_reason
                      ? DISPUTE_REASON_LABELS[dispute.dispute_reason] || dispute.dispute_reason
                      : null;
                    const hasMatch = !!(dispute.match_team1_name && dispute.match_team2_name);

                    return (
                      <Card
                        key={dispute.id}
                        className="bg-[#12121a] border border-white/10 hover:border-red-500/30 transition-all cursor-pointer overflow-hidden"
                        onClick={() => openDisputeDialog(dispute)}
                      >
                        {/* Card top bar: status + tournament + time */}
                        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className={`${meta.className} flex items-center gap-1 border text-xs shrink-0`}>
                              <Icon className="w-3 h-3" />
                              {meta.label}
                            </Badge>
                            {dispute.reference_number && (
                              <span className="text-xs font-mono text-white/60 shrink-0">
                                #{dispute.reference_number}
                              </span>
                            )}
                            <span className="text-xs text-white/50 truncate">{dispute.tournament_name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-white/30">
                              {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                            </span>
                            <ChevronRight className="w-4 h-4 text-white/20" />
                          </div>
                        </div>

                        {/* Match context block */}
                        {hasMatch ? (
                          <div className="mx-4 mb-3 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
                            {/* Teams vs score */}
                            <div className="px-4 py-3 flex items-center justify-between gap-4">
                              <span className="text-sm font-semibold text-white truncate flex-1 text-left">
                                {dispute.match_team1_name}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xl font-bold text-white tabular-nums">
                                  {dispute.match_team1_score ?? 0}
                                </span>
                                <span className="text-white/30 text-xs font-medium">–</span>
                                <span className="text-xl font-bold text-white tabular-nums">
                                  {dispute.match_team2_score ?? 0}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-white truncate flex-1 text-right">
                                {dispute.match_team2_name}
                              </span>
                            </div>
                            {/* Match meta row */}
                            <div className="px-4 py-2 border-t border-white/[0.07] bg-white/[0.02] flex items-center gap-3 flex-wrap">
                              {dispute.match_number !== null && (
                                <span className="text-xs text-white/50 flex items-center gap-1">
                                  <Trophy className="w-3 h-3" />
                                  Match #{dispute.match_number}
                                </span>
                              )}
                              {dispute.best_of !== null && (
                                <span className="text-xs text-white/50">BO{dispute.best_of}</span>
                              )}
                              {dispute.bracket_type && (
                                <span className="text-xs text-white/50">{formatBracketType(dispute.bracket_type)}</span>
                              )}
                              {dispute.scheduled_time && (
                                <span className="text-xs text-white/50 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(dispute.scheduled_time), 'MMM d, HH:mm')}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : dispute.match_id ? (
                          <div className="mx-4 mb-3 px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/40">
                            Match linked (loading...)
                          </div>
                        ) : null}

                        {/* Dispute info */}
                        <div className="px-4 pb-3">
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-400/70 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              {reasonLabel && (
                                <p className="text-xs text-red-400/80 font-medium mb-0.5">{reasonLabel}</p>
                              )}
                              <p className="text-sm text-white/70 line-clamp-2">{dispute.description}</p>
                            </div>
                          </div>
                        </div>

                        {/* Resolution banner */}
                        {dispute.resolution_notes && (dispute.status === 'resolved' || dispute.status === 'rejected') && (
                          <div className={`px-4 py-2 border-t ${dispute.status === 'resolved' ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                            <p className={`text-xs font-medium ${dispute.status === 'resolved' ? 'text-green-400' : 'text-red-400'}`}>
                              {dispute.status === 'resolved' ? '✓ Resolved' : '✗ Rejected'} — click to view notes
                            </p>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

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
            <DialogContent className="bg-[#12121a] border border-white/10 max-w-3xl max-h-[85vh] overflow-y-auto">
              {selectedDispute && (() => {
                const meta = statusMeta[selectedDispute.status];
                const Icon = meta.icon;
                const reasonLabel = selectedDispute.dispute_reason
                  ? DISPUTE_REASON_LABELS[selectedDispute.dispute_reason] || selectedDispute.dispute_reason
                  : null;
                const hasMatch = !!(selectedDispute.match_team1_name && selectedDispute.match_team2_name);

                return (
                  <>
                    <DialogHeader className="pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={`${meta.className} flex items-center gap-1 border text-xs`}>
                              <Icon className="w-3 h-3" />
                              {meta.label}
                            </Badge>
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
                            {selectedDispute.reference_number && (
                              <span className="text-white/40 font-mono text-sm mr-2">#{selectedDispute.reference_number}</span>
                            )}
                            {hasMatch
                              ? `${selectedDispute.match_team1_name} vs ${selectedDispute.match_team2_name}`
                              : selectedDispute.title}
                          </DialogTitle>
                          {reasonLabel && (
                            <DialogDescription className="text-red-400/70 text-xs mt-0.5">
                              {reasonLabel}
                            </DialogDescription>
                          )}
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="space-y-4 mt-2">
                      {/* Match context panel */}
                      {hasMatch && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                          {/* Score */}
                          <div className="px-5 py-4 flex items-center justify-between gap-4">
                            <div className="flex-1 text-left">
                              <p className="text-base font-semibold text-white">{selectedDispute.match_team1_name}</p>
                              <p className="text-xs text-white/40 mt-0.5">Team 1</p>
                            </div>
                            <div className="text-center shrink-0">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-white tabular-nums">
                                  {selectedDispute.match_team1_score ?? 0}
                                </span>
                                <span className="text-white/30 text-sm">–</span>
                                <span className="text-3xl font-bold text-white tabular-nums">
                                  {selectedDispute.match_team2_score ?? 0}
                                </span>
                              </div>
                              <p className="text-xs text-white/30 mt-1">Score at dispute</p>
                            </div>
                            <div className="flex-1 text-right">
                              <p className="text-base font-semibold text-white">{selectedDispute.match_team2_name}</p>
                              <p className="text-xs text-white/40 mt-0.5">Team 2</p>
                            </div>
                          </div>
                          {/* Match meta */}
                          <div className="px-5 py-2.5 border-t border-white/[0.07] bg-white/[0.02] flex items-center gap-4 flex-wrap">
                            {selectedDispute.match_number !== null && (
                              <div className="flex items-center gap-1.5 text-xs text-white/50">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>Match #{selectedDispute.match_number}</span>
                              </div>
                            )}
                            {selectedDispute.best_of !== null && (
                              <div className="text-xs text-white/50">
                                <span className="text-white/30">Series: </span>Best of {selectedDispute.best_of}
                              </div>
                            )}
                            {selectedDispute.round_index !== null && (
                              <div className="text-xs text-white/50">
                                <span className="text-white/30">Round: </span>{selectedDispute.round_index + 1}
                              </div>
                            )}
                            {selectedDispute.bracket_type && (
                              <div className="text-xs text-white/50">
                                <span className="text-white/30">Stage: </span>{formatBracketType(selectedDispute.bracket_type)}
                              </div>
                            )}
                            {selectedDispute.scheduled_time && (
                              <div className="flex items-center gap-1.5 text-xs text-white/50">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{format(new Date(selectedDispute.scheduled_time), 'MMM d, yyyy · HH:mm')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dispute description */}
                      <div>
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Dispute Details</label>
                        <div className="p-3 bg-white/[0.03] rounded-lg text-white/80 text-sm border border-white/[0.07]">
                          {selectedDispute.description || 'No description provided.'}
                        </div>
                      </div>

                      {/* Evidence image */}
                      {selectedDispute.evidence_url && (
                        <div>
                          <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Evidence</label>
                          <img
                            src={selectedDispute.evidence_url}
                            alt="Dispute evidence"
                            className="max-w-full max-h-52 rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setViewingImage(selectedDispute.evidence_url || null)}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
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

                      {/* Comments section */}
                      <div className="border-t border-white/10 pt-4">
                        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">Conversation</label>

                        <div className="space-y-2.5 mb-4 max-h-[280px] overflow-y-auto pr-1">
                          {loadingComments ? (
                            <div className="text-center text-white/40 text-sm py-6">
                              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                              Loading...
                            </div>
                          ) : comments.length === 0 ? (
                            <div className="text-white/40 text-sm text-center py-5 bg-white/[0.02] rounded-lg border border-white/[0.07]">
                              No messages yet.{' '}
                              {selectedDispute.status === 'open' || selectedDispute.status === 'in_review'
                                ? 'Add a comment below.'
                                : 'This dispute is closed.'}
                            </div>
                          ) : (
                            comments.map((comment) => {
                              const isUser = comment.user_id === user?.id;
                              return (
                                <div
                                  key={comment.id}
                                  className={`p-3 rounded-lg border ${isUser ? 'bg-blue-500/8 border-blue-500/20 ml-6' : 'bg-white/[0.03] border-white/[0.07] mr-6'}`}
                                >
                                  <div className="flex items-baseline justify-between mb-1.5 gap-2">
                                    <span className="text-xs font-semibold text-white">
                                      {isUser ? 'You' : comment.user_name}
                                    </span>
                                    <span className="text-xs text-white/30 shrink-0">
                                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                    </span>
                                  </div>
                                  {comment.comment && comment.comment.trim() && (
                                    <p className="text-sm text-white/75 whitespace-pre-wrap">{comment.comment}</p>
                                  )}
                                  {comment.attachment_url && (
                                    <div className="mt-2">
                                      <img
                                        src={comment.attachment_url}
                                        alt="Attachment"
                                        className="max-w-full max-h-48 rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setViewingImage(comment.attachment_url || null)}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Comment composer — only for open/in_review */}
                        {(selectedDispute.status === 'in_review' || selectedDispute.status === 'open') && (
                          <div className="space-y-2">
                            <Textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Add a comment or provide additional evidence..."
                              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[80px] text-sm"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/15 rounded-lg cursor-pointer hover:bg-white/10 transition-colors text-white/60 text-xs">
                                <ImageIcon className="h-3.5 w-3.5" />
                                <span>{commentAttachment ? commentAttachment.name : 'Attach image'}</span>
                                {commentAttachment && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setCommentAttachment(null); }}
                                    className="text-white/40 hover:text-white ml-1"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
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
                              <Button
                                onClick={() => handleAddComment(selectedDispute.id)}
                                disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment)}
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                {uploadingAttachment ? 'Uploading...' : submittingComment ? 'Posting...' : 'Send'}
                              </Button>
                            </div>
                          </div>
                        )}

                        {(selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && (
                          <div className="text-white/40 text-xs text-center py-3 bg-white/[0.02] rounded-lg border border-white/[0.07]">
                            This dispute is {selectedDispute.status}. No further comments can be added.
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
            <DialogContent className="bg-[#0a0a0f] border border-white/10 max-w-5xl max-h-[92vh] p-2">
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
