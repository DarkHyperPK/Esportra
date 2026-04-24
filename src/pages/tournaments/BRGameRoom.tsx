import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBRGameResults } from '@/hooks/useBRGameResults';
import { useBRPlayerContext, useBRGroupLeaderboard, useBRGroupRounds } from '@/hooks/useBRGroupLeaderboard';
import { useBRCompletedRoundResults, useBRRoundEvidence } from '@/hooks/useBRRounds';
import { useBRGroupParticipants } from '@/hooks/useBRGroups';
import { isBattleRoyale, getBRConfig } from '@/utils/gameFeatures';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import { BRQueueTimerCard } from '@/components/tournament/br/BRQueueTimerCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import PremiumBackground from '@/components/ui/PremiumBackground';
import {
  Trophy, Copy, ArrowLeft, Radio, Clock, CheckCircle, Key, Send,
  Target, Gamepad2, ImagePlus, X, AlertTriangle, ChevronDown, Users,
  Crosshair, Medal, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import esportsGamesData from '@/data/esportsGames.json';
import type { BRScoringPreset } from '@/types/battleRoyale';

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } } },
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const BRGameRoom: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch tournament data
  const { data: tournamentData, isLoading: loadingTournament } = useQuery({
    queryKey: ['tournament-details', slug],
    queryFn: () => apiClient.get<any>(`/api/tournaments/${slug}`),
    enabled: !!slug,
  });

  const tournament = tournamentData?.tournament || tournamentData;
  const participants = tournamentData?.participants || [];
  const stages = tournamentData?.stages || [];
  const game = tournament?.game || '';
  const isBR = isBattleRoyale(game);
  const usesRelationalBrFlow = isBR && stages.length > 0;

  // Find user's team
  const userTeam = useMemo(() => {
    if (!user?.id || !participants.length) return null;
    for (const p of participants) {
      const playerName = p.team_name || p.solo_username || p.solo_full_name || p.name || p.display_name || 'Player';
      if (p.user_id === user.id || p.captain_id === user.id) {
        return { id: p.team_id || p.id, name: playerName };
      }
      if (p.members?.some((m: any) => m.user_id === user.id)) {
        return { id: p.team_id || p.id, name: playerName };
      }
    }
    return null;
  }, [user?.id, participants]);

  // BR config
  const brConf = getBRConfig(game);
  const brSettings = tournament?.settings?.brSettings || {};
  const brPresetKey = brSettings?.brScoringPreset || 'standard';
  const brScoringPreset: BRScoringPreset = brSettings?.brCustomScoring
    || brConf?.scoringPresets?.[brPresetKey]
    || { name: 'Default', placements: [10, 6, 5, 4, 3, 2, 1, 1], killPoints: 1, killCap: null };
  const brKillCap = brSettings?.brKillCap ?? brScoringPreset.killCap ?? null;
  const brGameCount = brSettings?.brGameCount || brConf?.defaultGameCount || 6;

  const brTeams = useMemo(() =>
    participants.map(p => ({
      id: p.team_id || p.id,
      name: p.team_name || p.solo_username || p.solo_full_name || p.name || p.display_name || 'Unknown',
      logo: p.team_logo || p.team_logo_url || undefined,
    })),
    [participants]
  );

  const brResults = useBRGameResults({
    tournamentId: tournament?.id,
    gameCount: brGameCount,
    scoringPreset: brScoringPreset,
    killCap: brKillCap,
    teams: brTeams,
    tiebreaker: brSettings?.brTiebreaker || 'most_wins',
    enabled: !usesRelationalBrFlow,
  });

  // ── New stage-based data sources ─────────────────────────────────────────
  const playerCtx = useBRPlayerContext(tournament?.id, usesRelationalBrFlow);
  const { leaderboard: stageLeaderboard } = useBRGroupLeaderboard(
    playerCtx.context.stageId,
    playerCtx.context.groupId,
  );

  // Self-report state
  const [reportPlacement, setReportPlacement] = useState<number>(1);
  const [reportKills, setReportKills] = useState<number>(0);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke any dangling object URL when evidencePreview changes or component unmounts
  useEffect(() => {
    return () => {
      if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    };
  }, [evidencePreview]);

  const handleEvidenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload a PNG, JPG, or WEBP image.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB.', variant: 'destructive' });
      return;
    }
    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
  };

  const clearEvidence = () => {
    setEvidenceFile(null);
    if (evidencePreview) URL.revokeObjectURL(evidencePreview);
    setEvidencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit self-report with evidence
  const submitReport = async () => {
    const activeRoundNumber = playerCtx.context.activeRound?.roundNumber ?? null;
    if (!userTeam || !activeRoundNumber) return;
    // Belt-and-suspenders: re-check at call time in case cache hasn't updated yet
    const alreadySubmitted = activeEvidence
      .some(ev => ev.teamId === userTeam.id || ev.teamName === userTeam.name);
    if (alreadySubmitted) {
      toast({ title: 'Already submitted', description: 'You have already submitted evidence for this game.', variant: 'destructive' });
      return;
    }
    if (!evidenceFile) {
      toast({ title: 'Evidence required', description: 'Please upload a screenshot of your results.', variant: 'destructive' });
      return;
    }
    setReportSubmitting(true);
    try {
      // Upload evidence image
      let imageUrl = '';
      try {
        const fd = new FormData();
        fd.append('file', evidenceFile);
        fd.append('bucket', 'tournaments.results');
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        imageUrl = url;
      } catch {
        toast({ title: 'Upload failed', description: 'Could not upload evidence image. Please try again.', variant: 'destructive' });
        setReportSubmitting(false);
        return;
      }

      if (activeRoundId) {
        await roundEvidence.submitEvidence({
          imageUrl,
          placement: reportPlacement,
          kills: reportKills,
        });
      } else {
        await brResults.submitEvidence(activeRoundNumber, {
          teamId: userTeam.id,
          teamName: userTeam.name,
          imageUrl,
          submittedAt: new Date().toISOString(),
          placement: reportPlacement,
          kills: reportKills,
        });
      }

      toast({ title: 'Evidence Submitted', description: `Placement: #${reportPlacement}, Kills: ${reportKills}. The organizer will review your submission.` });
      clearEvidence();
    } catch {
      toast({ title: 'Submission failed', description: 'Could not submit your report. Please try again.', variant: 'destructive' });
    }
    setReportSubmitting(false);
  };

  // Game logo
  const gameMeta = useMemo(() => {
    const g = esportsGamesData.games.find(g => g.name === game);
    return g || null;
  }, [game]);

  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [groupRosterOpen, setGroupRosterOpen] = useState(false);
  const [queueNow, setQueueNow] = useState(Date.now());

  const {
    rounds: relationalRounds,
    totalRounds: relationalTotalRounds,
    completedRounds: relationalCompletedRounds,
    activeRound: relationalActiveRound,
    isLoading: relationalRoundsLoading,
  } = useBRGroupRounds(
    playerCtx.context.stageId,
    playerCtx.context.groupId,
    usesRelationalBrFlow && !!playerCtx.context.groupId,
  );
  const normalizedRelationalActiveRound = useMemo(() => {
    if (!relationalActiveRound) return null;

    return {
      id: relationalActiveRound.id,
      roundNumber: relationalActiveRound.round_number,
      lobbyCode: relationalActiveRound.lobby_code,
      status: relationalActiveRound.status,
      queueTimerMinutes: relationalActiveRound.queue_timer_minutes ?? null,
      queueStartedAt: relationalActiveRound.queue_started_at ?? null,
      scheduledAt: relationalActiveRound.scheduled_at ?? null,
    };
  }, [relationalActiveRound]);
  const { data: groupParticipants = [], isLoading: groupParticipantsLoading } = useBRGroupParticipants(
    playerCtx.context.stageId,
    playerCtx.context.groupId,
    usesRelationalBrFlow && groupRosterOpen,
  );

  const activeRound = useMemo(() => {
    if (!usesRelationalBrFlow) return null;

    const relationalRound = normalizedRelationalActiveRound;
    const contextRound = playerCtx.context.activeRound;

    if (!relationalRound) return contextRound;
    if (!contextRound) return relationalRound;

    if (relationalRound.id === contextRound.id) {
      return {
        ...contextRound,
        ...relationalRound,
        lobbyCode: relationalRound.lobbyCode ?? contextRound.lobbyCode,
        queueTimerMinutes: relationalRound.queueTimerMinutes ?? contextRound.queueTimerMinutes,
        queueStartedAt: relationalRound.queueStartedAt ?? contextRound.queueStartedAt,
        scheduledAt: relationalRound.scheduledAt ?? contextRound.scheduledAt,
      };
    }

    const relationalHasPublishedState = Boolean(relationalRound.lobbyCode) || Boolean(relationalRound.queueStartedAt);
    const contextHasPublishedState = Boolean(contextRound.lobbyCode) || Boolean(contextRound.queueStartedAt);

    if (contextHasPublishedState && !relationalHasPublishedState) {
      return contextRound;
    }

    if (relationalHasPublishedState && !contextHasPublishedState) {
      return relationalRound;
    }

    return relationalRound.roundNumber >= contextRound.roundNumber ? relationalRound : contextRound;
  }, [usesRelationalBrFlow, normalizedRelationalActiveRound, playerCtx.context.activeRound]);
  const legacyActiveGame = brResults.activeGameNumber ?? null;
  const activeGame = activeRound?.roundNumber ?? legacyActiveGame;
  const activeRoundId = activeRound?.id ?? null;
  const activeCode = activeRound?.lobbyCode ?? (legacyActiveGame ? brResults.getLobbyCode(legacyActiveGame) : null);
  const activeQueueTimerMinutes = activeRound?.queueTimerMinutes ?? null;
  const queueStartedAtMs = activeRound?.queueStartedAt
    ? new Date(activeRound.queueStartedAt).getTime()
    : null;
  const queueEndsAtMs = queueStartedAtMs && activeQueueTimerMinutes
    ? queueStartedAtMs + (activeQueueTimerMinutes * 60_000)
    : null;
  const roundEvidence = useBRRoundEvidence(
    activeRoundId,
    playerCtx.context.stageId,
    playerCtx.context.groupId,
  );
  const { completedRounds: completedHistoryRounds, resultsByRoundNumber, isLoading: historyResultsLoading } =
    useBRCompletedRoundResults(relationalRounds, usesRelationalBrFlow && historyExpanded);

  const leaderboard = usesRelationalBrFlow ? stageLeaderboard : brResults.leaderboard;
  const gamesCompleted = usesRelationalBrFlow ? relationalCompletedRounds : brResults.gamesCompleted;
  const totalGames = usesRelationalBrFlow && relationalTotalRounds > 0
    ? relationalTotalRounds
    : brGameCount;
  const allGamesFinished = gamesCompleted >= totalGames && totalGames > 0;

  // Find user's rank in leaderboard (match by id only — name-based fallback causes false matches with duplicate team names)
  const userRank = userTeam
    ? leaderboard.findIndex(e => e.teamId === userTeam.id) + 1
    : 0;
  const userEntry = userTeam
    ? leaderboard.find(e => e.teamId === userTeam.id) ?? null
    : null;

  const activeEvidence = activeRoundId
    ? roundEvidence.evidence
    : activeGame
      ? (brResults.getEvidence(activeGame) || [])
      : [];
  const historyGames = usesRelationalBrFlow
    ? completedHistoryRounds.map((round) => ({
        gameNumber: round.round_number,
        results: [...(resultsByRoundNumber.get(round.round_number) ?? [])].sort((a, b) => a.placement - b.placement),
      }))
    : Array.from({ length: totalGames }, (_, i) => i + 1)
        .filter((gameNumber) => brResults.getGameStatus(gameNumber) === 'completed')
        .map((gameNumber) => ({
          gameNumber,
          results: [...(brResults.getGameResults(gameNumber) || [])].sort((a, b) => a.placement - b.placement),
        }));

  // Check if user already submitted evidence for active game
  const userAlreadySubmitted = activeGame && userTeam
    ? activeEvidence.some(ev => ev.teamId === userTeam.id)
    : false;

  // Keep hook order stable across loading/error/ready renders.
  useEffect(() => {
    const isActiveAndUnsubmitted = !!activeGame && !userAlreadySubmitted;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActiveAndUnsubmitted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeGame, userAlreadySubmitted]);

  useEffect(() => {
    if (!queueEndsAtMs) return;
    setQueueNow(Date.now());
    const timer = window.setInterval(() => setQueueNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [queueEndsAtMs]);

  const queueRemainingMs = queueEndsAtMs ? Math.max(0, queueEndsAtMs - queueNow) : null;
  const queueCountdownLabel = queueRemainingMs != null ? formatCountdown(queueRemainingMs) : null;

  if (loadingTournament || (usesRelationalBrFlow && (playerCtx.isLoading || relationalRoundsLoading))) return <PremiumLoadingScreen />;

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">Tournament not found.</p>
      </div>
    );
  }

  if (!isBR) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">This is not a Battle Royale tournament.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <PremiumBackground className="min-h-screen">
      <motion.div
        className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-5"
        variants={stagger.container}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Header ─── */}
        <motion.div variants={stagger.item} className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/tournaments/${slug}`)}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.08] hover:border-white/10 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-white truncate tracking-tight">{tournament.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">{game}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Battle Royale</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700" />
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                {gamesCompleted}/{totalGames} Games
              </span>
            </div>
          </div>
        </motion.div>

        {/* ─── Stale data indicator ─── */}
        {((!usesRelationalBrFlow && brResults.isError) || (usesRelationalBrFlow && playerCtx.error)) && (
          <motion.div variants={stagger.item}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-300/80">Unable to reach the server. Showing last known data.</p>
            </div>
          </motion.div>
        )}

        {/* ─── Group Stage Link ─── */}
        {usesRelationalBrFlow && (
          <motion.div variants={stagger.item}>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <span className="text-xs text-zinc-500">
                {playerCtx.context.groupName
                  ? `Playing in group: ${playerCtx.context.groupName}`
                  : 'Playing in group stage?'}
              </span>
              <button
                type="button"
                onClick={() => setGroupRosterOpen((current) => !current)}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 transition-colors"
              >
                {groupRosterOpen ? 'Hide your group' : 'View your group'} <ArrowLeft className={cn('w-3 h-3 transition-transform', groupRosterOpen ? 'rotate-90' : 'rotate-180')} />
              </button>
            </div>
          </motion.div>
        )}

        {usesRelationalBrFlow && playerCtx.context.groupId && groupRosterOpen && (
          <motion.div variants={stagger.item}>
            <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <Users className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-white tracking-tight">
                      {playerCtx.context.groupName ? `${playerCtx.context.groupName} roster` : 'Group roster'}
                    </CardTitle>
                    <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                      {groupParticipants.length} participant{groupParticipants.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {groupParticipantsLoading ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
                    ))}
                  </div>
                ) : groupParticipants.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-zinc-500">
                    Your group roster is still syncing. Please check back in a moment.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {groupParticipants.map((participant) => (
                      <div
                        key={participant.team_id}
                        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                      >
                        {participant.logo_url ? (
                          <img
                            src={participant.logo_url}
                            alt={participant.team_name}
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            className="h-10 w-10 rounded-full border border-white/[0.08] object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-500">
                            <Users className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{participant.team_name}</p>
                          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                            Seed {participant.seed_order}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Not assigned to a group ─── */}
        {!playerCtx.isInGroup && !playerCtx.isLoading && (
          <motion.div variants={stagger.item}>
            <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl">
              <CardContent className="py-10 px-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Gamepad2 className="w-7 h-7 text-zinc-600" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mb-1">Not Yet Assigned</h3>
                <p className="text-sm text-zinc-500 max-w-xs">
                  You are not assigned to a group yet. Check back soon.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Active Game — LIVE ─── */}
        {activeGame ? (
          <motion.div variants={stagger.item}>
            <div className="relative rounded-2xl overflow-hidden">
              {/* Animated border glow */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-rose-500/40 via-rose-500/10 to-rose-500/40 animate-pulse" />
              <Card className="relative bg-[#0a0a0c]/90 backdrop-blur-xl border-0 rounded-2xl overflow-hidden">
                {/* Live indicator bar */}
                <div className="h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />

                <CardHeader className="pb-0 pt-5 px-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 bg-rose-500/15 rounded-xl flex items-center justify-center border border-rose-500/20">
                          <Gamepad2 className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#0a0a0c] animate-pulse" />
                      </div>
                      <div>
                        <CardTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                          Game {activeGame}
                        </CardTitle>
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-0.5">
                          {gamesCompleted} of {totalGames} completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                      <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Live</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 sm:p-6 space-y-5">
                  {/* Lobby Code — Hero */}
                  {activeCode ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] to-transparent" />
                      <div className="relative p-4 border border-emerald-500/15 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Key className="w-3.5 h-3.5 text-emerald-500/60" />
                          <span className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest">Lobby Code</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-black/40 rounded-lg px-5 py-3 border border-emerald-500/10">
                            <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-[0.2em] select-all">
                              {activeCode}
                            </span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              navigator.clipboard.writeText(activeCode);
                              toast({ title: 'Copied!' });
                            }}
                            className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          >
                            <Copy className="w-5 h-5" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-zinc-800 bg-black/20">
                      <Clock className="w-7 h-7 text-zinc-700 mb-2" />
                      <p className="text-sm text-zinc-500 font-medium">Waiting for lobby code...</p>
                      <p className="text-[10px] text-zinc-700 mt-1">The organizer will share it shortly</p>
                    </div>
                  )}

                  <BRQueueTimerCard
                    queueTimerMinutes={activeQueueTimerMinutes}
                    activeCode={activeCode}
                    queueRemainingMs={queueRemainingMs}
                    queueEndsAtMs={queueEndsAtMs}
                    queueCountdownLabel={queueCountdownLabel}
                  />

                  {/* Self-Report Form */}
                  {userTeam && !userAlreadySubmitted && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Report Your Results</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 block">Placement</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 font-bold text-base">#</span>
                            <Input
                              type="number"
                              min={1}
                              max={Math.max(brTeams.length, 1)}
                              value={reportPlacement}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 1;
                                setReportPlacement(Math.max(1, Math.min(Math.max(brTeams.length, 1), v)));
                              }}
                              className="h-11 text-center text-lg font-bold pl-7 bg-black/30 border-white/[0.06] focus:border-rose-500/40 [color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 block">Kills</label>
                          <Input
                            type="number"
                            min={0}
                            max={brKillCap ?? undefined}
                            value={reportKills}
                            onChange={(e) => {
                              const raw = parseInt(e.target.value) || 0;
                              const cap = brKillCap ?? 99;
                              if (raw > cap && brKillCap != null) {
                                toast({ title: `Kill cap is ${brKillCap}`, description: `Maximum kills counted per game is ${brKillCap}.` });
                              }
                              setReportKills(Math.max(0, Math.min(cap, raw)));
                            }}
                            className="h-11 text-center text-lg font-bold bg-black/30 border-white/[0.06] focus:border-rose-500/40 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* Evidence Upload */}
                      <div>
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2 block">Evidence Screenshot</label>
                        {evidencePreview ? (
                          <div className="relative rounded-xl overflow-hidden border border-white/[0.06] group">
                            <img
                              src={evidencePreview}
                              alt="Evidence preview"
                              className="w-full h-36 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <button
                              type="button"
                              onClick={clearEvidence}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all"
                              aria-label="Remove evidence"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-24 border border-dashed border-zinc-800 hover:border-rose-500/30 rounded-xl flex flex-col items-center justify-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-all duration-200 bg-black/20"
                          >
                            <ImagePlus className="w-5 h-5" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider">Upload screenshot</span>
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleEvidenceSelect}
                          className="hidden"
                        />
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={submitReport}
                        disabled={reportSubmitting || !evidenceFile}
                        className={cn(
                          "w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200",
                          evidenceFile
                            ? "bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                            : "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-white/[0.04]"
                        )}
                      >
                        <Send className="w-4 h-4" />
                        {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                      </motion.button>
                      <p className="text-[9px] text-zinc-700 text-center">
                        The organizer will verify your results and finalize scores.
                      </p>
                    </div>
                  )}

                  {/* Already submitted notice */}
                  {userTeam && userAlreadySubmitted && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-sm text-emerald-300/80">
                        Evidence submitted for Game {activeGame}. Awaiting organizer review.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : allGamesFinished || (leaderboard.length > 0 && gamesCompleted >= totalGames && totalGames > 0) ? (
          /* ─── Tournament Complete ─── */
          (() => {
            const winner = leaderboard.length > 0 ? leaderboard[0] : null;
            const isWinner = userTeam && winner && winner.teamId === userTeam.id;
            const userRankIdx = userTeam ? leaderboard.findIndex(e => e.teamId === userTeam.id) : -1;
            const userRankFinal = userRankIdx >= 0 ? userRankIdx + 1 : null;

            return isWinner ? (
              /* ─── Winner Card ─── */
              <motion.div variants={stagger.item}>
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-amber-400/[0.06] to-yellow-500/15" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.12),transparent_60%)]" />
                  <Card className="relative bg-[#0a0a0c]/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl">
                    <CardContent className="p-6 sm:p-8 text-center">
                      <div className="w-20 h-20 rounded-full bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-10 h-10 text-amber-400" />
                      </div>
                      <h2 className="text-2xl font-black text-amber-300 tracking-tight mb-1">🎉 Congratulations!</h2>
                      <p className="text-lg font-bold text-white">You are the Champion!</p>
                      <p className="text-amber-400/70 text-sm mt-2 font-medium">
                        {winner!.totalPoints} pts · {winner!.wins} win{winner!.wins !== 1 ? 's' : ''} · {winner!.totalKills} kills
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <Medal className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-300">1st Place</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ) : (
              /* ─── Non-Winner Card ─── */
              <motion.div variants={stagger.item}>
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/[0.06] via-transparent to-zinc-500/[0.03]" />
                  <Card className="relative bg-[#0a0a0c]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl">
                    <CardContent className="p-6 sm:p-8">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-8 h-8 text-zinc-500" />
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-bold text-white tracking-tight">Tournament Complete</h2>
                          {winner && (
                            <p className="text-amber-300/80 font-medium text-sm mt-1">
                              Winner: <span className="text-amber-300 font-bold">{winner.teamName}</span>
                              {' '}<span className="text-amber-400/60">— {winner.totalPoints} pts</span>
                            </p>
                          )}
                          {userTeam && (
                            <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                              Thank you for participating!{userRankFinal ? ` You finished #${userRankFinal} overall.` : ''} Better luck next time 💪
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            );
          })()
        ) : (
          /* ─── Waiting for Next Game ─── */
          <motion.div variants={stagger.item}>
            <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl">
              <CardContent className="py-10 px-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Gamepad2 className="w-7 h-7 text-zinc-600" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mb-1">Waiting for Next Game</h3>
                <p className="text-sm text-zinc-500 max-w-xs">
                  {gamesCompleted} of {totalGames} games completed. The organizer will start the next game soon.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Your Standing ─── */}
        {userTeam && userEntry && (
          <motion.div variants={stagger.item}>
            <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Subtle top accent */}
              <div className={cn(
                "h-[2px]",
                userRank === 1 ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent" :
                userRank <= 3 ? "bg-gradient-to-r from-transparent via-zinc-400 to-transparent" :
                "bg-gradient-to-r from-transparent via-zinc-700 to-transparent"
              )} />
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border font-black text-xl",
                    userRank === 1 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                    userRank === 2 ? "bg-zinc-400/10 border-zinc-400/15 text-zinc-300" :
                    userRank === 3 ? "bg-amber-700/10 border-amber-700/15 text-amber-600" :
                    "bg-white/[0.03] border-white/[0.06] text-zinc-400"
                  )}>
                    #{userRank}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white tracking-tight">Your Standing</p>
                    <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                      {userEntry.gamesPlayed} game{userEntry.gamesPlayed !== 1 ? 's' : ''} played
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Points', value: userEntry.totalPoints, color: 'text-white', icon: Flame },
                    { label: 'Kills', value: userEntry.totalKills, color: 'text-rose-400', icon: Crosshair },
                    { label: 'Best', value: `#${userEntry.bestPlacement === 999 ? '-' : userEntry.bestPlacement}`, color: 'text-emerald-400', icon: Target },
                    { label: 'Wins', value: userEntry.wins, color: 'text-amber-400', icon: Trophy },
                  ].map(stat => (
                    <div key={stat.label} className="text-center rounded-xl bg-white/[0.02] border border-white/[0.04] py-3 px-2">
                      <p className={cn("text-xl sm:text-2xl font-bold", stat.color)}>{stat.value}</p>
                      <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── Game History ─── */}
        {gamesCompleted > 0 && (
          <motion.div variants={stagger.item} className="space-y-2">
            <button
              onClick={() => setHistoryExpanded(prev => !prev)}
              className="w-full flex items-center justify-between px-1 py-1 group"
            >
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Game History
              </span>
              <motion.div
                animate={{ rotate: historyExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </motion.div>
            </button>

            <AnimatePresence>
              {historyExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden space-y-3"
                >
                  {usesRelationalBrFlow && historyResultsLoading && (
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] px-4 py-5 text-sm text-zinc-500">
                      Loading round history...
                    </div>
                  )}
                  {!historyResultsLoading && historyGames.length === 0 && (
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.04] px-4 py-5 text-sm text-zinc-500">
                      No completed games yet.
                    </div>
                  )}
                  {historyGames.map(({ gameNumber, results }) => (
                    <div
                      key={gameNumber}
                      className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border-b border-white/[0.05]">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                        <span className="text-sm font-bold text-zinc-200">Game {gameNumber}</span>
                        <span className="text-[10px] text-zinc-600 ml-auto font-mono">{results.length} players</span>
                      </div>

                      <div className="flex items-center px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600 border-b border-white/[0.03] bg-white/[0.01]">
                        <span className="w-6 text-center">#</span>
                        <span className="flex-1 pl-2">Player</span>
                        <span className="w-14 text-center">Place</span>
                        <span className="w-14 text-center">Kills</span>
                        <span className="w-12 text-right">Pts</span>
                      </div>

                      <div className="divide-y divide-white/[0.025]">
                        {results.map((result) => {
                          const teamId = 'team_id' in result ? result.team_id : result.teamId;
                          const teamName = 'team_name' in result ? result.team_name : result.teamName;
                          const totalPointsValue = 'total_points' in result ? result.total_points : result.totalPoints;
                          const isUser = userTeam?.id === teamId;
                          const teamInfo = leaderboard.find((entry) => entry.teamId === teamId);

                          return (
                            <div
                              key={teamId}
                              className={cn(
                                'flex items-center px-4 py-2 text-xs transition-colors',
                                isUser ? 'bg-rose-500/[0.07] border-l-2 border-l-rose-500' : 'hover:bg-white/[0.015]',
                              )}
                            >
                              <span className={cn(
                                'w-6 text-center font-bold tabular-nums',
                                result.placement === 1 ? 'text-amber-400' : result.placement === 2 ? 'text-zinc-300' : result.placement === 3 ? 'text-orange-400' : 'text-zinc-600',
                              )}>
                                {result.placement}
                              </span>
                              <span className={cn(
                                'flex-1 pl-2 truncate font-semibold',
                                isUser ? 'text-white' : 'text-zinc-400',
                              )}>
                                {teamInfo?.teamName || teamName || 'Unknown'}
                                {isUser && <span className="ml-1.5 text-[9px] text-rose-400 font-normal">(you)</span>}
                              </span>
                              <span className={cn(
                                'w-14 text-center font-bold tabular-nums',
                                result.placement === 1 ? 'text-amber-400' : 'text-zinc-400',
                              )}>
                                #{result.placement}
                              </span>
                              <span className="w-14 text-center font-medium tabular-nums text-rose-400">
                                {result.kills}
                              </span>
                              <span className="w-12 text-right font-bold tabular-nums text-white">
                                {totalPointsValue}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─── Leaderboard ─── */}
        <motion.div variants={stagger.item}>
          <BRLeaderboard
            entries={leaderboard}
            totalGames={totalGames}
            gamesCompleted={gamesCompleted}
          />
        </motion.div>

        {/* ─── Dispute Option ─── */}
        {gamesCompleted > 0 && userTeam && (
          <motion.div variants={stagger.item}>
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                <p className="text-xs text-zinc-500 truncate">
                  Disagree with the results? Raise a dispute.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/user/raise-dispute?tournament_id=${tournament.id}`)}
                className="text-xs text-zinc-500 hover:text-rose-400 border border-white/[0.06] hover:border-rose-500/20 rounded-lg px-3 py-1.5 h-auto flex-shrink-0"
              >
                Raise Dispute
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </PremiumBackground>
  );
};

export default BRGameRoom;
