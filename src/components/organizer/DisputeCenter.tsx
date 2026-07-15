import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { StaffPermission } from '@/types/staff';
import { apiClient } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, CheckCircle, XCircle,
  Clock, User, RefreshCw, Shield, Search, MessageSquare,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useTournamentDisputeStaff } from '@/hooks/useTournamentDisputeStaff';
import { useTournamentAccess } from '@/hooks/useTournamentAccess';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import type { DisputeReport, DisputeRiotAccount, MatchDisputeEvidence } from './DisputeEvidencePanel';
import type { DisputeStaffMember } from './DisputeActions';
import DisputeCaseHeader from './DisputeCaseHeader';
import DisputeEvidenceCompare from './DisputeEvidenceCompare';
import DisputeResolutionDock from './DisputeResolutionDock';
import DisputeConversation from './DisputeConversation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getInitialReport,
  getPrimaryDisputeReport,
  parseDisputeReports,
  parseDisputeRiotAccounts,
  parseMatchDispute,
} from '@/utils/disputeReportUtils';

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
  status: 'open' | 'resolved' | 'rejected';
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
  match_dispute?: MatchDisputeEvidence | null;
}

interface DisputeCenterProps {
  tournamentId: string;
  organizerId: string;
  currentUserId?: string;
  onUnreadChange?: () => void;
}

const DisputeCenter: React.FC<DisputeCenterProps> = ({
  tournamentId,
  organizerId,
  currentUserId,
  onUnreadChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const conn = useHub(HubPaths.Match);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected'>('resolved');
  const [enforceReportScore, setEnforceReportScore] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; comment: string; created_at: string; user_name?: string; is_internal: boolean; attachment_url?: string }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const assigneeChangedByUser = useRef(false);

  const actorUserId = currentUserId ?? organizerId;
  const { staff, loading: _staffLoading } = useTournamentDisputeStaff(tournamentId);
  const { can, access } = useTournamentAccess(tournamentId);
  const activeStaff = useMemo(
    () => staff.filter((member) => member.status === 'active'),
    [staff]
  );
  const staffMembers = useMemo((): DisputeStaffMember[] => {
    const members = new Map<string, DisputeStaffMember>();

    members.set(organizerId, {
      value: organizerId,
      label: 'Lead Organizer',
      role: 'Tournament Owner',
      permissions: ['disputes:assist', 'scores:update', 'bracket:edit', 'teams:manage', 'announcements:send'],
      isLeadOrganizer: true,
      isAssigned: selectedDispute?.assigned_to_user_id === organizerId,
    });

    activeStaff.forEach((member) => {
      members.set(member.user_id, {
        value: member.user_id,
        label:
          member.profiles?.full_name ||
          member.profiles?.username ||
          member.profiles?.email ||
          'Staff member',
        role: member.role,
        permissions: member.permissions as StaffPermission[],
        isAssigned: selectedDispute?.assigned_to_user_id === member.user_id,
      });
    });

    if (selectedDispute?.assigned_to_user_id && !members.has(selectedDispute.assigned_to_user_id)) {
      members.set(selectedDispute.assigned_to_user_id, {
        value: selectedDispute.assigned_to_user_id,
        label: selectedDispute.assigned_to_name || 'Assigned staff',
        role: 'Staff',
        permissions: ['disputes:assist'],
        isAssigned: true,
      });
    }

    return Array.from(members.values());
  }, [organizerId, activeStaff, selectedDispute?.assigned_to_user_id, selectedDispute?.assigned_to_name]);
  const canAssistDisputes =
    actorUserId === organizerId
    || can('disputes:assist')
    || Boolean(access?.isPlatformAdmin);
  const canAssignOthers =
    actorUserId === organizerId || (access?.role === 'admin' && !access?.isOrganizer);

  const fetchDisputes = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const disputesData = await apiClient.get<Dispute[]>(`/api/organizer/disputes?tournament_id=${tournamentId}`);

      // Filter client-side: match tournament + exclude disputes raised by the current user (prevent self-handling)
      const rows = (disputesData || []).filter(d =>
        d.tournament_id === tournamentId && d.raised_by_user_id !== actorUserId
      );
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
      onUnreadChange?.();
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
  }, [tournamentId, toast, actorUserId, onUnreadChange]);

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

  const markDisputeRead = useCallback(async (disputeId: string) => {
    try {
      await apiClient.post(`/api/organizer/disputes/${disputeId}/read`, {});
      onUnreadChange?.();
    } catch {
      // Non-blocking — badge refresh is best-effort
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (selectedDispute) {
      assigneeChangedByUser.current = false;
      setSelectedAssigneeId(
        selectedDispute.assigned_to_user_id ||
        (canAssistDisputes ? actorUserId : organizerId)
      );
      fetchComments(selectedDispute.id);
      markDisputeRead(selectedDispute.id);
    } else {
      assigneeChangedByUser.current = false;
      setSelectedAssigneeId(null);
      setComments([]);
    }
  }, [selectedDispute, actorUserId, canAssistDisputes, organizerId, fetchComments, markDisputeRead]);

  const handleAssigneeChange = useCallback((id: string) => {
    assigneeChangedByUser.current = true;
    setSelectedAssigneeId(id);
  }, []);

  // SignalR subscription for dispute events (replaces Supabase realtime)
  useEffect(() => {
    if (!tournamentId) return;

    let active = true;

    const handleDisputeResolved = () => {
      if (!active) return;
      fetchDisputes();
      onUnreadChange?.();
      toast({ title: 'Dispute updated', description: 'A dispute status has changed.' });
    };

    const handleReportDisputed = (payload: any) => {
      if (!active) return;
      fetchDisputes();
      onUnreadChange?.();
      toast({
        title: 'New dispute filed',
        description: payload?.title || 'A participant raised a dispute.',
      });
    };

    const handleCommentAdded = (payload: { disputeId?: string }) => {
      if (!active) return;
      onUnreadChange?.();
      if (selectedDispute?.id && payload?.disputeId === selectedDispute.id) {
        fetchComments(selectedDispute.id, true);
      }
    };

    conn.on('DisputeResolved', handleDisputeResolved);
    conn.on('ReportDisputed', handleReportDisputed);
    conn.on('DisputeCommentAdded', handleCommentAdded);

    return () => {
      active = false;
      conn.off('DisputeResolved', handleDisputeResolved);
      conn.off('ReportDisputed', handleReportDisputed);
      conn.off('DisputeCommentAdded', handleCommentAdded);
    };
  }, [tournamentId, fetchDisputes, toast, conn, onUnreadChange, selectedDispute?.id, fetchComments]);

  const logDisputeAudit = useCallback(async (disputeId: string, action: string, meta?: Record<string, unknown>) => {
    await auditLog.log(action as any, 'dispute', disputeId, String(meta?.title || 'Dispute'), {
      tournament_id: tournamentId,
      ...meta
    });
  }, [tournamentId]);

  const handleAssignDispute = useCallback(async (disputeId: string, assigneeId: string) => {
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
  }, [logDisputeAudit, selectedDispute?.title, toast, fetchDisputes]);

  // Debounced auto-save when user explicitly changes assignee (lead organizer only)
  useEffect(() => {
    if (!assigneeChangedByUser.current) return;
    if (!selectedDispute || selectedDispute.status !== 'open') return;
    if (!canAssignOthers || !selectedAssigneeId) return;
    if (selectedAssigneeId === selectedDispute.assigned_to_user_id) return;

    const timer = window.setTimeout(() => {
      void handleAssignDispute(selectedDispute.id, selectedAssigneeId);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [
    selectedAssigneeId,
    selectedDispute,
    canAssignOthers,
    handleAssignDispute,
  ]);

  /** Direct comment submission (called from DisputeConversation sub-component) */
  const handleAddCommentDirect = async (disputeId: string, text: string, attachment: File | null) => {
    if (!text.trim() && !attachment) return;
    try {
      setSubmittingComment(true);

      let attachmentUrl: string | null = null;
      if (attachment) {
        setUploadingAttachment(true);
        const fd = new FormData();
        fd.append('file', attachment);
        fd.append('bucket', 'tournaments.disputes.evidence');
        fd.append('folder', disputeId);
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        attachmentUrl = url;
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

  const handleUpdateStatus = async (
    disputeId: string,
    newStatus: 'resolved' | 'rejected',
    options?: { reportId?: string | null },
  ) => {
    try {
      const payload: {
        status: 'resolved' | 'rejected';
        resolutionNotes: string;
        reportId?: string;
      } = {
        status: newStatus,
        resolutionNotes: resolutionNotes.trim(),
      };
      if (newStatus === 'resolved' && options?.reportId) {
        payload.reportId = options.reportId;
      }

      await apiClient.post(`/api/organizer/disputes/${disputeId}/resolve`, payload);

      await logDisputeAudit(disputeId, newStatus, {
        resolution_notes: resolutionNotes || undefined,
        title: selectedDispute?.title,
      });

      toast({
        title: newStatus === 'resolved' ? 'Dispute resolved' : 'Dispute rejected',
        description: 'The dispute filer has been notified.',
      });

      setResolutionNotes('');
      setEnforceReportScore(false);
      if (selectedDispute?.match_id) {
        const matchId = selectedDispute.match_id;
        void queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
        void queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
        void queryClient.invalidateQueries({ queryKey: ['bracket'] });
        void queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
      }
      setSelectedDispute(null);
      fetchDisputes();
      onUnreadChange?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || JSON.stringify(error);
      toast({ title: 'Error', description: `Failed to update dispute: ${errorMessage}`, variant: 'destructive' });
    }
  };

  const openDisputes = disputes.filter(d => d.status === 'open');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved' || d.status === 'rejected');

  const [filterTab, setFilterTab] = useState<'open' | 'resolved'>('open');
  const filteredDisputes = useMemo(() => {
    const tabFiltered = filterTab === 'open' ? openDisputes : resolvedDisputes;
    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.toLowerCase();
    return tabFiltered.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.raised_by_name?.toLowerCase().includes(q) ||
      d.reference_number?.toLowerCase().includes(q)
    );
  }, [filterTab, openDisputes, resolvedDisputes, searchQuery]);

  const statusCfg = {
    open: { icon: AlertCircle, label: 'Open', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
    resolved: { icon: CheckCircle, label: 'Closed', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
    rejected: { icon: XCircle, label: 'Closed', cls: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-400' },
  } as const;

  const tabStyles = {
    open: { active: 'bg-amber-500/10 border-amber-500/30 text-amber-400', dot: 'bg-amber-400' },
    resolved: { active: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', dot: 'bg-emerald-400' },
  } as const;

  return (
    <div className="space-y-4">
      {/* ─── Stats Bar ─── */}
      <div className="flex items-center gap-3">
        {([
          { key: 'open' as const, count: openDisputes.length },
          { key: 'resolved' as const, count: resolvedDisputes.length },
        ]).map(({ key, count }) => (
          <button
            key={key}
            onClick={() => setFilterTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all hover:scale-[1.02] ${
              filterTab === key
                ? tabStyles[key].active
                : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.1]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterTab === key ? tabStyles[key].dot : 'bg-zinc-700'}`} />
            {key === 'open' ? 'Open' : 'Closed'}
            <span className="font-mono text-xs">{count}</span>
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={() => fetchDisputes()}
            className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/[0.04] transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── 3-Panel Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_380px] gap-5 h-[calc(100vh-10rem)] min-h-0">
        {/* Panel 1: Dispute List */}
        <div className="flex flex-col min-h-0 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-heading font-bold text-white">Disputes</h3>
              <span className="text-xs text-zinc-600 ml-auto">{filteredDisputes.length} items</span>
            </div>
            <div className="mt-2 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search disputes…"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs text-white placeholder:text-zinc-600 pl-8 pr-3 py-1.5 outline-none focus:border-rose-500/30 transition"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5 scrollbar-thin" data-lenis-prevent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading…
              </div>
            ) : filteredDisputes.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-sm">
                No {filterTab === 'open' ? 'open' : 'closed'} disputes
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
                      setResolutionStatus('resolved');
                      setEnforceReportScore(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-150 border-l-[3px] ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/50 border-l-rose-500'
                        : dispute.status === 'open'
                          ? 'bg-white/[0.02] border-white/[0.06] border-l-amber-500 hover:bg-white/[0.04]'
                          : dispute.status === 'resolved'
                            ? 'bg-white/[0.02] border-white/[0.06] border-l-emerald-500 hover:bg-white/[0.04]'
                            : 'bg-white/[0.02] border-white/[0.06] border-l-red-500 hover:bg-white/[0.04]'
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

        {/* Panel 2: Evidence & Info */}
        <div className="min-h-0 h-full bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
          <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
          <AnimatePresence mode="wait">
          {selectedDispute ? (() => {
            const hasMatch = !!(selectedDispute.match?.team1_name && selectedDispute.match?.team2_name);

            const safeReports = parseDisputeReports(selectedDispute.reports);
            const primaryReport = getPrimaryDisputeReport(safeReports);
            const initialReport = getInitialReport(safeReports, parseMatchDispute(selectedDispute.match_dispute));
            const safeRiotAccounts = parseDisputeRiotAccounts(selectedDispute.riot_accounts);
            const matchDispute = parseMatchDispute(selectedDispute.match_dispute);
            const riotMatchIds = safeReports
              .map(r => r.riot_match_id)
              .filter((v, i, a) => v && a.indexOf(v) === i) as string[];
            const disputedReport = safeReports.find((r) => r.status === 'disputed') ?? primaryReport;
            const canEnforceReportScore = Boolean(
              resolutionStatus === 'resolved'
              && disputedReport
              && disputedReport.status !== 'accepted',
            );
            const reportedScoreLabel = disputedReport && hasMatch
              ? `${selectedDispute.match!.team1_name} ${disputedReport.team1_score}–${disputedReport.team2_score} ${selectedDispute.match!.team2_name}`
              : disputedReport
                ? `${disputedReport.team1_score}–${disputedReport.team2_score}`
                : null;
            const caseTitle = hasMatch
              ? `${selectedDispute.match!.team1_name} vs ${selectedDispute.match!.team2_name}`
              : selectedDispute.title;
            const isClosed = selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected';

            return (
              <motion.div
                key={selectedDispute.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full min-h-0"
              >
                <DisputeCaseHeader
                  referenceNumber={selectedDispute.reference_number}
                  title={caseTitle}
                  status={selectedDispute.status}
                  raisedByName={selectedDispute.raised_by_name}
                  teamName={selectedDispute.team_name}
                  createdAt={selectedDispute.created_at}
                  timeAgo={getTimeAgo(selectedDispute.created_at)}
                  disputeId={selectedDispute.id}
                  matchId={selectedDispute.match_id}
                  riotMatchIds={riotMatchIds}
                  assigneeId={selectedAssigneeId}
                  staffMembers={staffMembers}
                  canAssignOthers={canAssignOthers}
                  canAssist={canAssistDisputes}
                  isClosed={isClosed}
                  onAssigneeChange={handleAssigneeChange}
                />

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10" data-lenis-prevent>
                  {hasMatch && selectedDispute.match!.match_number != null && (
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>Match #{selectedDispute.match!.match_number}</span>
                      {selectedDispute.match!.best_of != null && (
                        <span>Best of {selectedDispute.match!.best_of}</span>
                      )}
                    </div>
                  )}

                  <DisputeEvidenceCompare
                    reports={safeReports}
                    riotAccounts={safeRiotAccounts}
                    matchDispute={matchDispute}
                    fallbackEvidenceUrl={selectedDispute.evidence_url}
                    disputeDescription={selectedDispute.description}
                    matchContext={selectedDispute.match ? {
                      team1_name: selectedDispute.match.team1_name,
                      team2_name: selectedDispute.match.team2_name,
                      team1_id: selectedDispute.match.team1_id,
                      team2_id: selectedDispute.match.team2_id,
                      best_of: selectedDispute.match.best_of,
                    } : null}
                    onImageClick={(url) => setViewingImage(url)}
                  />

                  {!initialReport && !matchDispute && (
                    <div>
                      <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block font-medium">Description</label>
                      <p className="text-white/90 text-sm bg-[#121214] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                        {selectedDispute.description || 'No description provided.'}
                      </p>
                    </div>
                  )}

                  {isClosed && selectedDispute.resolution_notes && (
                    <div
                      className={`rounded-xl p-4 text-sm border border-white/[0.06] border-l-[3px] ${
                        selectedDispute.status === 'resolved'
                          ? 'border-l-emerald-500 bg-emerald-500/5 text-emerald-200'
                          : 'border-l-rose-500 bg-rose-500/5 text-rose-200'
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                        Resolution notes
                      </p>
                      <p className="text-sm leading-relaxed">{selectedDispute.resolution_notes}</p>
                    </div>
                  )}
                </div>

                {selectedDispute.status === 'open' && (
                  <DisputeResolutionDock
                    canAssist={canAssistDisputes}
                    canAssignOthers={canAssignOthers}
                    assigneeId={selectedAssigneeId}
                    staffMembers={staffMembers}
                    assignmentLoading={assignmentLoading}
                    resolutionNotes={resolutionNotes}
                    resolutionStatus={resolutionStatus}
                    enforceReportScore={enforceReportScore}
                    canEnforceReportScore={canEnforceReportScore}
                    reportedScoreLabel={reportedScoreLabel}
                    referenceNumber={selectedDispute.reference_number}
                    onAssigneeChange={handleAssigneeChange}
                    onStatusChange={(status) => {
                      setResolutionStatus(status);
                      if (status === 'rejected') setEnforceReportScore(false);
                    }}
                    onNotesChange={setResolutionNotes}
                    onEnforceReportScoreChange={setEnforceReportScore}
                    onResolve={() => handleUpdateStatus(selectedDispute.id, resolutionStatus, {
                      reportId: enforceReportScore && disputedReport?.id ? disputedReport.id : null,
                    })}
                  />
                )}
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
                <Shield className="h-10 w-10 mx-auto mb-3 text-zinc-700 opacity-40" />
                <p className="text-zinc-500 text-sm font-medium">Select a dispute to view details</p>
                <p className="text-zinc-600 text-xs mt-1">Evidence, info, and resolution controls will appear here</p>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
          </div>
        </div>

        {/* Panel 3: Conversation */}
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

          {selectedDispute ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-3 py-2">
              <DisputeConversation
                comments={comments}
                loading={loadingComments}
                organizerId={organizerId}
                staffUserIds={activeStaff.map(s => s.user_id)}
                canComment={canAssistDisputes && selectedDispute.status === 'open'}
                submitting={submittingComment}
                uploading={uploadingAttachment}
                onSubmit={(text, attachment) => handleAddCommentDirect(selectedDispute.id, text, attachment)}
                onImageClick={(url) => setViewingImage(url)}
              />
            </div>
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

      {/* Image Preview */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="bg-black/95 border-white/[0.06] max-w-4xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <img src={viewingImage} loading="lazy" alt="Full size" className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg" />
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

