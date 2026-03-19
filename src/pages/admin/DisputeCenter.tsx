import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Clock, Image as ImageIcon, RefreshCw, X, Search, Send, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

type Dispute = {
  id: string;
  reference_number?: string | null;
  tournament_id: string | null;
  title: string;
  description: string | null;
  status: 'open' | 'resolved' | 'rejected';
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

const statusMeta: Record<Dispute['status'], { label: string; className: string; icon: React.ElementType }> = {
  open: { label: 'Open', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40', icon: Clock },
  resolved: { label: 'Closed', className: 'bg-green-500/15 text-green-300 border-green-500/40', icon: CheckCircle },
  rejected: { label: 'Closed', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle },
};

const DisputeCenter: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { roles } = useAdmin();
  const conn = useHub(HubPaths.Match);
  const isSuperAdmin = roles.includes('super_admin');
  const canHandleDisputes = roles.includes('moderator') || roles.includes('ops_admin');
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

  const load = async () => {
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

      setDisputes(enriched);
    } catch (e: any) {
      console.error('Load disputes failed:', e);
      toast({ title: 'Failed to load disputes', description: e?.message || '', variant: 'destructive' });
    } finally {
    setLoading(false);
    }
  };

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
  }, []);

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
        const fileExt = commentAttachment.name.split('.').pop();
        
        // Path structure: {dispute_id}/{dispute_reason}/{user_id}-{timestamp}.{ext}
        // For general support: {dispute_id}/general_support/{user_id}-{timestamp}.{ext}
        const fileName = disputeData?.tournament_id
          ? `${disputeId}/${disputeReason}/${user.id}-${Date.now()}.${fileExt}`
          : `${disputeId}/general_support/${user.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('tournaments.disputes.evidence')
          .upload(fileName, commentAttachment, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('tournaments.disputes.evidence')
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
        setUploadingAttachment(false);
      }

      await apiClient.post(`/api/admin/disputes/${disputeId}/comments`, {
        user_id: user.id,
        comment: commentText.trim() || '',
        is_internal: false,
        attachment_url: attachmentUrl,
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
        resolution_notes: resolutionNotes || null,
        updated_at: new Date().toISOString(),
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

  const leftBorderColor = (status: Dispute['status']) =>
    status === 'open' ? 'border-l-yellow-500' : status === 'resolved' ? 'border-l-green-500' : 'border-l-red-500';

  const statusDotColor = (status: Dispute['status']) =>
    status === 'open' ? 'bg-yellow-500' : status === 'resolved' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-[#050505] py-8 px-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10">
              <MessageSquare className="h-6 w-6 text-rose-500" />
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Dispute Center</h1>
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

        {/* Stats row */}
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
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_380px] gap-5 h-[calc(100vh-160px)]">

          {/* ── Panel 1: Dispute List ─────────────────────────────────── */}
          <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/[0.06] space-y-2.5">
              {/* Search */}
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
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'tournament' | 'general')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/[0.04] h-8 rounded-lg">
                  <TabsTrigger value="all" className="text-zinc-400 text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white rounded-md">
                    All ({disputes.length})
                  </TabsTrigger>
                  <TabsTrigger value="tournament" className="text-zinc-400 text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white rounded-md">
                    Tournament ({disputes.filter(d => d.tournament_id !== null).length})
                  </TabsTrigger>
                  <TabsTrigger value="general" className="text-zinc-400 text-xs data-[state=active]:bg-rose-600 data-[state=active]:text-white rounded-md">
                    General ({disputes.filter(d => d.tournament_id === null).length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="text-zinc-400 text-center py-12">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-500" />
                  <span className="text-sm">Loading disputes...</span>
                </div>
              ) : filteredDisputes.length === 0 ? (
                <div className="text-zinc-500 text-center py-12">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No disputes found</p>
                  {searchQuery && <p className="text-xs text-zinc-600 mt-1">Try a different search term</p>}
                </div>
              ) : (
                filteredDisputes.map((d) => {
                  const StatusIcon = statusMeta[d.status].icon;
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
                        <Badge className={`${statusMeta[d.status].className} text-[10px] px-1.5 py-0 gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor(d.status)} inline-block`} />
                          {statusMeta[d.status].label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <span>{d.raised_by_name}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="truncate">{d.tournament_name}</span>
                      </div>
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
          <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
            {selectedDispute ? (
              <motion.div
                key={selectedDispute.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1">
                    {selectedDispute.reference_number && (
                      <span className="text-rose-400/70 font-mono text-sm shrink-0">{selectedDispute.reference_number}</span>
                    )}
                    <h2 className="text-white text-lg font-semibold flex-1">{selectedDispute.title}</h2>
                    <Badge className={statusMeta[selectedDispute.status].className}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor(selectedDispute.status)} inline-block mr-1`} />
                      {statusMeta[selectedDispute.status].label}
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

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Description */}
                  <div>
                    <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block font-medium">Description</label>
                    <p className="text-white/90 text-sm bg-[#121214] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                      {selectedDispute.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Evidence */}
                  {selectedDispute.evidence_url && (
                    <div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
                      <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5 font-medium">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Evidence
                      </label>
                      <div
                        className="relative group cursor-pointer inline-block"
                        onClick={() => setViewingImage(selectedDispute.evidence_url || null)}
                      >
                        <img
                          src={selectedDispute.evidence_url}
                          alt="Dispute evidence"
                          className="max-w-full max-h-80 rounded-xl border border-white/[0.08] transition-all group-hover:brightness-75"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="text-red-400 text-sm">Failed to load image.</span>`;
                            }
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm">
                            <ZoomIn className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resolution Section */}
                  {canHandleDisputes && selectedDispute.status === 'open' && (
                    <div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
                      <label className="text-zinc-500 text-xs uppercase tracking-wider mb-2 block font-medium">Resolution</label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Enter resolution notes..."
                        className="bg-[#121214] border-white/[0.06] text-white placeholder:text-zinc-600 min-h-[100px] rounded-xl mb-3 focus:border-rose-500/40"
                        disabled={isSuperAdmin}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => { setResolutionStatus('resolved'); resolve(); }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white flex-1 transition-colors"
                          disabled={isSuperAdmin}
                        >
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          Resolve
                        </Button>
                        <Button
                          onClick={() => { setResolutionStatus('rejected'); resolve(); }}
                          className="bg-rose-600 hover:bg-rose-500 text-white flex-1 transition-colors"
                          disabled={isSuperAdmin}
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Closed dispute notice */}
                  {(selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && selectedDispute.resolution_notes && (
                    <div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
                      <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block font-medium">Resolution Notes</label>
                      <p className="text-zinc-300 text-sm bg-[#121214] p-3 rounded-xl border border-white/[0.06]">
                        {selectedDispute.resolution_notes}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="text-center border-2 border-dashed border-white/[0.06] rounded-2xl px-12 py-10">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 text-zinc-700 opacity-40" />
                  <p className="text-zinc-500 text-sm font-medium">Select a dispute to view details</p>
                  <p className="text-zinc-600 text-xs mt-1">Evidence, info, and resolution controls will appear here</p>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* ── Panel 3: Conversation ─────────────────────────────────── */}
          <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/[0.06]">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-zinc-500" />
                Conversation
                {comments.length > 0 && (
                  <span className="text-[11px] text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded-full font-medium">{comments.length}</span>
                )}
              </h3>
            </div>

            {selectedDispute ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {loadingComments ? (
                    <div className="text-center text-zinc-500 text-sm py-12">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-rose-500" />
                      Loading messages...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 text-zinc-700 opacity-20" />
                      <p className="text-zinc-600 text-sm">No messages yet</p>
                      <p className="text-zinc-700 text-xs mt-1">Start the conversation</p>
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
                            className={`max-w-[85%] p-3 ${
                              isAdmin
                                ? 'bg-rose-500/[0.15] rounded-2xl rounded-br-sm'
                                : 'bg-white/[0.06] rounded-2xl rounded-bl-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[11px] font-medium ${isAdmin ? 'text-rose-400' : 'text-zinc-400'}`}>
                                {comment.user_name}
                              </span>
                              <span className="text-[10px] text-zinc-600">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {comment.comment?.trim() && (
                              <p className="text-sm text-white/90 whitespace-pre-wrap">{comment.comment}</p>
                            )}
                            {comment.attachment_url && (
                              <img
                                src={comment.attachment_url}
                                alt="Attachment"
                                className="max-w-full max-h-40 rounded-lg border border-white/[0.06] mt-1.5 cursor-pointer hover:brightness-75 transition"
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
                    <div className="p-3 border-t border-white/[0.06] space-y-2">
                      {isSuperAdmin && (
                        <p className="text-yellow-400/70 text-[11px]">View-only: moderators/ops handle disputes</p>
                      )}
                      <div className="flex items-end gap-2">
                        <div className="flex-1 bg-[#121214] rounded-xl border border-white/[0.06] focus-within:border-rose-500/30 transition">
                          <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Type a message..."
                            className="bg-transparent border-0 text-white placeholder:text-zinc-600 min-h-[44px] max-h-[120px] rounded-xl text-sm resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            disabled={isSuperAdmin}
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
                          <Button
                            size="icon"
                            onClick={() => handleAddComment(selectedDispute.id)}
                            disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment) || isSuperAdmin}
                            className="bg-rose-600 hover:bg-rose-500 text-white h-9 w-9 rounded-full shrink-0 transition-colors"
                          >
                            {submittingComment ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="p-3 border-t border-white/[0.06]">
                    <p className="text-zinc-600 text-xs text-center">
                      Dispute {selectedDispute.status === 'resolved' ? 'resolved' : 'rejected'} — closed
                    </p>
                  </div>
                )}
              </>
            ) : (
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

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="bg-[#121214] border border-white/[0.06] max-w-5xl max-h-[90vh] p-0">
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
                alt="Full size image"
                className="max-w-full max-h-[90vh] object-contain"
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
    </div>
  );
};

export default DisputeCenter;
