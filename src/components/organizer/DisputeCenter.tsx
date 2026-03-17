import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTournamentStaff } from '@/hooks/useTournamentStaff';
import type { Database } from '@/lib/database.types';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';
import DisputeEvidencePanel, { type DisputeReport, type DisputeRiotAccount } from './DisputeEvidencePanel';

interface Dispute {
  id: string;
  tournament_id: string;
  match_id: string | null;
  raised_by_user_id: string;
  team_id: string | null;
  title: string;
  description: string | null;
  evidence_url: string | null;
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  assigned_to_user_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  raised_by_name?: string;
  team_name?: string;
  tournament_name?: string;
  assigned_to_name?: string;
  match?: {
    match_number?: number;
    round_index?: number;
    best_of?: number;
    bracket_type?: string;
    team1_score?: number;
    team2_score?: number;
    team1_name?: string;
    team2_name?: string;
    team1_id?: string;
    team2_id?: string;
  } | null;
  reports?: DisputeReport[];
  riot_accounts?: DisputeRiotAccount[];
}

interface DisputeCenterProps {
  tournamentId: string;
  organizerId: string;
  currentUserId?: string;
}

type TournamentDisputeRow = Database['public']['Tables']['tournament_disputes']['Row'];

const DisputeCenter: React.FC<DisputeCenterProps> = ({ tournamentId, organizerId, currentUserId }) => {
  const { toast } = useToast();
  const conn = useHub(HubPaths.Match);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected' | 'in_review'>('resolved');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentAttachment, setCommentAttachment] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; comment: string; created_at: string; user_name?: string; is_internal: boolean; attachment_url?: string }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const actorUserId = currentUserId ?? organizerId;
  const { staff, loading: staffLoading, hasPermission } = useTournamentStaff(tournamentId);
  const activeStaff = useMemo(
    () => staff.filter((member) => member.status === 'active'),
    [staff]
  );
  const staffOptions = useMemo(
    () =>
      activeStaff.map((member) => ({
        value: member.user_id,
        label:
          member.profiles?.full_name ||
          member.profiles?.username ||
          member.profiles?.email ||
          'Staff member',
        role: member.role,
      })),
    [activeStaff]
  );
  const assignmentOptions = useMemo(() => {
    const options = new Map<
      string,
      { value: string; label: string }
    >();
    options.set(organizerId, {
      value: organizerId,
      label: 'Lead Organizer',
    });
    staffOptions.forEach((opt) => options.set(opt.value, { value: opt.value, label: opt.label }));

    if (selectedDispute?.assigned_to_user_id && !options.has(selectedDispute.assigned_to_user_id)) {
      options.set(selectedDispute.assigned_to_user_id, {
        value: selectedDispute.assigned_to_user_id,
        label: selectedDispute.assigned_to_name || 'Assigned staff',
      });
    }

    return Array.from(options.values());
  }, [organizerId, staffOptions, selectedDispute?.assigned_to_user_id, selectedDispute?.assigned_to_name]);
  const canAssistDisputes =
    actorUserId === organizerId || hasPermission(actorUserId, 'disputes:assist');
  const canAssignOthers = actorUserId === organizerId;

  const fetchDisputes = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const disputesData = await apiClient.get<Dispute[]>(`/api/organizer/disputes?tournament_id=${tournamentId}`);

      // Backend now returns raised_by_name, team_name, reports, riot_accounts
      // Only enrich assigned_to_name if not already present
      const rows = disputesData || [];
      const enriched = await Promise.all(
        rows.map(async (dispute) => {
          const enrichedDispute: Dispute = { ...dispute };

          if (dispute.assigned_to_user_id && !dispute.assigned_to_name) {
            const assignedTo = await apiClient.get<Record<string, string>>(`/api/profiles/${dispute.assigned_to_user_id}`).catch(() => null);
            enrichedDispute.assigned_to_name = assignedTo?.username || assignedTo?.full_name || 'Unassigned';
          }

          return enrichedDispute;
        })
      );

      setDisputes(enriched);
    } catch (error: unknown) {
      console.error('Error fetching disputes:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load disputes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [tournamentId, toast]);

  const fetchComments = useCallback(async (disputeId: string) => {
    try {
      setLoadingComments(true);
      const data = await apiClient.get<any[]>(`/api/organizer/disputes/${disputeId}/comments`);

      console.log('Fetched comments data:', data);

      // Fetch profile data for each unique user_id
      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const profileMap = new Map<string, { full_name?: string; username?: string }>();

      if (userIds.length > 0) {
        const profiles = await apiClient.get<any[]>(`/api/profiles/search?ids=${userIds.join(',')}`).catch(() => []);

        (profiles || []).forEach((profile: any) => {
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

      console.log('Processed comments:', commentsWithNames);
      setComments(commentsWithNames);
    } catch (error: unknown) {
      console.error('Error fetching comments:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : (error as any)?.message || JSON.stringify(error);
      console.error('Comment fetch error details:', errorMessage);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  useEffect(() => {
    if (selectedDispute) {
      setSelectedAssigneeId(
        selectedDispute.assigned_to_user_id ||
        (canAssistDisputes ? actorUserId : organizerId)
      );
      // Fetch comments when dispute is selected
      fetchComments(selectedDispute.id);
    } else {
      setSelectedAssigneeId(null);
      setComments([]);
    }
  }, [selectedDispute, actorUserId, canAssistDisputes, organizerId, fetchComments]);

  // SignalR subscription for dispute events (replaces Supabase realtime)
  useEffect(() => {
    if (!tournamentId) return;

    let active = true;

    const handleDisputeResolved = () => {
      if (!active) return;
      fetchDisputes();
      toast({ title: 'Dispute updated', description: 'A dispute status has changed.' });
    };

    const handleReportDisputed = (payload: any) => {
      if (!active) return;
      fetchDisputes();
      toast({
        title: 'New dispute filed',
        description: payload?.title || 'A participant raised a dispute.',
      });
    };

    conn.on('DisputeResolved', handleDisputeResolved);
    conn.on('ReportDisputed', handleReportDisputed);

    return () => {
      active = false;
      conn.off('DisputeResolved', handleDisputeResolved);
      conn.off('ReportDisputed', handleReportDisputed);
    };
  }, [tournamentId, fetchDisputes, toast, conn]);

  const logDisputeAudit = async (disputeId: string, action: string, meta?: Record<string, unknown>) => {
    await auditLog.log(action as any, 'dispute', disputeId, String(meta?.title || 'Dispute'), {
      tournament_id: tournamentId,
      ...meta
    });
  };

  const handleAssignDispute = async (disputeId: string, assigneeId: string) => {
    try {
      setAssignmentLoading(true);
      await apiClient.put(`/api/organizer/disputes/${disputeId}`, {
          assigned_to_user_id: assigneeId,
          updated_at: new Date().toISOString(),
        });

      await logDisputeAudit(disputeId, 'assigned', {
        assigned_to: assigneeId,
        title: selectedDispute?.title,
      });

      toast({
        title: 'Assignment updated',
        description: 'Dispute assignment has been updated.',
      });

      fetchDisputes();
    } catch (error: unknown) {
      console.error('Error assigning dispute:', error);
      toast({
        title: 'Assignment failed',
        description: error instanceof Error ? error.message : 'Unable to update assignment',
        variant: 'destructive',
      });
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleAddComment = async (disputeId: string) => {
    if (!commentText.trim() && !commentAttachment) return;

    try {
      setSubmittingComment(true);

      // Check current dispute status
      const disputeData = await apiClient.get<any>(`/api/organizer/disputes/${disputeId}`).catch(() => null);

      // Upload attachment if provided
      let attachmentUrl: string | null = null;
      if (commentAttachment) {
        setUploadingAttachment(true);

        const disputeReason = disputeData?.dispute_reason || 'general';
        const fileExt = commentAttachment.name.split('.').pop();
        // Organized path: {dispute_id}/{dispute_reason}/{user_id}-{timestamp}.{ext}
        const fileName = `${disputeId}/${disputeReason}/${actorUserId}-${Date.now()}.${fileExt}`;

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

      await apiClient.post(`/api/organizer/disputes/${disputeId}/comments`, {
          user_id: actorUserId,
          comment: commentText.trim() || '', // Empty string if no text (comment column is NOT NULL)
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

      await apiClient.put(`/api/organizer/disputes/${disputeId}`, updateData);

      setCommentText('');
      setCommentAttachment(null);

      // Refresh comments and disputes
      await fetchComments(disputeId);
      await fetchDisputes();

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

  const handleUpdateStatus = async (disputeId: string, newStatus: 'in_review' | 'resolved' | 'rejected', addComment?: boolean) => {
    try {
      const updateData: Partial<Database['public']['Tables']['tournament_disputes']['Update']> = {
        status: newStatus,
        assigned_to_user_id: selectedAssigneeId || actorUserId,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'resolved' || newStatus === 'rejected') {
        updateData.resolution_notes = resolutionNotes || null;
      }

      const { error } = { error: null }; // apiClient throws on error
      await apiClient.put(`/api/organizer/disputes/${disputeId}`, updateData);

      // Add comment if provided when marking as in_review
      if (newStatus === 'in_review' && addComment && commentText.trim()) {
        await apiClient.post(`/api/organizer/disputes/${disputeId}/comments`, {
            user_id: actorUserId,
            comment: commentText.trim(),
            is_internal: false,
          });
        setCommentText('');
      }

      await logDisputeAudit(disputeId, newStatus, {
        resolution_notes: updateData.resolution_notes,
        title: selectedDispute?.title,
        assigned_to: updateData.assigned_to_user_id,
      });

      toast({
        title: 'Success',
        description: `Dispute ${newStatus === 'resolved' ? 'resolved' : newStatus === 'rejected' ? 'rejected' : 'marked as in review'}.`,
      });

      if (newStatus === 'resolved' || newStatus === 'rejected') {
        setResolutionDialogOpen(false);
        setResolutionNotes('');
        setSelectedDispute(null);
      } else {
        // If still in review, refresh comments
        fetchComments(disputeId);
      }
      fetchDisputes();
    } catch (error: unknown) {
      console.error('Error updating dispute:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : (error as any)?.message || JSON.stringify(error);
      toast({
        title: 'Error',
        description: `Failed to update dispute: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_review':
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30"><MessageSquare className="h-3 w-3 mr-1" />In Review</Badge>;
      case 'resolved':
        return <Badge className="bg-green-600/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openDisputes = disputes.filter(d => d.status === 'open');
  const inReviewDisputes = disputes.filter(d => d.status === 'in_review');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved' || d.status === 'rejected');

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-gray-900 border border-gray-800">
          <CardContent className="py-4">
            <p className="text-xs text-gray-400 uppercase">Open</p>
            <p className="text-2xl font-semibold text-yellow-400">{openDisputes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border border-gray-800">
          <CardContent className="py-4">
            <p className="text-xs text-gray-400 uppercase">In review</p>
            <p className="text-2xl font-semibold text-blue-300">{inReviewDisputes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border border-gray-800">
          <CardContent className="py-4">
            <p className="text-xs text-gray-400 uppercase">Closed</p>
            <p className="text-2xl font-semibold text-green-300">{resolvedDisputes.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6 group">
        <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            Dispute center
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading disputes…
            </div>
          ) : (
            <Tabs defaultValue="open" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800/60 border border-gray-800">
                <TabsTrigger value="open">Open ({openDisputes.length})</TabsTrigger>
                <TabsTrigger value="in_review">In review ({inReviewDisputes.length})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({resolvedDisputes.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="open" className="space-y-4 mt-4">
                {openDisputes.length === 0 ? (
                  <div className="text-gray-400 p-4 bg-gray-800/40 rounded-lg text-sm">No open disputes.</div>
                ) : (
                  openDisputes.map((dispute) => (
                    <DisputeCard
                      key={dispute.id}
                      dispute={dispute}
                      onAction={(dispute) => {
                        setSelectedDispute(dispute);
                        setResolutionStatus('in_review');
                        setResolutionDialogOpen(true);
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="in_review" className="space-y-4 mt-4">
                {inReviewDisputes.length === 0 ? (
                  <div className="text-gray-400 p-4 bg-gray-800/40 rounded-lg text-sm">No disputes in review.</div>
                ) : (
                  inReviewDisputes.map((dispute) => (
                    <DisputeCard
                      key={dispute.id}
                      dispute={dispute}
                      onAction={(dispute) => {
                        setSelectedDispute(dispute);
                        setResolutionStatus('resolved');
                        setResolutionDialogOpen(true);
                      }}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="resolved" className="space-y-4 mt-4">
                {resolvedDisputes.length === 0 ? (
                  <div className="text-gray-400 p-4 bg-gray-800/40 rounded-lg text-sm">No resolved disputes.</div>
                ) : (
                  resolvedDisputes.map((dispute) => (
                    <DisputeCard key={dispute.id} dispute={dispute} readonly onAction={() => { }} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={resolutionDialogOpen} onOpenChange={(open) => {
        setResolutionDialogOpen(open);
        if (open && selectedDispute) {
          fetchComments(selectedDispute.id);
        } else {
          setComments([]);
          setCommentText('');
        }
      }}>
        <DialogContent className="bg-gaming-dark border-gaming-gray/30 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>
              Review and resolve the dispute: <strong>{selectedDispute?.title}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 block">Raised By</label>
                <div className="flex items-center gap-2 text-gray-300">
                  <User className="h-4 w-4" />
                  {selectedDispute.raised_by_name}
                  {selectedDispute.team_name && (
                    <Badge variant="outline" className="ml-2">{selectedDispute.team_name}</Badge>
                  )}
                </div>
              </div>

              {selectedDispute.match && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Match Context</label>
                  <div className="p-3 bg-gaming-gray/20 rounded-lg flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{selectedDispute.match.team1_name || 'Team 1'}</span>
                      <span className="text-zinc-400 font-mono">
                        {selectedDispute.match.team1_score ?? 0} – {selectedDispute.match.team2_score ?? 0}
                      </span>
                      <span className="text-white font-semibold">{selectedDispute.match.team2_name || 'Team 2'}</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                      Match #{selectedDispute.match.match_number} · BO{selectedDispute.match.best_of || 1}
                    </Badge>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold mb-2 block">Description</label>
                <div className="p-3 bg-gaming-gray/20 rounded-lg text-gray-300 text-sm">
                  {selectedDispute.description || 'No description provided.'}
                </div>
              </div>

              {selectedDispute.evidence_url && (
                <div>
                  <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Evidence
                  </label>
                  <a
                    href={selectedDispute.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-sm"
                  >
                    View Evidence Image
                  </a>
                </div>
              )}

              {/* Reports, Scoreboard, Riot Accounts from enriched dispute data */}
              <DisputeEvidencePanel
                reports={selectedDispute.reports || []}
                riotAccounts={selectedDispute.riot_accounts || []}
                matchContext={selectedDispute.match ? {
                  team1_name: selectedDispute.match.team1_name,
                  team2_name: selectedDispute.match.team2_name,
                  team1_id: selectedDispute.match.team1_id,
                  team2_id: selectedDispute.match.team2_id,
                  best_of: selectedDispute.match.best_of,
                } : null}
                onImageClick={(url) => setViewingImage(url)}
              />

              <div>
                <label className="text-sm font-semibold mb-2 block">Assignment</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select
                    value={selectedAssigneeId || organizerId}
                    onValueChange={(value) => setSelectedAssigneeId(value)}
                    disabled={
                      !selectedDispute ||
                      assignmentOptions.length === 0 ||
                      (!canAssignOthers &&
                        selectedDispute.assigned_to_user_id &&
                        selectedDispute.assigned_to_user_id !== actorUserId)
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gaming-gray/30 text-white">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent className="bg-gaming-dark border-gaming-gray/30 text-white">
                      {assignmentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(canAssignOthers ||
                    !selectedDispute?.assigned_to_user_id ||
                    selectedDispute?.assigned_to_user_id === actorUserId) && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          assignmentLoading ||
                          !selectedDispute ||
                          !selectedAssigneeId ||
                          selectedAssigneeId === selectedDispute.assigned_to_user_id
                        }
                        onClick={() =>
                          selectedDispute &&
                          selectedAssigneeId &&
                          handleAssignDispute(selectedDispute.id, selectedAssigneeId)
                        }
                        className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                      >
                        {assignmentLoading ? 'Saving...' : 'Save assignment'}
                      </Button>
                    )}
                </div>
                {!canAssignOthers && (
                  <p className="text-xs text-gray-400 mt-2">
                    Only the lead organizer can reassign disputes to other moderators.
                  </p>
                )}
              </div>

              {/* Comments Section - Always show history, but only allow new comments for open/in_review */}
              {selectedDispute && (
                <div className="border-t border-white/10 pt-4">
                  <label className="text-sm font-semibold mb-2 block">Conversation</label>

                  {/* Comments List - Show for all statuses */}
                  <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                    {loadingComments ? (
                      <div className="text-center text-gray-400 text-sm py-4">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                        Loading comments...
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-gray-400 text-sm text-center py-4 bg-gray-800/40 rounded-lg">
                        No comments yet. {selectedDispute.status === 'open' || selectedDispute.status === 'in_review' ? 'Start the conversation below.' : 'This dispute has been closed.'}
                      </div>
                    ) : (
                      comments.map((comment) => {
                        const isOrganizer = comment.user_id === organizerId ||
                          activeStaff.some(s => s.user_id === comment.user_id);
                        return (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-lg border ${isOrganizer
                              ? 'bg-blue-500/10 border-blue-500/30'
                              : 'bg-gray-800/40 border-gray-700/50'
                              }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-xs font-semibold text-white">
                                {isOrganizer ? 'Organizer' : 'User'}: {comment.user_name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            {comment.comment && comment.comment.trim() && (
                              <p className="text-sm text-gray-200 whitespace-pre-wrap mb-2">{comment.comment}</p>
                            )}
                            {comment.attachment_url && (
                              <div className="mt-2">
                                <img
                                  src={comment.attachment_url}
                                  alt="Comment attachment"
                                  className="max-w-full max-h-64 rounded-lg border border-gray-700/50 cursor-pointer hover:opacity-80 transition"
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
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Comment - Only show for open/in_review disputes */}
                  {canAssistDisputes && (selectedDispute.status === 'open' || selectedDispute.status === 'in_review') && (
                    <div className="space-y-2">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment or ask a question..."
                        className="bg-white/5 border-gaming-gray/50 text-white placeholder:text-gray-500 min-h-[80px]"
                      />

                      {/* File Upload */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
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
                          <div className="flex items-center gap-2 p-2 bg-gray-800/40 rounded-lg">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-300 flex-1">{commentAttachment.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-300 hover:text-red-100 hover:bg-red-500/10 h-6 px-2"
                              onClick={() => setCommentAttachment(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleAddComment(selectedDispute.id)}
                        disabled={(!commentText.trim() && !commentAttachment) || submittingComment || uploadingAttachment}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {uploadingAttachment ? 'Uploading...' : submittingComment ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  )}

                  {/* Show message for resolved/rejected disputes */}
                  {(selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && (
                    <div className="text-gray-400 text-sm text-center py-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                      This dispute has been {selectedDispute.status === 'resolved' ? 'resolved' : 'rejected'}. No further comments can be added.
                    </div>
                  )}
                </div>
              )}

              {selectedDispute && selectedDispute.status === 'open' && canAssistDisputes && (
                <div>
                  <label className="text-sm font-semibold mb-2 block">Action</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (commentText.trim()) {
                          handleUpdateStatus(selectedDispute.id, 'in_review', true);
                        } else {
                          handleUpdateStatus(selectedDispute.id, 'in_review');
                        }
                      }}
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      Mark as In Review {commentText.trim() ? '(with comment)' : '(optional comment)'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    You can add a comment when marking as "In Review" to start the conversation, or mark it without a comment.
                  </p>
                </div>
              )}

              {canAssistDisputes && selectedDispute && (selectedDispute.status === 'open' || selectedDispute.status === 'in_review') ? (
                <>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Resolution Status</label>
                    <div className="flex gap-2 mb-3">
                      <Button
                        variant={resolutionStatus === 'resolved' ? 'default' : 'outline'}
                        onClick={() => setResolutionStatus('resolved')}
                        className={resolutionStatus === 'resolved' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        variant={resolutionStatus === 'rejected' ? 'default' : 'outline'}
                        onClick={() => setResolutionStatus('rejected')}
                        className={resolutionStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Resolution Notes</label>
                    <Textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Enter resolution notes or feedback..."
                      className="bg-white/5 border-gaming-gray/50 text-white placeholder:text-gray-500 min-h-[100px]"
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-sm text-yellow-100 p-4">
                  You can review the dispute details, but only the lead organizer or assigned moderators can update the
                  status.
                </div>
              )}
            </div>
          )}

          {selectedDispute && canAssistDisputes && (selectedDispute.status === 'open' || selectedDispute.status === 'in_review') ? (
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolutionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleUpdateStatus(selectedDispute.id, resolutionStatus)}
                disabled={!resolutionNotes.trim()}
                className={
                  resolutionStatus === 'resolved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }
              >
                {resolutionStatus === 'resolved' ? 'Resolve' : 'Reject'} Dispute
              </Button>
              {selectedDispute.status === 'in_review' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (commentText.trim()) {
                      handleAddComment(selectedDispute.id);
                    }
                  }}
                  disabled={!commentText.trim() || submittingComment}
                  className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                >
                  {submittingComment ? 'Posting...' : 'Add Comment'}
                </Button>
              )}
            </DialogFooter>
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolutionDialogOpen(false)}>
                {selectedDispute ? 'Close' : 'Cancel'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="bg-black/95 border-gray-800 max-w-4xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <img
              src={viewingImage}
              alt="Full size preview"
              className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface DisputeCardProps {
  dispute: Dispute;
  onAction: (dispute: Dispute) => void;
  readonly?: boolean;
}

const DisputeCard: React.FC<DisputeCardProps> = ({ dispute, onAction, readonly }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Open</Badge>;
      case 'in_review':
        return <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30"><MessageSquare className="h-3 w-3 mr-1" />In Review</Badge>;
      case 'resolved':
        return <Badge className="bg-green-600/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="bg-gray-800/40 border border-gray-800 shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <h4 className="text-lg font-semibold text-white">{dispute.title}</h4>
              {getStatusBadge(dispute.status)}
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {dispute.raised_by_name}
              </span>
              {dispute.team_name && (
                <Badge variant="outline" className="border-gray-700 text-gray-200">
                  {dispute.team_name}
                </Badge>
              )}
              {dispute.match && (
                <span className="text-gray-300 font-medium">
                  {dispute.match.team1_name} vs {dispute.match.team2_name} · Match #{dispute.match.match_number}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(dispute.created_at).toLocaleString()}
              </span>
              {dispute.assigned_to_name && (
                <span className="flex items-center gap-1 text-blue-200">
                  <UserCheck className="h-3 w-3" />
                  {dispute.assigned_to_name}
                </span>
              )}
              {dispute.evidence_url && (
                <a
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  href={dispute.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ImageIcon className="h-3 w-3" />
                  Evidence
                </a>
              )}
            </div>
            {dispute.description && (
              <p className="text-sm text-gray-300 bg-gray-900/60 border border-gray-800 rounded-lg p-3">
                {dispute.description}
              </p>
            )}
            {dispute.resolution_notes && (
              <div className="text-sm text-gray-400 bg-gray-900/40 border-l-4 border-blue-500 rounded-r-lg p-3">
                <span className="font-semibold text-gray-200 block mb-1">Resolution notes</span>
                {dispute.resolution_notes}
              </div>
            )}
          </div>
          {!readonly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(dispute)}
              className="border-gray-700 text-gray-200 hover:bg-gray-800"
            >
              {dispute.status === 'open' ? 'Review' : dispute.status === 'in_review' ? 'Resolve' : 'View'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DisputeCenter;

// Image Preview Dialog - placed at end of file for component access
const ImagePreviewDialog: React.FC<{ imageUrl: string | null; onClose: () => void }> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={!!imageUrl} onOpenChange={() => onClose()}>
      <DialogContent className="bg-black/95 border-gray-800 max-w-4xl p-2">
        <DialogHeader className="sr-only">
          <DialogTitle>Image Preview</DialogTitle>
        </DialogHeader>
        <img
          src={imageUrl}
          alt="Full size preview"
          className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg"
        />
      </DialogContent>
    </Dialog>
  );
};

