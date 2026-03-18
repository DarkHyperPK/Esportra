import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, MessageSquare, CheckCircle, XCircle,
  Clock, User, RefreshCw, Shield,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useTournamentStaff } from '@/hooks/useTournamentStaff';
import type { Database } from '@/lib/database.types';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';
import type { DisputeReport, DisputeRiotAccount } from './DisputeEvidencePanel';
import DisputeDetailPanel from './DisputeDetailPanel';

interface Dispute {
  id: string;
  reference_number?: string | null;
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
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected' | 'in_review'>('resolved');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
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

  const fetchComments = useCallback(async (disputeId: string, silent = false) => {
    try {
      if (!silent) setLoadingComments(true);
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

  /** Direct comment submission (called from DisputeConversation sub-component) */
  const handleAddCommentDirect = async (disputeId: string, text: string, attachment: File | null) => {
    if (!text.trim() && !attachment) return;
    try {
      setSubmittingComment(true);

      let attachmentUrl: string | null = null;
      if (attachment) {
        setUploadingAttachment(true);
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${disputeId}/${actorUserId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('tournaments.disputes.evidence')
          .upload(fileName, attachment, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('tournaments.disputes.evidence')
          .getPublicUrl(fileName);
        attachmentUrl = urlData.publicUrl;
        setUploadingAttachment(false);
      }

      await apiClient.post(`/api/organizer/disputes/${disputeId}/comments`, {
        user_id: actorUserId,
        comment: text.trim() || '',
        is_internal: false,
        attachment_url: attachmentUrl,
      });

      await fetchComments(disputeId, true);
      toast({ title: 'Comment added' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to add comment';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSubmittingComment(false);
      setUploadingAttachment(false);
    }
  };

  const handleUpdateStatus = async (disputeId: string, newStatus: 'in_review' | 'resolved' | 'rejected') => {
    try {
      if (newStatus === 'resolved' || newStatus === 'rejected') {
        // Use /resolve endpoint — sends notifications + enforces scores
        await apiClient.post(`/api/organizer/disputes/${disputeId}/resolve`, {
          status: newStatus,
          resolution_notes: resolutionNotes || null,
        });
      } else {
        await apiClient.put(`/api/organizer/disputes/${disputeId}`, {
          status: newStatus,
          updated_at: new Date().toISOString(),
        });
      }

      await logDisputeAudit(disputeId, newStatus, {
        resolution_notes: resolutionNotes || undefined,
        title: selectedDispute?.title,
      });

      toast({
        title: newStatus === 'resolved' ? 'Dispute resolved' : newStatus === 'rejected' ? 'Dispute rejected' : 'Marked as in review',
        description: (newStatus === 'resolved' || newStatus === 'rejected')
          ? 'The dispute filer has been notified.' : undefined,
      });

      if (newStatus === 'resolved' || newStatus === 'rejected') {
        setResolutionNotes('');
        setSelectedDispute(null);
      } else {
        fetchComments(disputeId);
      }
      fetchDisputes();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || JSON.stringify(error);
      toast({ title: 'Error', description: `Failed to update dispute: ${errorMessage}`, variant: 'destructive' });
    }
  };

  const openDisputes = disputes.filter(d => d.status === 'open');
  const inReviewDisputes = disputes.filter(d => d.status === 'in_review');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved' || d.status === 'rejected');

  const [filterTab, setFilterTab] = useState<'open' | 'in_review' | 'resolved'>('open');
  const filteredDisputes = filterTab === 'open' ? openDisputes
    : filterTab === 'in_review' ? inReviewDisputes : resolvedDisputes;

  const statusCfg = {
    open: { icon: AlertCircle, label: 'Open', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
    in_review: { icon: MessageSquare, label: 'In Review', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
    resolved: { icon: CheckCircle, label: 'Resolved', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
    rejected: { icon: XCircle, label: 'Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
  } as const;

  const tabStyles = {
    open: { active: 'bg-amber-500/10 border-amber-500/30 text-amber-400', dot: 'bg-amber-400' },
    in_review: { active: 'bg-blue-500/10 border-blue-500/30 text-blue-400', dot: 'bg-blue-400' },
    resolved: { active: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-400' },
  } as const;

  return (
    <div className="space-y-4">
      {/* ─── Stats Bar ─── */}
      <div className="flex items-center gap-3">
        {([
          { key: 'open' as const, count: openDisputes.length },
          { key: 'in_review' as const, count: inReviewDisputes.length },
          { key: 'resolved' as const, count: resolvedDisputes.length },
        ]).map(({ key, count }) => (
          <button
            key={key}
            onClick={() => setFilterTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              filterTab === key
                ? tabStyles[key].active
                : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterTab === key ? tabStyles[key].dot : 'bg-zinc-700'}`} />
            {key === 'open' ? 'Open' : key === 'in_review' ? 'In Review' : 'Closed'}
            <span className="font-mono text-xs">{count}</span>
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => fetchDisputes()}
            className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Split Panel ─── */}
      <div className="flex gap-4" style={{ height: 'calc(100vh - 10rem)' }}>
        {/* Left: Dispute List */}
        <div className="w-[340px] shrink-0 flex flex-col bg-zinc-950/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-heading font-bold text-white">Disputes</h3>
              <span className="text-xs text-zinc-600 ml-auto">{filteredDisputes.length} items</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-sm">
                No {filterTab === 'open' ? 'open' : filterTab === 'in_review' ? 'in-review' : 'closed'} disputes
              </div>
            ) : (
              filteredDisputes.map((dispute) => {
                const cfg = statusCfg[dispute.status];
                const StatusIcon = cfg.icon;
                const isSelected = selectedDispute?.id === dispute.id;
                return (
                  <button
                    key={dispute.id}
                    onClick={() => {
                      setSelectedDispute(dispute);
                      setResolutionStatus(dispute.status === 'open' ? 'in_review' : 'resolved');
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                      isSelected
                        ? 'bg-blue-500/8 border-blue-500/25 ring-1 ring-blue-500/15'
                        : 'bg-zinc-900/30 border-transparent hover:bg-zinc-800/40 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-semibold text-white truncate flex-1">
                        {dispute.reference_number && (
                          <span className="text-rose-400/70 font-mono text-[11px] mr-1.5">{dispute.reference_number}</span>
                        )}
                        {dispute.title}
                      </h4>
                      <Badge className={`text-[9px] shrink-0 px-1.5 py-0.5 ${cfg.cls}`}>
                        <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                        {cfg.label}
                      </Badge>
                    </div>
                    {dispute.match && (
                      <div className="text-[11px] text-zinc-400 mb-1 truncate">
                        {dispute.match.team1_name} vs {dispute.match.team2_name}
                        {dispute.match.match_number != null && (
                          <span className="text-zinc-600"> · #{dispute.match.match_number}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                      <span className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {dispute.raised_by_name}
                      </span>
                      {dispute.team_name && <span>({dispute.team_name})</span>}
                      <span className="ml-auto flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {getTimeAgo(dispute.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 bg-zinc-950/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
          {selectedDispute ? (
            <DisputeDetailPanel
              dispute={selectedDispute}
              comments={comments}
              loadingComments={loadingComments}
              submittingComment={submittingComment}
              uploadingAttachment={uploadingAttachment}
              organizerId={organizerId}
              staffUserIds={activeStaff.map(s => s.user_id)}
              canAssist={canAssistDisputes}
              canAssignOthers={canAssignOthers}
              assigneeId={selectedAssigneeId}
              assignmentOptions={assignmentOptions}
              assignmentLoading={assignmentLoading}
              resolutionNotes={resolutionNotes}
              resolutionStatus={resolutionStatus}
              onAssigneeChange={setSelectedAssigneeId}
              onAssign={() => selectedDispute && selectedAssigneeId && handleAssignDispute(selectedDispute.id, selectedAssigneeId)}
              onResolutionStatusChange={setResolutionStatus}
              onResolutionNotesChange={setResolutionNotes}
              onMarkInReview={() => handleUpdateStatus(selectedDispute.id, 'in_review')}
              onResolve={() => handleUpdateStatus(selectedDispute.id, resolutionStatus)}
              onCommentSubmit={(text, attachment) => handleAddCommentDirect(selectedDispute.id, text, attachment)}
              onImageClick={(url) => setViewingImage(url)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              <Shield className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a dispute to review</p>
              <p className="text-xs text-zinc-700 mt-1">Click on a dispute from the list</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="bg-black/95 border-zinc-800 max-w-4xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <img src={viewingImage} alt="Full size" className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default DisputeCenter;

