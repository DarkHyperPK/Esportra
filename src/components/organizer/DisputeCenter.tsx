import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, CheckCircle, XCircle,
  Clock, User, RefreshCw, Shield, Search, MessageSquare,
  Image as ImageIcon, ZoomIn,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useTournamentStaff } from '@/hooks/useTournamentStaff';
import type { Database } from '@/lib/database.types';
import { useHub } from '@/contexts/SignalRContext';
import { HubPaths } from '@/lib/signalrClient';
import type { DisputeReport, DisputeRiotAccount } from './DisputeEvidencePanel';
import DisputeEvidencePanel from './DisputeEvidencePanel';
import DisputeActions from './DisputeActions';
import DisputeIdStrip from './DisputeIdStrip';
import DisputeConversation from './DisputeConversation';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [resolutionStatus, setResolutionStatus] = useState<'resolved' | 'rejected'>('resolved');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [comments, setComments] = useState<Array<{ id: string; user_id: string; comment: string; created_at: string; user_name?: string; is_internal: boolean; attachment_url?: string }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleUpdateStatus = async (disputeId: string, newStatus: 'resolved' | 'rejected') => {
    try {
      // Use /resolve endpoint — sends notifications + enforces scores
      await apiClient.post(`/api/organizer/disputes/${disputeId}/resolve`, {
        status: newStatus,
        resolution_notes: resolutionNotes || null,
      });

      await logDisputeAudit(disputeId, newStatus, {
        resolution_notes: resolutionNotes || undefined,
        title: selectedDispute?.title,
      });

      toast({
        title: newStatus === 'resolved' ? 'Dispute resolved' : 'Dispute rejected',
        description: 'The dispute filer has been notified.',
      });

      setResolutionNotes('');
      setSelectedDispute(null);
      fetchDisputes();
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
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_380px] gap-5 h-[calc(100vh-10rem)]">
        {/* Panel 1: Dispute List */}
        <div className="flex flex-col bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
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
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
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
        <div className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
          {selectedDispute ? (() => {
            const cfg = statusCfg[selectedDispute.status];
            const StatusIcon = cfg.icon;
            const hasMatch = !!(selectedDispute.match?.team1_name && selectedDispute.match?.team2_name);

            const safeReports: DisputeReport[] = (() => {
              let r = selectedDispute.reports;
              if (!r) return [];
              if (typeof r === 'string') { try { r = JSON.parse(r); } catch { return []; } }
              return Array.isArray(r) ? r : [];
            })();
            const safeRiotAccounts: DisputeRiotAccount[] = (() => {
              let r = selectedDispute.riot_accounts;
              if (!r) return [];
              if (typeof r === 'string') { try { r = JSON.parse(r); } catch { return []; } }
              return Array.isArray(r) ? r : [];
            })();
            const riotMatchIds = safeReports
              .map(r => r.riot_match_id)
              .filter((v, i, a) => v && a.indexOf(v) === i) as string[];

            return (
              <motion.div
                key={selectedDispute.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                {/* Header */}
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-1">
                    {selectedDispute.reference_number && (
                      <span className="text-rose-400/70 font-mono text-sm shrink-0">{selectedDispute.reference_number}</span>
                    )}
                    <h2 className="text-white text-lg font-semibold flex-1 truncate">
                      {hasMatch
                        ? `${selectedDispute.match!.team1_name} vs ${selectedDispute.match!.team2_name}`
                        : selectedDispute.title}
                    </h2>
                    <Badge className={`${cfg.cls} text-xs shrink-0`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{selectedDispute.raised_by_name}</span>
                    {selectedDispute.team_name && <span className="text-zinc-600">({selectedDispute.team_name})</span>}
                    <span className="text-zinc-700">•</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(selectedDispute.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-2">
                    <DisputeIdStrip disputeId={selectedDispute.id} referenceNumber={selectedDispute.reference_number} matchId={selectedDispute.match_id} riotMatchIds={riotMatchIds} />
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Match context */}
                  {hasMatch && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
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
                      {selectedDispute.match!.match_number != null && (
                        <div className="px-5 py-2.5 border-t border-white/[0.07] bg-white/[0.02] flex items-center gap-4 flex-wrap">
                          <span className="text-xs text-white/50">Match #{selectedDispute.match!.match_number}</span>
                          {selectedDispute.match!.best_of != null && (
                            <span className="text-xs text-white/50">Best of {selectedDispute.match!.best_of}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block font-medium">Description</label>
                    <p className="text-white/90 text-sm bg-[#121214] p-3 rounded-xl border border-white/[0.06] leading-relaxed">
                      {selectedDispute.description || 'No description provided.'}
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
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-sm">
                            <ZoomIn className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reports + Riot Accounts */}
                  <DisputeEvidencePanel
                    reports={safeReports}
                    riotAccounts={safeRiotAccounts}
                    matchContext={selectedDispute.match ? {
                      team1_name: selectedDispute.match.team1_name,
                      team2_name: selectedDispute.match.team2_name,
                      team1_id: selectedDispute.match.team1_id,
                      team2_id: selectedDispute.match.team2_id,
                      best_of: selectedDispute.match.best_of,
                    } : null}
                    onImageClick={(url) => setViewingImage(url)}
                  />

                  {/* Resolution notes (closed disputes) */}
                  {selectedDispute.resolution_notes && (selectedDispute.status === 'resolved' || selectedDispute.status === 'rejected') && (
                    <div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
                      <label className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5 block font-medium">Resolution Notes</label>
                      <p className="text-zinc-300 text-sm bg-[#121214] p-3 rounded-xl border border-white/[0.06]">
                        {selectedDispute.resolution_notes}
                      </p>
                    </div>
                  )}

                  {/* Actions (assign + resolve/reject) */}
                  {selectedDispute.status === 'open' && (
                    <div>
                      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
                      <DisputeActions
                        status={selectedDispute.status}
                        canAssist={canAssistDisputes}
                        canAssignOthers={canAssignOthers}
                        assigneeId={selectedAssigneeId}
                        assignmentOptions={assignmentOptions}
                        assignmentLoading={assignmentLoading}
                        resolutionNotes={resolutionNotes}
                        resolutionStatus={resolutionStatus}
                        onAssigneeChange={setSelectedAssigneeId}
                        onAssign={() => selectedDispute && selectedAssigneeId && handleAssignDispute(selectedDispute.id, selectedAssigneeId)}
                        onStatusChange={setResolutionStatus}
                        onNotesChange={setResolutionNotes}
                        onResolve={() => handleUpdateStatus(selectedDispute.id, resolutionStatus)}
                      />
                    </div>
                  )}
                </div>
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

        {/* Panel 3: Conversation */}
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
            <div className="flex-1 flex flex-col overflow-hidden px-3 py-2">
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

