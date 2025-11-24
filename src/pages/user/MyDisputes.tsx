import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, ExternalLink, Send, Image as ImageIcon, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Dispute {
  id: string;
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
  'scheduling': 'Scheduling / No-Show',
  'technical_issue': 'Technical Issue / Server Problems',
  'rule_violation': 'Tournament Rule Violation',
  'ban_appeal': 'Ban Appeal',
  'general_support': 'General Support',
  'other': 'Other',
};

const MyDisputes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
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
      
      // Fetch all disputes raised by the user
      const { data: disputesData, error: disputesError } = await supabase
        .from('tournament_disputes')
        .select(`
          id,
          title,
          description,
          status,
          resolution_notes,
          dispute_reason,
          created_at,
          updated_at,
          tournament_id,
          match_id,
          evidence_url
        `)
        .eq('raised_by_user_id', user.id)
        .order('created_at', { ascending: false });

      if (disputesError) {
        console.error('Supabase error fetching disputes:', disputesError);
        console.error('Error code:', disputesError.code);
        console.error('Error message:', disputesError.message);
        console.error('Error details:', disputesError.details);
        throw disputesError;
      }

      // Fetch tournament names for each dispute (filter out NULL tournament_ids for general support)
      const tournamentIds = Array.from(new Set((disputesData || []).map(d => d.tournament_id).filter(Boolean)));
      
      let tournamentsMap = new Map<string, { name: string; slug: string }>();
      if (tournamentIds.length > 0) {
        const { data: tournamentsData, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('id, name, slug')
          .in('id', tournamentIds);

        if (!tournamentsError && tournamentsData) {
          tournamentsData.forEach((t: any) => {
            tournamentsMap.set(t.id, { name: t.name, slug: t.slug });
          });
        }
      }

      // Combine disputes with tournament names
      const disputesWithTournaments: Dispute[] = (disputesData || []).map((d: any) => {
        // General support disputes have NULL tournament_id
        if (!d.tournament_id) {
          return {
            ...d,
            tournament_name: 'General Support',
            tournament_slug: null,
          };
        }
        
        const tournament = tournamentsMap.get(d.tournament_id);
        return {
          ...d,
          tournament_name: tournament?.name || 'Unknown Tournament',
          tournament_slug: tournament?.slug || null,
        };
      });

      setDisputes(disputesWithTournaments);
    } catch (error: unknown) {
      console.error('Error fetching disputes:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any)?.message || JSON.stringify(error);
      const errorCode = (error as any)?.code || 'UNKNOWN';
      console.error('Dispute fetch error details:', { errorMessage, errorCode, error });
      toast({
        title: 'Error',
        description: `Failed to load disputes: ${errorMessage}`,
        variant: 'destructive',
      });
      setDisputes([]); // Set empty array on error
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
      const { data, error } = await supabase
        .from('dispute_comments')
        .select(`
          id,
          user_id,
          comment,
          is_internal,
          created_at,
          attachment_url
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error fetching comments:', error);
        console.error('Error code:', (error as any)?.code);
        console.error('Error message:', (error as any)?.message);
        console.error('Error details:', (error as any)?.details);
        throw error;
      }

      // Fetch profile data for each unique user_id
      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const profileMap = new Map<string, { full_name?: string; username?: string }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .in('id', userIds);
        
        (profiles || []).forEach((profile) => {
          profileMap.set(profile.id, {
            full_name: profile.full_name,
            username: profile.username,
          });
        });
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
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any)?.message || JSON.stringify(error);
      const errorCode = (error as any)?.code || 'UNKNOWN';
      console.error('Comment fetch error details:', { errorMessage, errorCode, error });
      toast({
        title: 'Error',
        description: `Failed to load comments: ${errorMessage}`,
        variant: 'destructive',
      });
      setComments([]); // Set empty array on error to prevent UI issues
    } finally {
      setLoadingComments(false);
    }
  }, [user?.id, toast]);

  const handleAddComment = async (disputeId: string) => {
    if (!user?.id || (!commentText.trim() && !commentAttachment)) return;

    try {
      setSubmittingComment(true);
      
      // Check current dispute status
      const { data: disputeData } = await supabase
        .from('tournament_disputes')
        .select('status')
        .eq('id', disputeId)
        .single();

      // Upload attachment if provided
      let attachmentUrl: string | null = null;
      if (commentAttachment) {
        setUploadingAttachment(true);
        
        // Get dispute reason for categorization
        const { data: disputeInfo } = await supabase
          .from('tournament_disputes')
          .select('dispute_reason, tournament_id')
          .eq('id', disputeId)
          .single();
        
        const disputeReason = disputeInfo?.dispute_reason || 'general';
        const fileExt = commentAttachment.name.split('.').pop();
        
        // Path structure: {dispute_id}/{dispute_reason}/{user_id}-{timestamp}.{ext}
        // For general support: {dispute_id}/general_support/{user_id}-{timestamp}.{ext}
        const fileName = disputeInfo?.tournament_id
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

      const { error: insertError } = await supabase
        .from('dispute_comments')
        .insert({
          dispute_id: disputeId,
          user_id: user.id,
          comment: commentText.trim() || '', // Empty string if no text (comment column is NOT NULL)
          is_internal: false,
          attachment_url: attachmentUrl,
        });

      if (insertError) throw insertError;

      // Update dispute: set to in_review if currently open, and update updated_at
      const updateData: { updated_at: string; status?: string } = {
        updated_at: new Date().toISOString(),
      };
      
      // Auto-set to in_review if currently open
      if (disputeData?.status === 'open') {
        updateData.status = 'in_review';
      }

      const { error: updateError } = await supabase
        .from('tournament_disputes')
        .update(updateData)
        .eq('id', disputeId);

      if (updateError) throw updateError;

      setCommentText('');
      setCommentAttachment(null);
      fetchComments(disputeId);
      fetchDisputes();
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted.',
      });
    } catch (error: unknown) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add comment',
        variant: 'destructive',
      });
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

  // Set up real-time subscription for dispute updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user_disputes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_disputes',
          filter: `raised_by_user_id=eq.${user.id}`,
        },
        () => {
          // Refetch disputes when there's an update
          fetchDisputes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchDisputes]);

  const filteredDisputes = activeTab === 'all' 
    ? disputes 
    : disputes.filter(d => d.status === activeTab);

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
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-red-400" />
              My Disputes
            </h1>
            <p className="text-white/70">View and track all your submitted disputes across all tournaments</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="bg-[#12121a] border border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{stats.all}</p>
                  <p className="text-xs text-white/60 mt-1">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#12121a] border border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-300">{stats.open}</p>
                  <p className="text-xs text-white/60 mt-1">Open</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#12121a] border border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-300">{stats.in_review}</p>
                  <p className="text-xs text-white/60 mt-1">In Review</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#12121a] border border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-300">{stats.resolved}</p>
                  <p className="text-xs text-white/60 mt-1">Resolved</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#12121a] border border-white/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-300">{stats.rejected}</p>
                  <p className="text-xs text-white/60 mt-1">Rejected</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-[#12121a] border border-white/10">
              <TabsTrigger value="all" className="text-white/70 data-[state=active]:text-white">
                All ({stats.all})
              </TabsTrigger>
              <TabsTrigger value="open" className="text-white/70 data-[state=active]:text-white">
                Open ({stats.open})
              </TabsTrigger>
              <TabsTrigger value="in_review" className="text-white/70 data-[state=active]:text-white">
                In Review ({stats.in_review})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="text-white/70 data-[state=active]:text-white">
                Resolved ({stats.resolved})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-white/70 data-[state=active]:text-white">
                Rejected ({stats.rejected})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredDisputes.length === 0 ? (
                <Card className="bg-[#12121a] border border-white/10">
                  <CardContent className="pt-12 pb-12 text-center">
                    <AlertCircle className="h-12 w-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/70 text-lg mb-2">
                      {activeTab === 'all' 
                        ? 'No disputes found' 
                        : `No ${activeTab.replace('_', ' ')} disputes`}
                    </p>
                    <p className="text-white/50 text-sm mb-6">
                      {activeTab === 'all' 
                        ? "You haven't submitted any disputes yet. Use the 'Raise a Dispute' option from the menu to submit one."
                        : `You don't have any disputes with status "${activeTab.replace('_', ' ')}"`}
                    </p>
                    <Button
                      onClick={() => navigate('/user/raise-dispute')}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Raise a Dispute
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredDisputes.map((dispute) => {
                    const meta = statusMeta[dispute.status];
                    const Icon = meta.icon;
                    const reasonLabel = dispute.dispute_reason 
                      ? DISPUTE_REASON_LABELS[dispute.dispute_reason] || dispute.dispute_reason
                      : null;

                    return (
                      <Card key={dispute.id} className="bg-[#12121a] border border-white/10 hover:border-white/20 transition cursor-pointer" onClick={() => openDisputeDialog(dispute)}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <CardTitle className="text-white text-lg">{dispute.title}</CardTitle>
                                <Badge className={`${meta.className} flex items-center gap-1 border`}>
                                  <Icon className="w-3 h-3" />
                                  {meta.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-white/60 mb-2">
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {dispute.tournament_name}
                                </span>
                                {reasonLabel && (
                                  <span className="text-white/50">• {reasonLabel}</span>
                                )}
                              </div>
                              <p className="text-sm text-white/70 line-clamp-2">{dispute.description}</p>
                            </div>
                            {dispute.tournament_slug && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/tournaments/${dispute.tournament_slug}`)}
                                className="text-white/70 hover:text-white hover:bg-white/10"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-xs text-white/50">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Created {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                              </span>
                              <span className="flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                Updated {formatDistanceToNow(new Date(dispute.updated_at), { addSuffix: true })}
                              </span>
                            </div>

                            {dispute.evidence_url && (
                              <div className="pt-2 border-t border-white/10">
                                <a
                                  href={dispute.evidence_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  View Evidence
                                </a>
                              </div>
                            )}

                            {dispute.resolution_notes && dispute.status !== 'open' && (
                              <div className="pt-3 border-t border-white/10">
                                <div className="rounded-lg bg-white/5 border border-white/10 p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare className="w-4 h-4 text-white/70" />
                                    <p className="text-sm font-semibold text-white">
                                      {dispute.status === 'resolved' ? 'Resolution' : 'Response'} from {dispute.status === 'resolved' ? 'Organizer/Admin' : 'Organizer/Admin'}
                                    </p>
                                  </div>
                                  <p className="text-sm text-white/80 whitespace-pre-wrap">{dispute.resolution_notes}</p>
                                  <p className="text-xs text-white/50 mt-2">
                                    {dispute.status === 'resolved' 
                                      ? 'This dispute has been resolved.'
                                      : 'This dispute has been rejected.'}
                                  </p>
                                </div>
                              </div>
                            )}

                            {dispute.status === 'open' && (
                              <div className="pt-2 border-t border-white/10">
                                <p className="text-xs text-white/50">
                                  Your dispute is awaiting review. You'll be notified when there's an update.
                                </p>
                              </div>
                            )}

                            {dispute.status === 'in_review' && (
                              <div className="pt-2 border-t border-white/10">
                                <p className="text-xs text-white/50">
                                  Your dispute is currently being reviewed. You'll be notified when a decision is made.
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Dispute Detail Dialog */}
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
              <DialogHeader>
                <DialogTitle className="text-white">{selectedDispute?.title}</DialogTitle>
                <DialogDescription className="text-white/70">
                  {selectedDispute?.tournament_name}
                </DialogDescription>
              </DialogHeader>

              {selectedDispute && (
                <div className="space-y-4">
                  {/* Dispute Details */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold text-white mb-2 block">Description</label>
                      <div className="p-3 bg-white/5 rounded-lg text-white/80 text-sm">
                        {selectedDispute.description || 'No description provided.'}
                      </div>
                    </div>

                    {selectedDispute.evidence_url && (
                      <div>
                        <label className="text-sm font-semibold text-white mb-2 block">Evidence</label>
                        <div className="mt-2">
                          <img
                            src={selectedDispute.evidence_url}
                            alt="Dispute evidence"
                            className="max-w-full max-h-64 rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
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

                    {selectedDispute.resolution_notes && (selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && (
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-4 h-4 text-white/70" />
                          <p className="text-sm font-semibold text-white">
                            {selectedDispute.status === 'resolved' ? 'Resolution' : 'Rejection'} Notes
                          </p>
                        </div>
                        <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedDispute.resolution_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Comments Section - Always show history, but only allow new comments for open/in_review */}
                  <div className="border-t border-white/10 pt-4">
                    <label className="text-sm font-semibold text-white mb-3 block">Conversation</label>
                    
                    {/* Comments List - Show for all statuses */}
                    <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                      {loadingComments ? (
                        <div className="text-center text-white/50 text-sm py-4">
                          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                          Loading comments...
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="text-white/50 text-sm text-center py-4 bg-white/5 rounded-lg">
                          No comments yet. {selectedDispute.status === 'open' || selectedDispute.status === 'in_review' ? 'Start the conversation below.' : 'This dispute has been closed.'}
                        </div>
                      ) : (
                        comments.map((comment) => {
                          const isUser = comment.user_id === user?.id;
                          return (
                            <div
                              key={comment.id}
                              className={`p-3 rounded-lg border ${
                                isUser
                                  ? 'bg-blue-500/10 border-blue-500/30'
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-1">
                                <span className="text-xs font-semibold text-white">
                                  {isUser ? 'You' : 'Organizer'}: {comment.user_name}
                                </span>
                                <span className="text-xs text-white/50">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              {comment.comment && comment.comment.trim() && (
                                <p className="text-sm text-white/80 whitespace-pre-wrap mb-2">{comment.comment}</p>
                              )}
                              {comment.attachment_url && (
                                <div className="mt-2">
                                  <img
                                    src={comment.attachment_url}
                                    alt="Comment attachment"
                                    className="max-w-full max-h-64 rounded-lg border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
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
                    {(selectedDispute.status === 'in_review' || selectedDispute.status === 'open') && (
                      <div className="space-y-2">
                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Add a comment or respond to the organizer..."
                          className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[80px]"
                        />
                        
                        {/* File Upload */}
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 transition-colors text-white/80 text-sm">
                            <ImageIcon className="h-4 w-4" />
                            <span>Attach image (optional)</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
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
                                      title: 'Invalid file type',
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
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/20 rounded-lg">
                              <span className="text-white text-sm">{commentAttachment.name}</span>
                              <button
                                type="button"
                                onClick={() => setCommentAttachment(null)}
                                className="text-white/60 hover:text-white transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => handleAddComment(selectedDispute.id)}
                          disabled={submittingComment || uploadingAttachment || (!commentText.trim() && !commentAttachment)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {submittingComment || uploadingAttachment ? (
                            <>
                              {uploadingAttachment ? 'Uploading...' : 'Posting...'}
                            </>
                          ) : (
                            'Post Comment'
                          )}
                        </Button>
                      </div>
                    )}
                    
                    {/* Show message for resolved/rejected disputes */}
                    {(selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && (
                      <div className="text-white/50 text-sm text-center py-3 bg-white/5 rounded-lg border border-white/10">
                        This dispute has been {selectedDispute.status === 'resolved' ? 'resolved' : 'rejected'}. No further comments can be added.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

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
      </div>
    </PageTransition>
  );
};

export default MyDisputes;

