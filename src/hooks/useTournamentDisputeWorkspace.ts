import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { StaffPermission } from '@/lib/tournamentStaff';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { useToast } from '@/hooks/use-toast';
import { useTournamentStaff } from '@/hooks/useTournamentStaff';
import { useHub } from '@/hooks/useSignalR';
import { HubPaths } from '@/lib/signalrClient';
import type { DisputeReport, DisputeRiotAccount, MatchDisputeEvidence } from '@/components/organizer/DisputeEvidencePanel';
import type { DisputeStaffMember } from '@/components/organizer/DisputeActions';

export interface TournamentDispute {
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

interface UseTournamentDisputeWorkspaceOptions {
  tournamentId: string | undefined;
  organizerId: string | undefined;
  currentUserId: string | undefined;
  selectedDisputeId?: string | null;
  onUnreadChange?: () => void;
}

export function useTournamentDisputeWorkspace({
  tournamentId,
  organizerId,
  currentUserId,
  selectedDisputeId,
  onUnreadChange,
}: UseTournamentDisputeWorkspaceOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const conn = useHub(HubPaths.Match);

  const [disputes, setDisputes] = useState<TournamentDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected'>('resolved');
  const [enforceReportScore, setEnforceReportScore] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [comments, setComments] = useState<Array<{
    id: string;
    user_id: string;
    comment: string;
    created_at: string;
    user_name?: string;
    is_internal: boolean;
    attachment_url?: string;
  }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [filterTab, setFilterTab] = useState<'open' | 'resolved'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const assigneeChangedByUser = useRef(false);
  const loadedDisputeIdRef = useRef<string | null>(null);
  const loadedTournamentIdRef = useRef<string | null>(null);
  const onUnreadChangeRef = useRef(onUnreadChange);
  onUnreadChangeRef.current = onUnreadChange;

  const actorUserId = currentUserId ?? organizerId ?? '';
  const { staff, hasPermission } = useTournamentStaff(tournamentId ?? '');
  const activeStaff = useMemo(() => staff.filter((m) => m.status === 'active'), [staff]);

  const selectedDispute = useMemo(
    () => disputes.find((d) => d.id === selectedDisputeId) ?? null,
    [disputes, selectedDisputeId],
  );

  const staffMembers = useMemo((): DisputeStaffMember[] => {
    if (!organizerId) return [];
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
    !!organizerId && (actorUserId === organizerId || hasPermission(actorUserId, 'disputes:assist'));
  const canAssignOthers = !!organizerId && actorUserId === organizerId;

  const fetchDisputes = useCallback(async (options?: { silent?: boolean }) => {
    if (!tournamentId) return;
    const isInitialLoad = loadedTournamentIdRef.current !== tournamentId;
    const silent = options?.silent ?? !isInitialLoad;
    try {
      if (!silent) setLoading(true);
      const disputesData = await apiClient.get<TournamentDispute[]>(
        `/api/organizer/disputes?tournament_id=${tournamentId}`,
      );
      const rows = (disputesData || []).filter(
        (d) => d.tournament_id === tournamentId && d.raised_by_user_id !== actorUserId,
      );
      setDisputes(rows);
      loadedTournamentIdRef.current = tournamentId;
      onUnreadChangeRef.current?.();
    } catch (error: unknown) {
      if (!silent) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load disputes',
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [tournamentId, actorUserId, toast]);

  const fetchComments = useCallback(async (disputeId: string, silent = false) => {
    try {
      if (!silent) setLoadingComments(true);
      const data = await apiClient.get<any[]>(`/api/organizer/disputes/${disputeId}/comments`);
      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      const profileMap = new Map<string, { full_name?: string; username?: string }>();

      if (userIds.length > 0) {
        const profiles = await apiClient
          .get<any[]>(`/api/profiles/search?ids=${userIds.join(',')}`)
          .catch(() => []);
        (profiles || []).forEach((profile: any) => {
          profileMap.set(profile.id, {
            full_name: profile.full_name,
            username: profile.username,
          });
        });
      }

      setComments(
        (data || []).map((c: any) => {
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
        }),
      );
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const markDisputeRead = useCallback(async (disputeId: string) => {
    try {
      await apiClient.post(`/api/organizer/disputes/${disputeId}/read`, {});
      onUnreadChangeRef.current?.();
    } catch {
      // best-effort
    }
  }, []);

  const fetchDisputesRef = useRef(fetchDisputes);
  fetchDisputesRef.current = fetchDisputes;

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      setDisputes([]);
      loadedTournamentIdRef.current = null;
      return;
    }
    if (loadedTournamentIdRef.current === tournamentId) return;
    void fetchDisputesRef.current();
  }, [tournamentId]);

  useEffect(() => {
    if (!selectedDisputeId) {
      loadedDisputeIdRef.current = null;
      assigneeChangedByUser.current = false;
      setSelectedAssigneeId(null);
      setComments([]);
      return;
    }

    if (loadedDisputeIdRef.current === selectedDisputeId) return;

    loadedDisputeIdRef.current = selectedDisputeId;
    assigneeChangedByUser.current = false;
    setResolutionNotes('');
    setResolutionStatus('resolved');
    setEnforceReportScore(false);
    void fetchComments(selectedDisputeId);
    void markDisputeRead(selectedDisputeId);
  }, [selectedDisputeId, fetchComments, markDisputeRead]);

  useEffect(() => {
    if (!selectedDisputeId || assigneeChangedByUser.current) return;
    const dispute = disputes.find((d) => d.id === selectedDisputeId);
    if (!dispute) return;
    setSelectedAssigneeId(
      dispute.assigned_to_user_id ||
        (canAssistDisputes ? actorUserId : organizerId ?? null),
    );
  }, [selectedDisputeId, disputes, canAssistDisputes, actorUserId, organizerId]);

  useEffect(() => {
    if (!tournamentId) return;
    let active = true;

    const handleDisputeResolved = () => {
      if (!active) return;
      void fetchDisputesRef.current({ silent: true });
      onUnreadChangeRef.current?.();
    };

    const handleReportDisputed = () => {
      if (!active) return;
      void fetchDisputesRef.current({ silent: true });
      onUnreadChangeRef.current?.();
      toast({ title: 'New dispute filed', description: 'A participant raised a dispute.' });
    };

    const handleCommentAdded = (payload: { disputeId?: string }) => {
      if (!active) return;
      onUnreadChangeRef.current?.();
      if (selectedDisputeId && payload?.disputeId === selectedDisputeId) {
        void fetchComments(selectedDisputeId, true);
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
  }, [tournamentId, toast, conn, selectedDisputeId, fetchComments]);

  const handleAssignDispute = useCallback(
    async (disputeId: string, assigneeId: string) => {
      try {
        setAssignmentLoading(true);
        await apiClient.put(`/api/organizer/disputes/${disputeId}`, {
          assigned_to_user_id: assigneeId,
          updated_at: new Date().toISOString(),
        });
        await auditLog.log('assigned', 'dispute', disputeId, String(selectedDispute?.title || 'Dispute'), {
          tournament_id: tournamentId,
          assigned_to: assigneeId,
          title: selectedDispute?.title,
        });
        toast({ title: 'Assignment updated' });
        void fetchDisputes({ silent: true });
      } catch (error: unknown) {
        toast({
          title: 'Assignment failed',
          description: error instanceof Error ? error.message : 'Unable to update assignment',
          variant: 'destructive',
        });
      } finally {
        setAssignmentLoading(false);
      }
    },
    [selectedDispute?.title, tournamentId, toast, fetchDisputes],
  );

  const handleAssigneeChange = useCallback((id: string) => {
    assigneeChangedByUser.current = true;
    setSelectedAssigneeId(id);
  }, []);

  useEffect(() => {
    if (!assigneeChangedByUser.current) return;
    if (!selectedDispute || selectedDispute.status !== 'open') return;
    if (!canAssignOthers || !selectedAssigneeId) return;
    if (selectedAssigneeId === selectedDispute.assigned_to_user_id) return;

    const timer = window.setTimeout(() => {
      void handleAssignDispute(selectedDispute.id, selectedAssigneeId);
    }, 600);

    return () => window.clearTimeout(timer);
  }, [selectedAssigneeId, selectedDispute, canAssignOthers, handleAssignDispute]);

  const handleAddComment = async (disputeId: string, text: string, attachment: File | null) => {
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
      await auditLog.log(newStatus, 'dispute', disputeId, String(selectedDispute?.title || 'Dispute'), {
        tournament_id: tournamentId,
        resolution_notes: resolutionNotes || undefined,
        title: selectedDispute?.title,
      });

      toast({
        title: newStatus === 'resolved' ? 'Dispute resolved' : 'Dispute rejected',
        description: 'The dispute filer has been notified.',
      });

      setResolutionNotes('');
      setEnforceReportScore(false);

      const matchId = selectedDispute?.match_id;
      if (matchId) {
        void queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
        void queryClient.invalidateQueries({ queryKey: ['match-dispute', matchId] });
        void queryClient.invalidateQueries({ queryKey: ['bracket'] });
        void queryClient.invalidateQueries({ queryKey: ['captain-all-matches'] });
      }

      void fetchDisputesRef.current({ silent: true });
      onUnreadChangeRef.current?.();
      return true;
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error, 'Failed to update dispute.'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const openDisputes = disputes.filter((d) => d.status === 'open');
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved' || d.status === 'rejected');

  const filteredDisputes = useMemo(() => {
    const tabFiltered = filterTab === 'open' ? openDisputes : resolvedDisputes;
    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.toLowerCase();
    return tabFiltered.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.raised_by_name?.toLowerCase().includes(q) ||
        d.reference_number?.toLowerCase().includes(q) ||
        d.match?.team1_name?.toLowerCase().includes(q) ||
        d.match?.team2_name?.toLowerCase().includes(q),
    );
  }, [filterTab, openDisputes, resolvedDisputes, searchQuery]);

  return {
    disputes,
    filteredDisputes,
    openDisputes,
    resolvedDisputes,
    loading,
    selectedDispute,
    comments,
    loadingComments,
    submittingComment,
    uploadingAttachment,
    resolutionNotes,
    setResolutionNotes,
    resolutionStatus,
    setResolutionStatus,
    enforceReportScore,
    setEnforceReportScore,
    selectedAssigneeId,
    assignmentLoading,
    staffMembers,
    activeStaff,
    canAssistDisputes,
    canAssignOthers,
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    fetchDisputes,
    handleAssigneeChange,
    handleAddComment,
    handleUpdateStatus,
    organizerId: organizerId ?? '',
  };
}
