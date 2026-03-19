import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Footer from '@/components/Footer';
import {
  ShieldAlert, Clock, CheckCircle, XCircle,
  RefreshCw, AlertCircle, Send, Image as ImageIcon, X,
  Trophy, Calendar, ChevronRight, User,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

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
}

interface Dispute {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'resolved' | 'rejected';
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
}

const statusMeta: Record<Dispute['status'], { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'Open', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40', icon: Clock },
  resolved: { label: 'Closed', className: 'bg-green-500/15 text-green-300 border-green-500/40', icon: CheckCircle },
  rejected: { label: 'Closed', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle },
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

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<'all' | 'open' | 'resolved' | 'rejected'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

      const result = await apiClient.post<{ autoPromoted?: boolean }>(`/api/organizer/disputes/${selectedDispute.id}/comments`, {
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
      setDialogOpen(false);
      setSelectedDispute(null);
      setResolutionNotes('');
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed', variant: 'destructive' });
    } finally {
      setResolving(false);
    }
  };

  const openDialog = (d: Dispute) => {
    setSelectedDispute(d);
    setResolutionNotes(d.resolution_notes || '');
    setCommentText('');
    setCommentAttachment(null);
    setDialogOpen(true);
  };

  const filtered = activeStatus === 'all' ? disputes : disputes.filter(d => d.status === activeStatus);

  const stats = {
    all: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    rejected: disputes.filter(d => d.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="h-6 w-6 text-red-400" />
              Dispute Center
            </h1>
            <p className="text-white/50 text-sm mt-1">Review and resolve disputes for your tournaments</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { key: 'all', label: 'Total', value: stats.all, color: 'text-white' },
              { key: 'open', label: 'Open', value: stats.open, color: 'text-yellow-300' },
              { key: 'resolved', label: 'Resolved', value: stats.resolved, color: 'text-green-300' },
              { key: 'rejected', label: 'Rejected', value: stats.rejected, color: 'text-red-300' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setActiveStatus(s.key as any)}
                className={`p-3 rounded-xl border transition-all text-center ${activeStatus === s.key ? 'bg-white/10 border-white/30' : 'bg-[#12121a] border-white/10 hover:border-white/20'}`}
              >
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeStatus} onValueChange={(v) => setActiveStatus(v as any)}>
            <TabsList className="grid w-full grid-cols-4 bg-[#12121a] border border-white/10 mb-5">
              <TabsTrigger value="all" className="text-white/60 data-[state=active]:text-white text-xs">All</TabsTrigger>
              <TabsTrigger value="open" className="text-white/60 data-[state=active]:text-white text-xs">Open</TabsTrigger>
              <TabsTrigger value="resolved" className="text-white/60 data-[state=active]:text-white text-xs">Resolved</TabsTrigger>
              <TabsTrigger value="rejected" className="text-white/60 data-[state=active]:text-white text-xs">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeStatus}>
              {loading ? (
                <div className="text-center py-16">
                  <RefreshCw className="h-8 w-8 animate-spin text-red-400 mx-auto mb-3" />
                  <p className="text-white/50">Loading disputes...</p>
                </div>
              ) : filtered.length === 0 ? (
                <Card className="bg-[#12121a] border border-white/10">
                  <CardContent className="py-14 text-center">
                    <AlertCircle className="h-10 w-10 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50">
                      {activeStatus === 'all' ? 'No disputes in your tournaments yet.' : `No ${activeStatus.replace('_', ' ')} disputes.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filtered.map((d) => {
                    const meta = statusMeta[d.status];
                    const Icon = meta.icon;
                    const reasonLabel = d.dispute_reason ? DISPUTE_REASON_LABELS[d.dispute_reason] || d.dispute_reason : null;
                    const hasMatch = !!(d.match?.team1_name && d.match?.team2_name);

                    return (
                      <Card
                        key={d.id}
                        className="bg-[#12121a] border border-white/10 hover:border-red-500/30 transition-all cursor-pointer overflow-hidden"
                        onClick={() => openDialog(d)}
                      >
                        {/* Top bar */}
                        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge className={`${meta.className} flex items-center gap-1 border text-xs shrink-0`}>
                              <Icon className="w-3 h-3" />
                              {meta.label}
                            </Badge>
                            <span className="text-xs text-white/50 truncate">{d.tournament_name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-xs text-white/30">
                            {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                            <ChevronRight className="w-4 h-4 text-white/20" />
                          </div>
                        </div>

                        {/* Match context */}
                        {hasMatch && (
                          <div className="mx-4 mb-3 rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
                            <div className="px-4 py-3 flex items-center justify-between gap-4">
                              <span className="text-sm font-semibold text-white truncate flex-1">{d.match!.team1_name}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xl font-bold text-white tabular-nums">{d.match!.team1_score ?? 0}</span>
                                <span className="text-white/30 text-xs">–</span>
                                <span className="text-xl font-bold text-white tabular-nums">{d.match!.team2_score ?? 0}</span>
                              </div>
                              <span className="text-sm font-semibold text-white truncate flex-1 text-right">{d.match!.team2_name}</span>
                            </div>
                            <div className="px-4 py-2 border-t border-white/[0.07] bg-white/[0.02] flex items-center gap-3 flex-wrap">
                              {d.match!.match_number !== null && (
                                <span className="text-xs text-white/50 flex items-center gap-1"><Trophy className="w-3 h-3" />Match #{d.match!.match_number}</span>
                              )}
                              {d.match!.best_of !== null && <span className="text-xs text-white/50">BO{d.match!.best_of}</span>}
                              {d.match!.bracket_type && <span className="text-xs text-white/50">{formatBracketType(d.match!.bracket_type)}</span>}
                              {d.match!.scheduled_time && (
                                <span className="text-xs text-white/50 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />{format(new Date(d.match!.scheduled_time), 'MMM d, HH:mm')}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Dispute info */}
                        <div className="px-4 pb-3">
                          <div className="flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-400/70 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              {reasonLabel && <p className="text-xs text-red-400/80 font-medium mb-0.5">{reasonLabel}</p>}
                              <p className="text-sm text-white/70 line-clamp-2">{d.description || d.title}</p>
                              <p className="text-xs text-white/40 mt-1 flex items-center gap-1">
                                <User className="w-3 h-3" />{d.raised_by_name}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />

      {/* ─── Detail Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) { setSelectedDispute(null); setComments([]); setCommentText(''); setCommentAttachment(null); }
      }}>
        <DialogContent className="bg-[#12121a] border border-white/10 max-w-3xl max-h-[88vh] overflow-y-auto">
          {selectedDispute && (() => {
            const meta = statusMeta[selectedDispute.status];
            const Icon = meta.icon;
            const reasonLabel = selectedDispute.dispute_reason ? DISPUTE_REASON_LABELS[selectedDispute.dispute_reason] || selectedDispute.dispute_reason : null;
            const hasMatch = !!(selectedDispute.match?.team1_name && selectedDispute.match?.team2_name);
            const canAct = selectedDispute.status === 'open';

            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className={`${meta.className} flex items-center gap-1 border text-xs`}>
                      <Icon className="w-3 h-3" />{meta.label}
                    </Badge>
                    <span className="text-xs text-white/50">{selectedDispute.tournament_name}</span>
                  </div>
                  <DialogTitle className="text-white text-lg">
                    {hasMatch
                      ? `${selectedDispute.match!.team1_name} vs ${selectedDispute.match!.team2_name}`
                      : selectedDispute.title}
                  </DialogTitle>
                  <DialogDescription className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3" />Filed by {selectedDispute.raised_by_name}
                    {reasonLabel && <> · <span className="text-red-400/70">{reasonLabel}</span></>}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-1">
                  {/* Match context panel */}
                  {hasMatch && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                      <div className="px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-base font-semibold text-white">{selectedDispute.match!.team1_name}</p>
                          <p className="text-xs text-white/40 mt-0.5">Team 1</p>
                        </div>
                        <div className="text-center shrink-0">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold text-white tabular-nums">{selectedDispute.match!.team1_score ?? 0}</span>
                            <span className="text-white/30 text-sm">–</span>
                            <span className="text-3xl font-bold text-white tabular-nums">{selectedDispute.match!.team2_score ?? 0}</span>
                          </div>
                          <p className="text-xs text-white/30 mt-1">Score at dispute</p>
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

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 block">Dispute Details</label>
                    <div className="p-3 bg-white/[0.03] rounded-lg text-white/80 text-sm border border-white/[0.07]">
                      {selectedDispute.description || 'No description provided.'}
                    </div>
                  </div>

                  {/* Evidence */}
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

                  {/* Resolution notes (if already resolved/rejected) */}
                  {selectedDispute.resolution_notes && !canAct && (
                    <div className={`p-4 rounded-lg border ${selectedDispute.status === 'resolved' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${selectedDispute.status === 'resolved' ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedDispute.status === 'resolved' ? 'Resolution Notes' : 'Rejection Reason'}
                      </p>
                      <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedDispute.resolution_notes}</p>
                    </div>
                  )}

                  {/* Comments */}
                  <div className="border-t border-white/10 pt-4">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">Conversation</label>
                    <div className="space-y-2.5 mb-4 max-h-[240px] overflow-y-auto pr-1">
                      {loadingComments ? (
                        <div className="text-center py-6 text-white/40 text-sm">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />Loading...
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="text-white/40 text-sm text-center py-5 bg-white/[0.02] rounded-lg border border-white/[0.07]">
                          No messages yet.{canAct ? ' Add a comment below.' : ''}
                        </div>
                      ) : (
                        comments.map(c => {
                          const isMe = c.user_id === user?.id;
                          return (
                            <div key={c.id} className={`p-3 rounded-lg border ${isMe ? 'bg-red-500/8 border-red-500/20 ml-6' : 'bg-white/[0.03] border-white/[0.07] mr-6'}`}>
                              <div className="flex items-baseline justify-between mb-1.5 gap-2">
                                <span className="text-xs font-semibold text-white">{isMe ? 'You (Organizer)' : c.user_name}</span>
                                <span className="text-xs text-white/30 shrink-0">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                              </div>
                              {c.comment?.trim() && <p className="text-sm text-white/75 whitespace-pre-wrap">{c.comment}</p>}
                              {c.attachment_url && (
                                <img src={c.attachment_url} alt="Attachment" className="mt-2 max-w-full max-h-48 rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setViewingImage(c.attachment_url)} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Comment composer */}
                    {canAct && (
                      <div className="space-y-2">
                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment, request info, or communicate with the player..."
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[80px] text-sm"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/15 rounded-lg cursor-pointer hover:bg-white/10 transition-colors text-white/60 text-xs">
                            <ImageIcon className="h-3.5 w-3.5" />
                            <span>{commentAttachment ? commentAttachment.name : 'Attach image'}</span>
                            {commentAttachment && (
                              <button type="button" onClick={(e) => { e.preventDefault(); setCommentAttachment(null); }} className="text-white/40 hover:text-white ml-1">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) { toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' }); return; }
                              if (!file.type.startsWith('image/')) { toast({ title: 'Images only', variant: 'destructive' }); return; }
                              setCommentAttachment(file);
                            }} />
                          </label>
                          <Button size="sm" onClick={handleAddComment}
                            disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment)}
                            className="bg-red-600 hover:bg-red-700 text-white">
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            {uploadingAttachment ? 'Uploading...' : submittingComment ? 'Sending...' : 'Send'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {!canAct && (
                      <div className="text-white/40 text-xs text-center py-3 bg-white/[0.02] rounded-lg border border-white/[0.07]">
                        This dispute is {selectedDispute.status}. No further comments can be added.
                      </div>
                    )}
                  </div>

                  {/* Resolution panel */}
                  {canAct && (
                    <div className="border-t border-white/10 pt-4">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 block">Resolution</label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Add resolution notes (optional but recommended)..."
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[90px] text-sm mb-3"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleResolve('resolved')}
                          disabled={resolving}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Resolve
                        </Button>
                        <Button
                          onClick={() => handleResolve('rejected')}
                          disabled={resolving}
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600/10 flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
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
            <button onClick={() => setViewingImage(null)} className="absolute top-2 right-2 z-10 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white">
              <X className="w-5 h-5" />
            </button>
            {viewingImage && (
              <img src={viewingImage} alt="Full size" className="max-w-full max-h-[88vh] object-contain rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerDisputesPage;
