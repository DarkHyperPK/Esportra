import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
              const tournament = await apiClient.get<{ name?: string }>(`/api/tournaments/${d.tournament_id}`);
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

  // SignalR subscription for dispute comment events (replaces Supabase realtime)
  useEffect(() => {
    if (!selectedDispute) return;

    let active = true;

    const handleDisputeEvent = () => {
      if (!active) return;
      fetchComments(selectedDispute.id);
    };

    conn.on('DisputeResolved', handleDisputeEvent);
    conn.on('ReportDisputed', handleDisputeEvent);

    return () => {
      active = false;
      conn.off('DisputeResolved', handleDisputeEvent);
      conn.off('ReportDisputed', handleDisputeEvent);
    };
  }, [selectedDispute, fetchComments, conn]);

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
    <div className="min-h-screen bg-[#0a0a0f] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <Card className="bg-[#12121a] border border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-2xl flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-red-400" />
              Admin Dispute Center
            </CardTitle>
          </CardHeader>
        <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/5">
                <TabsTrigger value="all" className="text-white data-[state=active]:bg-red-600">
                  All Disputes ({disputes.length})
                </TabsTrigger>
                <TabsTrigger value="tournament" className="text-white data-[state=active]:bg-red-600">
                  Tournament ({disputes.filter(d => d.tournament_id !== null).length})
                </TabsTrigger>
                <TabsTrigger value="general" className="text-white data-[state=active]:bg-red-600">
                  General Support ({disputes.filter(d => d.tournament_id === null).length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
          {loading ? (
                  <div className="text-white/70 text-center py-8">Loading disputes...</div>
                ) : filteredDisputes.length === 0 ? (
                  <div className="text-white/50 text-center py-8">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No disputes found</p>
                  </div>
          ) : (
            <div className="space-y-3">
                    {filteredDisputes.map((d) => {
                      const StatusIcon = statusMeta[d.status].icon;
                      return (
                        <Card
                          key={d.id}
                          className={`bg-white/5 border cursor-pointer transition ${
                            selectedDispute?.id === d.id
                              ? 'border-red-500/50 bg-white/10'
                              : 'border-white/10 hover:border-white/20'
                          }`}
                          onClick={() => {
                            setSelectedDispute(d);
                            setResolutionNotes(d.resolution_notes || '');
                            setResolutionStatus(d.status === 'rejected' ? 'rejected' : 'resolved');
                            fetchComments(d.id);
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-white font-semibold">{d.title}</h3>
                                  <Badge className={statusMeta[d.status].className}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {statusMeta[d.status].label}
                                  </Badge>
                                </div>
                                <p className="text-white/70 text-sm mb-2 line-clamp-2">
                                  {d.description || 'No description'}
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs text-white/50">
                                  <span>By: {d.raised_by_name}</span>
                                  <span>•</span>
                                  <span>{d.tournament_name}</span>
                                  {d.dispute_reason && (
                                    <>
                                      <span>•</span>
                                      <span>{DISPUTE_REASON_LABELS[d.dispute_reason] || d.dispute_reason}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                                </div>
                  </div>
                </div>
                          </CardContent>
                        </Card>
                      );
                    })}
            </div>
          )}
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

        {selectedDispute && (
          <Card className="bg-[#12121a] border border-white/10 mt-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-red-400" />
                {selectedDispute.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dispute Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-white/70 text-sm mb-1 block">Description</label>
                  <p className="text-white text-sm bg-white/5 p-3 rounded-lg border border-white/10">
                    {selectedDispute.description || 'No description provided'}
                  </p>
                </div>
                {selectedDispute.evidence_url && (
                  <div>
                    <label className="text-white/70 text-sm mb-1 block flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Evidence
                    </label>
                    <div className="mt-2">
                      <img
                        src={selectedDispute.evidence_url}
                        alt="Dispute evidence"
                        className="max-w-full max-h-96 rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition"
                        onClick={() => setViewingImage(selectedDispute.evidence_url || null)}
                        onError={(e) => {
                          console.error('Failed to load evidence image:', selectedDispute.evidence_url);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="text-red-400 text-sm">Failed to load image.</span>`;
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Comments Section - Always show history, but only allow new comments for open/in_review */}
              {selectedDispute && (
                <div className="border-t border-white/10 pt-4">
                  <label className="text-white text-sm font-semibold mb-3 block">Conversation</label>
                
                  {/* Comments List - Show for all statuses */}
                  <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2">
                    {loadingComments ? (
                      <div className="text-center text-white/50 text-sm py-4">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                        Loading comments...
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-white/50 text-sm text-center py-4 bg-white/5 rounded-lg border border-white/10">
                        No comments yet. {selectedDispute.status === 'open' || selectedDispute.status === 'in_review' ? 'Start the conversation below.' : 'This dispute has been closed.'}
                      </div>
                    ) : (
                      comments.map((comment) => {
                        const isAdmin = comment.user_id === user?.id;
                        return (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-lg border ${
                              isAdmin
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-white/5 border-white/10'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-semibold text-white">
                                {isAdmin ? 'Admin' : 'User'}: {comment.user_name}
                              </span>
                              <span className="text-xs text-white/50">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            {comment.comment && comment.comment.trim() && (
                              <p className="text-sm text-white/90 whitespace-pre-wrap mb-2">{comment.comment}</p>
                            )}
                            {comment.attachment_url && (
                              <div className="mt-2">
                                <img
                                  src={comment.attachment_url}
                                  alt="Comment attachment"
                                  className="max-w-full max-h-64 rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition"
                                  onClick={() => setViewingImage(comment.attachment_url || null)}
                                  onError={(e) => {
                                    console.error('Failed to load comment image:', comment.attachment_url);
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<span class="text-red-400 text-sm">Failed to load image.</span>`;
                                    }
                                  }}
                                  onLoad={() => {
                                    console.log('Successfully loaded comment image:', comment.attachment_url);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Comment - Only show for open/in_review disputes */}
                  {(selectedDispute.status === 'open' || selectedDispute.status === 'in_review') && (
                    <>
                      {isSuperAdmin && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                          <p className="text-yellow-300 text-sm">
                            <strong>View-Only Mode:</strong> As a super admin, you can view all disputes and comments for oversight, but only moderators and ops admins can actively handle disputes (add comments, resolve, reject).
                          </p>
                        </div>
                      )}
                      {canHandleDisputes && (
                        <div className="space-y-2">
                          <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment or ask a question..."
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[80px]"
                            disabled={isSuperAdmin}
                          />
                        
                          {/* File Upload */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                              <ImageIcon className="h-4 w-4" />
                              <span>Attach image (optional)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 5 * 1024 * 1024) {
                                      toast({
                                        title: 'File too large',
                                        description: 'Image must be less than 5MB',
                                        variant: 'destructive',
                                      });
                                      return;
                                    }
                                    if (!file.type.startsWith('image/')) {
                                      toast({
                                        title: 'Invalid file',
                                        description: 'Please upload an image file',
                                        variant: 'destructive',
                                      });
                                      return;
                                    }
                                    setCommentAttachment(file);
                                  }
                                }}
                              />
                            </label>
                            {commentAttachment && (
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <span>{commentAttachment.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCommentAttachment(null)}
                                  className="text-red-400 hover:text-red-300 h-auto p-1"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => handleAddComment(selectedDispute.id)}
                            disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment) || isSuperAdmin}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {submittingComment || uploadingAttachment ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                {uploadingAttachment ? 'Uploading...' : 'Posting...'}
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Add Comment
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Show message for resolved/rejected disputes */}
                  {(selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && (
                    <div className="text-white/50 text-sm text-center py-3 bg-white/5 rounded-lg border border-white/10">
                      This dispute has been {selectedDispute.status === 'resolved' ? 'resolved' : 'rejected'}. No further comments can be added.
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Section - Only show for open/in_review disputes */}
              {canHandleDisputes && selectedDispute && (selectedDispute.status === 'open' || selectedDispute.status === 'in_review') && (
                <div className="border-t border-white/10 pt-4">
                  <label className="text-white text-sm font-semibold mb-2 block">Resolution</label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-white/70 text-sm">Resolution Notes</label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Enter resolution notes..."
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[120px]"
                        disabled={isSuperAdmin}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          setResolutionStatus('resolved');
                          resolve();
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white flex-1"
                        disabled={isSuperAdmin}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                      <Button
                        onClick={() => {
                          setResolutionStatus('rejected');
                          resolve();
                        }}
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-600/10 flex-1"
                        disabled={isSuperAdmin}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedDispute(null);
                          setComments([]);
                          setCommentText('');
                          setCommentAttachment(null);
                        }}
                        variant="ghost"
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
            </div>
          )}
          </CardContent>
        </Card>
      )}
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
                  console.error('Failed to load full size image:', viewingImage);
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
