import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MessageSquare, AlertCircle, CheckCircle, XCircle, Clock, Image as ImageIcon, RefreshCw, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';

type Dispute = {
  id: string;
  tournament_id: string | null;
  title: string;
  description: string | null;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
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
  in_review: { label: 'In Review', className: 'bg-blue-500/15 text-blue-300 border-blue-500/40', icon: MessageSquare },
  resolved: { label: 'Resolved', className: 'bg-green-500/15 text-green-300 border-green-500/40', icon: CheckCircle },
  rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-300 border-red-500/40', icon: XCircle },
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

      // Update dispute: set to in_review if currently open, and update updated_at
      const updateData: { updated_at: string; status?: string } = {
        updated_at: new Date().toISOString(),
      };
      
      // Auto-set to in_review if currently open
      if (disputeData?.status === 'open') {
        updateData.status = 'in_review';
      }

      await apiClient.put(`/api/admin/disputes/${disputeId}`, updateData);

      setCommentText('');
      setCommentAttachment(null);
      
      // Refresh comments and disputes
      await fetchComments(disputeId);
      await load();
      
      toast({
        title: 'Comment added',
        description: disputeData?.status === 'open' 
          ? 'Your comment has been posted and dispute marked as in review.'
          : 'Your comment has been posted.',
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

  const filteredDisputes = activeTab === 'all'
    ? disputes
    : activeTab === 'tournament'
      ? disputes.filter(d => d.tournament_id !== null)
      : disputes.filter(d => d.tournament_id === null);

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-6 px-4">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-6 w-6 text-red-400" />
          <h1 className="text-white text-2xl font-semibold">Admin Dispute Center</h1>
        </div>

        {/* 3-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_380px] gap-4 h-[calc(100vh-140px)]">

          {/* ── Panel 1: Dispute List ─────────────────────────────────── */}
          <div className="bg-[#12121a] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'tournament' | 'general')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/5 h-8">
                  <TabsTrigger value="all" className="text-white text-xs data-[state=active]:bg-red-600">
                    All ({disputes.length})
                  </TabsTrigger>
                  <TabsTrigger value="tournament" className="text-white text-xs data-[state=active]:bg-red-600">
                    Tournament ({disputes.filter(d => d.tournament_id !== null).length})
                  </TabsTrigger>
                  <TabsTrigger value="general" className="text-white text-xs data-[state=active]:bg-red-600">
                    General ({disputes.filter(d => d.tournament_id === null).length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loading ? (
                <div className="text-white/70 text-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                  Loading...
                </div>
              ) : filteredDisputes.length === 0 ? (
                <div className="text-white/50 text-center py-8">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No disputes found</p>
                </div>
              ) : (
                filteredDisputes.map((d) => {
                  const StatusIcon = statusMeta[d.status].icon;
                  return (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDispute(d);
                        setResolutionNotes(d.resolution_notes || '');
                        setResolutionStatus(d.status === 'rejected' ? 'rejected' : 'resolved');
                        fetchComments(d.id);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition ${
                        selectedDispute?.id === d.id
                          ? 'border-red-500/50 bg-red-500/10'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white text-sm font-medium truncate flex-1">{d.title}</h3>
                        <Badge className={`${statusMeta[d.status].className} text-[10px] px-1.5 py-0`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {statusMeta[d.status].label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                        <span>{d.raised_by_name}</span>
                        <span>•</span>
                        <span className="truncate">{d.tournament_name}</span>
                      </div>
                      <div className="text-[11px] text-white/30 mt-0.5">
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Panel 2: Evidence & Info ──────────────────────────────── */}
          <div className="bg-[#12121a] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            {selectedDispute ? (
              <>
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-white text-lg font-semibold flex-1">{selectedDispute.title}</h2>
                    <Badge className={statusMeta[selectedDispute.status].className}>
                      {statusMeta[selectedDispute.status].label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                    <span>By: <strong className="text-white/70">{selectedDispute.raised_by_name}</strong></span>
                    <span>•</span>
                    <span>{selectedDispute.tournament_name}</span>
                    {selectedDispute.dispute_reason && (
                      <>
                        <span>•</span>
                        <span className="text-rose-400">{DISPUTE_REASON_LABELS[selectedDispute.dispute_reason] || selectedDispute.dispute_reason}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(selectedDispute.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Description */}
                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Description</label>
                    <p className="text-white/90 text-sm bg-white/5 p-3 rounded-xl border border-white/10 leading-relaxed">
                      {selectedDispute.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Evidence */}
                  {selectedDispute.evidence_url && (
                    <div>
                      <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Evidence
                      </label>
                      <img
                        src={selectedDispute.evidence_url}
                        alt="Dispute evidence"
                        className="max-w-full max-h-80 rounded-xl border border-white/20 cursor-pointer hover:opacity-80 transition"
                        onClick={() => setViewingImage(selectedDispute.evidence_url || null)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="text-red-400 text-sm">Failed to load image.</span>`;
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Resolution Section */}
                  {canHandleDisputes && (selectedDispute.status === 'open' || selectedDispute.status === 'in_review') && (
                    <div className="border-t border-white/10 pt-4">
                      <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Resolution</label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Enter resolution notes..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px] rounded-xl mb-3"
                        disabled={isSuperAdmin}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => { setResolutionStatus('resolved'); resolve(); }}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          disabled={isSuperAdmin}
                        >
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          Resolve
                        </Button>
                        <Button
                          onClick={() => { setResolutionStatus('rejected'); resolve(); }}
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600/10 flex-1"
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
                    <div className="border-t border-white/10 pt-4">
                      <label className="text-white/50 text-xs uppercase tracking-wider mb-1.5 block">Resolution Notes</label>
                      <p className="text-white/80 text-sm bg-white/5 p-3 rounded-xl border border-white/10">
                        {selectedDispute.resolution_notes}
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30">
                <div className="text-center">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a dispute to view details</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Panel 3: Conversation ─────────────────────────────────── */}
          <div className="bg-[#12121a] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-white/50" />
                Conversation
                {comments.length > 0 && (
                  <span className="text-[11px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded-full">{comments.length}</span>
                )}
              </h3>
            </div>

            {selectedDispute ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {loadingComments ? (
                    <div className="text-center text-white/50 text-sm py-8">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading...
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-white/30 text-sm text-center py-8">
                      No messages yet
                    </div>
                  ) : (
                    comments.map((comment) => {
                      const isAdmin = comment.user_id === user?.id;
                      return (
                        <div
                          key={comment.id}
                          className={`p-2.5 rounded-xl border ${
                            isAdmin
                              ? 'bg-red-500/10 border-red-500/20 ml-4'
                              : 'bg-white/5 border-white/5 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[11px] font-medium ${isAdmin ? 'text-red-400' : 'text-white/60'}`}>
                              {comment.user_name}
                            </span>
                            <span className="text-[10px] text-white/30">
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
                              className="max-w-full max-h-40 rounded-lg border border-white/10 mt-1.5 cursor-pointer hover:opacity-80 transition"
                              onClick={() => setViewingImage(comment.attachment_url || null)}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input Area */}
                {(selectedDispute.status === 'open' || selectedDispute.status === 'in_review') ? (
                  canHandleDisputes ? (
                    <div className="p-3 border-t border-white/10 space-y-2">
                      {isSuperAdmin && (
                        <p className="text-yellow-400/70 text-[11px]">View-only: moderators/ops handle disputes</p>
                      )}
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Type a message..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[60px] max-h-[120px] rounded-xl text-sm resize-none"
                        disabled={isSuperAdmin}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer text-white/40 hover:text-white/60 transition">
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
                          {commentAttachment && (
                            <div className="flex items-center gap-1 text-[11px] text-white/50">
                              <span className="truncate max-w-[120px]">{commentAttachment.name}</span>
                              <button onClick={() => setCommentAttachment(null)} className="text-red-400 hover:text-red-300">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddComment(selectedDispute.id)}
                          disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment) || isSuperAdmin}
                          className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-xs"
                        >
                          {submittingComment ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Send'}
                        </Button>
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="p-3 border-t border-white/10">
                    <p className="text-white/30 text-xs text-center">
                      Dispute {selectedDispute.status === 'resolved' ? 'resolved' : 'rejected'} — closed
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30">
                <p className="text-sm">No dispute selected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
        <DialogContent className="bg-[#12121a] border border-white/10 max-w-5xl max-h-[90vh] p-0">
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
