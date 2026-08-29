import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOrganizerDisputeUnread } from '@/hooks/useOrganizerDisputeUnread';
import { useTournamentDisputeWorkspace } from '@/hooks/useTournamentDisputeWorkspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, ChevronLeft, Clock, RefreshCw, LayoutGrid, Loader2,
  Search, User, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';
import EntityAvatar from '@/components/ui/EntityAvatar';
import DisputeEvidencePanel from '@/components/organizer/DisputeEvidencePanel';
import DisputeConversation from '@/components/organizer/DisputeConversation';
import MatchChecker from '@/components/organizer/MatchChecker';
import { PageTransition } from '@/components/PageTransition';
import type { TournamentDispute } from '@/hooks/useTournamentDisputeWorkspace';
import {
  getInitialReport,
  parseDisputeReports,
  parseDisputeRiotAccounts,
  parseMatchDispute,
} from '@/utils/disputeReportUtils';

const statusCfg = {
  open: { icon: AlertCircle, label: 'Open', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  resolved: { icon: CheckCircle, label: 'Closed', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { icon: XCircle, label: 'Closed', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
} as const;

function DisputeListItem({
  dispute,
  active,
  onClick,
}: {
  dispute: TournamentDispute;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = statusCfg[dispute.status];
  const StatusIcon = cfg.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-l-2 transition flex items-start gap-2 ${
        active
          ? 'border-l-rose-500 bg-rose-500/10'
          : 'border-l-transparent hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {dispute.reference_number && (
            <span className="font-mono text-[10px] text-rose-400/70">{dispute.reference_number}</span>
          )}
          <Badge className={`${cfg.cls} text-[9px] px-1 py-0 shrink-0`}>
            <StatusIcon className="w-2 h-2 mr-0.5" />
            {cfg.label}
          </Badge>
        </div>
        <p className="text-sm font-medium text-white truncate mt-0.5">
          {dispute.match?.team1_name && dispute.match?.team2_name
            ? `${dispute.match.team1_name} vs ${dispute.match.team2_name}`
            : dispute.title}
        </p>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
          {dispute.raised_by_name}
          {' · '}
          {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}

const TournamentDisputesPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const disputeId = searchParams.get('dispute');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tournament, setTournament] = useState<{
    id: string;
    name: string;
    organizer_id: string;
    slug: string;
  } | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [openingBrackets, setOpeningBrackets] = useState(false);
  const [teamLogos, setTeamLogos] = useState<{ t1?: string | null; t2?: string | null }>({});
  const loadedTournamentSlugRef = useRef<string | null>(null);

  const { badgeCount, refresh: refreshUnread } = useOrganizerDisputeUnread(
    tournament?.id,
    !!tournament,
  );

  const workspace = useTournamentDisputeWorkspace({
    tournamentId: tournament?.id,
    organizerId: tournament?.organizer_id,
    currentUserId: user?.id,
    selectedDisputeId: disputeId ?? null,
    onUnreadChange: refreshUnread,
  });

  const selectedMatch = workspace.selectedDispute?.match;

  useEffect(() => {
    if (!selectedMatch?.team1_id && !selectedMatch?.team2_id) {
      setTeamLogos({});
      return;
    }
    const ids = [selectedMatch.team1_id, selectedMatch.team2_id].filter(Boolean) as string[];
    if (ids.length === 0) return;

    let cancelled = false;
    apiClient
      .post<Array<{ id: string; logo_url?: string | null }>>('/api/teams/batch', { ids })
      .then((teams) => {
        if (cancelled) return;
        const byId = new Map((teams || []).map((t) => [t.id, t.logo_url]));
        setTeamLogos({
          t1: selectedMatch.team1_id ? byId.get(selectedMatch.team1_id) ?? null : null,
          t2: selectedMatch.team2_id ? byId.get(selectedMatch.team2_id) ?? null : null,
        });
      })
      .catch(() => {
        if (!cancelled) setTeamLogos({});
      });

    return () => { cancelled = true; };
  }, [selectedMatch?.team1_id, selectedMatch?.team2_id, workspace.selectedDispute?.id]);

  const loadTournament = useCallback(async () => {
    if (!slug || loadedTournamentSlugRef.current === slug) return;
    try {
      setLoadingTournament(true);
      const data = await apiClient.get<any>(`/api/tournaments/by-slug/${encodeURIComponent(slug)}`);
      if (!data?.id) {
        toast({ title: 'Tournament not found', variant: 'destructive' });
        navigate('/organizer/tournaments');
        return;
      }
      loadedTournamentSlugRef.current = slug;
      setTournament({
        id: data.id,
        name: data.name || data.title || slug,
        organizer_id: data.organizer_id,
        slug: data.slug || slug,
      });
    } catch {
      toast({ title: 'Failed to load tournament', variant: 'destructive' });
      navigate('/organizer/tournaments');
    } finally {
      setLoadingTournament(false);
    }
  }, [slug, navigate, toast]);

  useEffect(() => {
    void loadTournament();
  }, [loadTournament]);

  const tournamentBase = `/organizer/tournament/${slug}`;

  const goToDispute = useCallback((id: string) => {
    setSearchParams({ dispute: id }, { replace: true });
  }, [setSearchParams]);

  const goToList = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const openOrganizerBracket = useCallback(async (matchId: string | null) => {
    if (!slug || !tournament?.id) return;

    setOpeningBrackets(true);
    try {
      const versions = await apiClient
        .get<Array<{ id: string; stage_id: string; status: string; created_at: string }>>(
          `/api/tournaments/${tournament.id}/bracket-versions`,
        )
        .catch(() => []);

      const activeVersions = (versions || []).filter((v) =>
        ['active', 'draft'].includes(v.status),
      );

      let stageId: string | null = null;

      if (matchId) {
        const match = await apiClient.get<{
          stage_id?: string | null;
          version_id?: string | null;
        }>(`/api/brackets/matches/${matchId}`).catch(() => null);

        if (match?.stage_id) {
          stageId = match.stage_id;
        } else if (match?.version_id) {
          stageId = activeVersions.find((v) => v.id === match.version_id)?.stage_id ?? null;
        }
      }

      if (!stageId) {
        stageId = activeVersions
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          ?.stage_id ?? null;
      }

      if (!stageId) {
        toast({
          title: 'No bracket found',
          description: 'Could not find a bracket stage for this tournament.',
          variant: 'destructive',
        });
        return;
      }

      navigate(`/organizer/tournament/${slug}/manage-bracket/${stageId}`);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to open bracket manager.',
        variant: 'destructive',
      });
    } finally {
      setOpeningBrackets(false);
    }
  }, [slug, tournament?.id, navigate, toast]);

  if (loadingTournament || !tournament) {
    return (
      <PageTransition>
        <div className="min-h-screen flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
        </div>
      </PageTransition>
    );
  }

  if (!workspace.canAssistDisputes) {
    return (
      <PageTransition>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <p className="text-white text-sm font-medium mb-1">No dispute access</p>
          <p className="text-zinc-500 text-xs mb-5">Your role does not include dispute assistance.</p>
          <Button variant="outline" size="sm" onClick={() => navigate(tournamentBase)}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back to tournament
          </Button>
        </div>
      </PageTransition>
    );
  }

  const dispute = workspace.selectedDispute;
  const showDetailOnMobile = !!disputeId;

  const listSidebar = (
    <aside
      className={`flex flex-col min-h-0 bg-[#0a0a0c] border-r border-white/[0.06] w-full lg:w-72 xl:w-80 shrink-0 ${
        showDetailOnMobile ? 'hidden lg:flex' : 'flex'
      }`}
    >
      <div className="shrink-0 p-3 border-b border-white/[0.06] space-y-2">
        <div className="flex gap-1.5">
          {(['open', 'resolved'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => workspace.setFilterTab(key)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-medium transition ${
                workspace.filterTab === key
                  ? key === 'open'
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-emerald-500/15 text-emerald-300'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              {key === 'open' ? `Open (${workspace.openDisputes.length})` : `Closed (${workspace.resolvedDisputes.length})`}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={workspace.searchQuery}
            onChange={(e) => workspace.setSearchQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md text-xs text-white pl-8 pr-2 py-1.5 h-8 outline-none focus:border-rose-500/30"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-white/[0.04]" data-lenis-prevent>
        {workspace.loading && workspace.disputes.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
            Loading…
          </div>
        ) : workspace.filteredDisputes.length === 0 ? (
          <div className="py-8 px-3 text-center text-zinc-500 text-xs">
            No {workspace.filterTab === 'open' ? 'open' : 'closed'} disputes
          </div>
        ) : (
          workspace.filteredDisputes.map((d) => (
            <DisputeListItem
              key={d.id}
              dispute={d}
              active={d.id === disputeId}
              onClick={() => goToDispute(d.id)}
            />
          ))
        )}
      </div>
    </aside>
  );

  let detailPanel: React.ReactNode;

  if (disputeId && workspace.loading && !dispute && workspace.disputes.length === 0) {
    detailPanel = (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    );
  } else if (disputeId && !workspace.loading && !dispute) {
    detailPanel = (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
        <p className="text-zinc-400">Dispute not found.</p>
        <Button size="sm" variant="outline" onClick={goToList}>Back to list</Button>
      </div>
    );
  } else if (dispute) {
    const cfg = statusCfg[dispute.status];
    const StatusIcon = cfg.icon;
    const safeReports = parseDisputeReports(dispute.reports);
    const initialReport = getInitialReport(safeReports, parseMatchDispute(dispute.match_dispute));
    const matchDispute = parseMatchDispute(dispute.match_dispute);
    const safeRiotAccounts = parseDisputeRiotAccounts(dispute.riot_accounts);
    const hasMatch = !!(dispute.match?.team1_name && dispute.match?.team2_name);
    const team1Score = initialReport?.team1_score ?? dispute.match?.team1_score ?? 0;
    const team2Score = initialReport?.team2_score ?? dispute.match?.team2_score ?? 0;
    const isClosed = dispute.status === 'resolved' || dispute.status === 'rejected';

    const handleResolve = async () => {
      if (workspace.resolutionNotes.trim().length < 10) {
        toast({ title: 'Notes required', description: 'Add at least 10 characters.', variant: 'destructive' });
        return;
      }
      setResolving(true);
      const ok = await workspace.handleUpdateStatus(dispute.id, 'resolved');
      setResolving(false);
      if (ok) goToList();
    };

    detailPanel = (
      <div className="p-4 lg:p-5 text-sm">
          {/* Centered match header */}
          <div className="border-b border-white/[0.06] pb-5 mb-5">
            <div className="flex items-center justify-center gap-2 mb-3">
              {dispute.reference_number && (
                <span className="font-mono text-xs text-rose-400/80">{dispute.reference_number}</span>
              )}
              <Badge className={`${cfg.cls} text-[10px] px-1.5 py-0`}>
                <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                {cfg.label}
              </Badge>
            </div>

            {hasMatch ? (
              <div className="flex items-center justify-center gap-6 sm:gap-10">
                <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1 max-w-[140px]">
                  <EntityAvatar
                    src={teamLogos.t1}
                    name={dispute.match!.team1_name}
                    entityId={dispute.match!.team1_id}
                    type="team"
                    size="w-12 h-12"
                  />
                  <span className="text-xs font-medium text-white truncate w-full text-center">
                    {dispute.match!.team1_name}
                  </span>
                  <span className="text-3xl font-bold tabular-nums text-white">{team1Score}</span>
                </div>

                <span className="text-sm font-semibold text-zinc-600 shrink-0">VS</span>

                <div className="flex flex-col items-center gap-1.5 min-w-0 flex-1 max-w-[140px]">
                  <EntityAvatar
                    src={teamLogos.t2}
                    name={dispute.match!.team2_name}
                    entityId={dispute.match!.team2_id}
                    type="team"
                    size="w-12 h-12"
                  />
                  <span className="text-xs font-medium text-white truncate w-full text-center">
                    {dispute.match!.team2_name}
                  </span>
                  <span className="text-3xl font-bold tabular-nums text-white">{team2Score}</span>
                </div>
              </div>
            ) : (
              <h1 className="text-lg font-semibold text-white text-center">{dispute.title}</h1>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <User className="w-3 h-3" />
                Filed by {dispute.raised_by_name}
                {dispute.team_name && ` (${dispute.team_name})`}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
              </span>
              {dispute.match?.match_number != null && (
                <span>Match #{dispute.match.match_number}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-5 items-start">
            {/* Left: evidence + decision */}
            <div className="space-y-5 min-w-0">
              <DisputeEvidencePanel
                reports={safeReports}
                riotAccounts={safeRiotAccounts}
                matchDispute={matchDispute}
                fallbackEvidenceUrl={dispute.evidence_url}
                disputeDescription={dispute.description}
                matchContext={dispute.match ? {
                  team1_name: dispute.match.team1_name,
                  team2_name: dispute.match.team2_name,
                  team1_id: dispute.match.team1_id,
                  team2_id: dispute.match.team2_id,
                  best_of: dispute.match.best_of,
                } : null}
                onImageClick={setViewingImage}
              />

              {isClosed && dispute.resolution_notes && (
                <section className={`pl-3 border-l-2 ${dispute.status === 'resolved' ? 'border-emerald-500' : 'border-rose-500'}`}>
                  <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Resolution</h2>
                  <p className="text-zinc-300 text-xs leading-relaxed">{dispute.resolution_notes}</p>
                </section>
              )}

              {!isClosed && (
                <section className="pt-1 border-t border-white/[0.06]">
                  <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-4">Decision</h2>
                  <div className="space-y-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={openingBrackets}
                      onClick={() => void openOrganizerBracket(dispute.match_id)}
                      className="h-8 text-xs border-white/[0.06] text-zinc-300 hover:text-white"
                    >
                      {openingBrackets ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Open brackets to set score
                    </Button>

                    <Textarea
                      value={workspace.resolutionNotes}
                      onChange={(e) => workspace.setResolutionNotes(e.target.value)}
                      placeholder="Resolution notes for both teams (min. 10 chars)…"
                      className="bg-white/[0.03] border-white/[0.06] text-white text-xs min-h-[64px] rounded-md"
                    />

                    <Button
                      onClick={handleResolve}
                      disabled={resolving || workspace.resolutionNotes.trim().length < 10}
                      size="sm"
                      className="h-8 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white"
                    >
                      {resolving ? 'Saving…' : 'Resolve dispute'}
                    </Button>
                  </div>
                </section>
              )}
            </div>

            {/* Right: conversation */}
            <section className="min-w-0">
              <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Discussion</h2>
              <div className="flex flex-col border border-white/[0.06] rounded-lg overflow-hidden p-3 min-h-[min(560px,calc(100dvh-14rem))]">
                <DisputeConversation
                  pageScroll
                  hideTitle
                  className="flex-1"
                  comments={workspace.comments}
                  loading={workspace.loadingComments}
                  organizerId={tournament.organizer_id}
                  staffUserIds={workspace.activeStaff.map((s) => s.user_id)}
                  canComment={!isClosed}
                  submitting={workspace.submittingComment}
                  uploading={workspace.uploadingAttachment}
                  onSubmit={(text, attachment) => workspace.handleAddComment(dispute.id, text, attachment)}
                  onImageClick={setViewingImage}
                />
              </div>
            </section>
          </div>
        </div>
    );
  } else {
    detailPanel = (
      <div className="p-5">
        <div className="flex flex-col items-start justify-center min-h-[40vh] text-left mb-8">
          <p className="text-sm text-zinc-400">Select a dispute from the list</p>
          <p className="text-xs text-zinc-600 mt-1">Evidence, discussion, and resolution tools appear here.</p>
        </div>
        <section>
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Match lookup</h2>
          <MatchChecker tournamentId={tournament.id} />
        </section>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="h-[calc(100dvh-3.5rem)] flex flex-col bg-[#050505] overflow-hidden">
        {/* Full-width top bar */}
        <header className="shrink-0 w-full border-b border-white/[0.06] bg-[#0a0a0c] px-4 py-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(tournamentBase)}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tournament.name}</span>
            <span className="sm:hidden">Tournament</span>
          </button>

          <div className="h-4 w-px bg-white/[0.08]" />

          {showDetailOnMobile && (
            <button
              type="button"
              onClick={goToList}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white lg:hidden"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              List
            </button>
          )}

          <h1 className="text-sm font-semibold text-white truncate min-w-0">
            Disputes
          </h1>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {badgeCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                {badgeCount} pending
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void workspace.fetchDisputes({ silent: false })}
              className="border-white/[0.06] h-7 w-7 p-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${workspace.loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        {/* Full-width split: list | detail */}
        <div className="flex flex-1 min-h-0 w-full">
          {listSidebar}
          <main
            className={`flex-1 min-w-0 min-h-0 overflow-y-auto overscroll-contain bg-[#050505] scrollbar-thin ${
              showDetailOnMobile ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
            }`}
            data-lenis-prevent
          >
            {detailPanel}
          </main>
        </div>

        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="bg-black/95 border-white/[0.06] max-w-5xl w-[95vw] p-2">
            <DialogHeader className="sr-only">
              <DialogTitle>Evidence preview</DialogTitle>
            </DialogHeader>
            {viewingImage && (
              <img src={viewingImage} alt="Evidence" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default TournamentDisputesPage;
