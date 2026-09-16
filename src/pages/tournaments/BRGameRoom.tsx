import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  useBRPlayerContext,
  useBRGroupLeaderboard,
  useBRGroupRounds,
} from '@/hooks/useBRGroupLeaderboard';
import { useBRLobbyEvidence, useBRCompletedLobbyResults } from '@/hooks/useBRLobbies';
import { useBRGames } from '@/hooks/useBRGames';
import { useBRRealtime } from '@/hooks/useBRRealtime';
import { isBattleRoyaleTournament, getBRConfig, getPersistedTournamentFormat } from '@/utils/gameFeatures';
import { getQualificationCutoff } from '@/utils/brConfigResolve';
import { useBRStageConfig } from '@/hooks/useBRStageConfig';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import { Button, SuccessButton } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import {
  Trophy, Copy, ArrowLeft, Radio, Clock, CheckCircle, Key, Send,
  Target, Gamepad2, ImagePlus, X, AlertTriangle, ChevronDown, Medal, Shield, User, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';
import { useGameCatalogGame } from '@/hooks/useGameCatalogGame';
import { getMapImageUrl } from '@/utils/gameCatalogBr';
import { resolveActiveBRGameMap, resolveActiveBRGameQueue, isBrGameLive } from '@/utils/brGameContext';
import { BRMapCompact } from '@/components/organizer/br/BRMapOptionList';
import { useBRLobbyReadiness } from '@/hooks/useBRLobbyReadiness';
import { formatMatchPairingFromLabel, formatRoundLabel } from '@/utils/brWaveScheduleDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import type { BRScoringPreset } from '@/types/battleRoyale';

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } } },
};

const BRGameRoom: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: tournamentData, isLoading: loadingTournament } = useQuery({
    queryKey: ['tournament-details', slug],
    queryFn: () => apiClient.get<any>(`/api/tournaments/${slug}`),
    enabled: !!slug,
  });

  const tournament = tournamentData?.tournament || tournamentData;
  const game = tournament?.game || '';
  const tournamentType = getPersistedTournamentFormat(tournament);
  const isBR = isBattleRoyaleTournament(game, tournamentType);
  const { data: catalogGame } = useGameCatalogGame(game);
  const [brStreamConnected, setBrStreamConnected] = useState(false);

  const { context, isInGroup, isLoading: contextLoading } = useBRPlayerContext(
    tournament?.id,
    !!tournament?.id,
    { realtimeConnected: brStreamConnected },
  );

  const { connected } = useBRRealtime({
    stageId: context.stageId,
    groupId: context.groupId,
    lobbyId: context.activeRound?.id ?? null,
    tournamentId: tournament?.id,
    enabled: Boolean(context.stageId && context.groupId),
  });

  useEffect(() => {
    setBrStreamConnected(connected);
  }, [connected]);

  const fallbackPollingMs = connected ? 60_000 : 30_000;
  const { leaderboard } = useBRGroupLeaderboard(
    context.stageId,
    context.groupId,
    { refetchIntervalMs: fallbackPollingMs },
  );
  const { rounds, activeRound } = useBRGroupRounds(
    context.stageId,
    context.groupId,
    { refetchIntervalMs: fallbackPollingMs, realtimeConnected: connected },
  );
  const effectiveActiveRoundId = activeRound?.id ?? context.activeRound?.id ?? context.activeRound?.lobbyId ?? null;
  const hasActiveRound = Boolean(activeRound ?? context.activeRound);
  const { data: lobbyGames = [] } = useBRGames(effectiveActiveRoundId, {
    enabled: Boolean(effectiveActiveRoundId),
  });
  const activeGameFromLobby = useMemo(
    () => lobbyGames.find((g) => g.status === 'active') ?? null,
    [lobbyGames],
  );
  const liveGameNumber = activeGameFromLobby?.game_number ?? null;
  const { evidence, submitEvidence, isSubmitting, refetch: refetchEvidence } = useBRLobbyEvidence(
    effectiveActiveRoundId,
    context.stageId,
    context.groupId,
    {
      realtimeConnected: connected,
      gameNumber: liveGameNumber ?? undefined,
      gameId: activeGameFromLobby?.id ?? context.activeGame?.id ?? null,
    },
  );

  const { data: tournamentStages = [] } = useQuery({
    queryKey: ['tournament-stages', tournament?.id],
    queryFn: () => apiClient.get<any[]>(`/api/tournaments/${tournament!.id}/stages`),
    enabled: !!tournament?.id,
  });
  const { completedGameSlots, resultsByRoundNumber } = useBRCompletedLobbyResults(
    rounds,
    Boolean(context.groupId),
  );

  const { data: participantsData } = useQuery({
    queryKey: ['tournament-participants', tournament?.id],
    queryFn: () => apiClient.get<any[]>(`/api/tournaments/${tournament.id}/participants`),
    enabled: !!tournament?.id,
  });

  const participants = useMemo(() => participantsData || [], [participantsData]);

  const userTeam = useMemo(() => {
    if (!user?.id || !participants.length) return null;
    for (const p of participants) {
      const playerName = p.team_name || p.solo_username || p.solo_full_name || p.name || p.display_name || 'Player';
      if (p.user_id === user.id || p.captain_id === user.id) {
        const participantId = p.id as string;
        const teamId = (p.team_id as string | null | undefined) ?? null;
        return {
          id: teamId ?? participantId,
          participantId,
          teamId,
          name: playerName,
        };
      }
      if (p.members?.some((m: any) => m.user_id === user.id)) {
        const participantId = p.id as string;
        const teamId = (p.team_id as string | null | undefined) ?? null;
        return {
          id: teamId ?? participantId,
          participantId,
          teamId,
          name: playerName,
        };
      }
    }
    return null;
  }, [user?.id, participants]);

  const userEntityIds = useMemo(() => {
    if (!userTeam) return new Set<string>();
    return new Set(
      [userTeam.participantId, userTeam.teamId, userTeam.id].filter(
        (value): value is string => Boolean(value),
      ),
    );
  }, [userTeam]);

  const brConf = getBRConfig(game);
  const brSettings = tournament?.settings?.brSettings || {};
  const brPresetKey = brSettings?.brScoringPreset || 'standard';
  const brScoringPreset: BRScoringPreset = brSettings?.brCustomScoring
    || brConf?.scoringPresets?.[brPresetKey]
    || { name: 'Default', placements: [10, 6, 5, 4, 3, 2, 1, 1], killPoints: 1, killCap: null };
  const brKillCap = brSettings?.brKillCap ?? brScoringPreset.killCap ?? null;
  const gamesPerLobby = context.gamesPerLobby ?? brSettings?.brGameCount ?? brConf?.defaultGameCount ?? 6;
  const totalGames = context.totalGames ?? ((context.totalRounds * gamesPerLobby) || gamesPerLobby);
  const completedGames = context.completedGames ?? context.completedRounds ?? 0;

  const [reportPlacement, setReportPlacement] = useState<number>(1);
  const [reportKills, setReportKills] = useState<number>(0);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);

  const activeRoundNumber = activeRound?.round_number ?? context.activeRound?.waveNumber ?? context.activeRound?.roundNumber ?? null;
  const activeMatchupRaw = context.activeRound?.matchupLabel ?? null;
  const activeMatchup = activeMatchupRaw ? formatMatchPairingFromLabel(activeMatchupRaw) : null;
  const activeCode = activeRound?.lobby_code ?? context.activeRound?.lobbyCode ?? null;
  const activeGameFromContext = context.activeGame;

  const gameQueueFromLobby = useMemo(
    () => resolveActiveBRGameQueue(lobbyGames),
    [lobbyGames],
  );
  const usesPerGameQueue = Boolean(context.gamesModelActive);

  const queueTimerMinutes = usesPerGameQueue
    ? (activeGameFromContext?.queueTimerMinutes
      ?? gameQueueFromLobby.queueTimerMinutes
      ?? null)
    : (activeRound?.queue_timer_minutes ?? context.activeRound?.queueTimerMinutes ?? null);
  const queueStartedAt = usesPerGameQueue
    ? (activeGameFromContext?.queueStartedAt
      ?? gameQueueFromLobby.queueStartedAt
      ?? null)
    : (activeRound?.queue_started_at ?? context.activeRound?.queueStartedAt ?? null);
  const [queueRemainingSec, setQueueRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (!queueStartedAt || !queueTimerMinutes || queueTimerMinutes <= 0) {
      setQueueRemainingSec(null);
      return;
    }
    const endMs = new Date(queueStartedAt).getTime() + queueTimerMinutes * 60_000;
    const tick = () => setQueueRemainingSec(Math.max(0, Math.ceil((endMs - Date.now()) / 1000)));
    tick();
    const timerId = window.setInterval(tick, 1000);
    return () => window.clearInterval(timerId);
  }, [queueStartedAt, queueTimerMinutes]);

  const activeStage = tournamentStages.find((item) => item.id === context.stageId);
  const { config: resolvedStageConfig } = useBRStageConfig(context.stageId, {
    tournamentSettings: tournament?.settings as Record<string, unknown> | undefined,
    stage: activeStage ?? null,
    gameName: game,
    catalogBrConfig: catalogGame?.brConfig,
  });

  const qualificationCutoff = useMemo(() => {
    if (!resolvedStageConfig) return undefined;
    return getQualificationCutoff(resolvedStageConfig, 1);
  }, [resolvedStageConfig]);
  const activeMap = useMemo(() => {
    if (!isBrGameLive(activeGameFromLobby?.status ?? context.activeGame?.status)) return null;
    return activeGameFromLobby?.map ?? context.activeGame?.map ?? resolveActiveBRGameMap(lobbyGames) ?? null;
  }, [activeGameFromLobby, context.activeGame, lobbyGames]);
  const activeMapImageUrl = activeMap ? getMapImageUrl(catalogGame?.brConfig, activeMap) : null;
  const activeGameStatus = useMemo(
    () => activeGameFromLobby?.status ?? context.activeGame?.status ?? null,
    [activeGameFromLobby?.status, context.activeGame?.status],
  );
  const isGameLive = isBrGameLive(activeGameStatus);
  const isLobbyLive = hasActiveRound && !isGameLive;
  const {
    readyCount,
    totalAssigned,
    isReady,
    checkIn,
    checkOut,
    isCheckingIn,
  } = useBRLobbyReadiness(effectiveActiveRoundId, {
    enabled: Boolean(effectiveActiveRoundId && isLobbyLive && userTeam),
    realtimeConnected: connected,
  });
  const gamesCompleted = completedGames;
  const allGamesFinished = totalGames > 0 && gamesCompleted >= totalGames && !hasActiveRound && !context.activeGame;
  const winner = allGamesFinished && leaderboard.length > 0 ? leaderboard[0] : null;
  const progressPercent = totalGames > 0 ? Math.min(100, Math.round((gamesCompleted / totalGames) * 100)) : 0;

  const userRank = userTeam
    ? leaderboard.findIndex((e) => userEntityIds.has(e.teamId)) + 1
    : 0;
  const userEntry = userTeam
    ? leaderboard.find((e) => userEntityIds.has(e.teamId))
    : null;

  const userEvidence = userTeam
    ? evidence.find((item) => userEntityIds.has(item.teamId))
    : undefined;
  const userAlreadySubmitted = Boolean(userEvidence);

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

  const submitReport = async () => {
    if (!userTeam || !effectiveActiveRoundId) return;
    if (!evidenceFile) {
      toast({ title: 'Evidence required', description: 'Please upload a screenshot of your results.', variant: 'destructive' });
      return;
    }
    try {
      let imageUrl = '';
      try {
        const fd = new FormData();
        fd.append('file', evidenceFile);
        fd.append('bucket', 'tournaments.results');
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        imageUrl = url;
      } catch {
        toast({ title: 'Upload failed', description: 'Could not upload evidence image. Please try again.', variant: 'destructive' });
        return;
      }

      await submitEvidence({
        imageUrl,
        placement: reportPlacement,
        kills: reportKills,
        gameNumber: liveGameNumber ?? undefined,
      });

      toast({
        title: 'Evidence Submitted',
        description: `Placement: #${reportPlacement}, Kills: ${reportKills}. The organizer will review your submission.`,
      });
      clearEvidence();

      try {
        await refetchEvidence();
      } catch {
        // PUT succeeded; refetch failure should not look like a failed submission.
      }
    } catch (error) {
      const message = getApiErrorMessage(error, { context: 'brEvidence' });
      if (message.includes('409') || message.toLowerCase().includes('already')) {
        await refetchEvidence();
        clearEvidence();
        toast({
          title: 'Evidence already submitted',
          description: 'Your report for this round is already on file. Awaiting organizer review.',
        });
      } else if (message.includes('403') || message.toLowerCase().includes('forbidden')) {
        toast({ title: 'Not assigned', description: 'You are not assigned to this lobby.', variant: 'destructive' });
      } else {
        toast({ title: 'Submission failed', description: message, variant: 'destructive' });
      }
    }
  };

  if (loadingTournament || contextLoading) return <PremiumLoadingScreen />;

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

  if (!isInGroup) {
    const hint = context.assignmentHint;
    const message =
      hint === 'check_in_required'
        ? 'Check in to the tournament first. The organizer can only place checked-in players into a lobby.'
        : hint === 'registered_not_seeded'
          ? 'You are registered but not seeded into a group yet. Ask the organizer to run group seeding — once assigned, your game room will unlock.'
          : hint === 'not_registered'
            ? 'You are not registered for this tournament yet. Register first, then wait for the organizer to seed groups.'
            : 'You are not assigned to a BR lobby yet. Ask the organizer to confirm you are seeded into a group.';

    return (
      <div className="esportra-ambient-page relative min-h-screen overflow-hidden text-white">
        <div className="relative z-10 max-w-lg mx-auto px-4 py-16 text-center space-y-4">
          <Shield className="w-10 h-10 text-zinc-600 mx-auto" />
          <h1 className="text-lg font-bold text-white">{tournament.name}</h1>
          <p className="text-sm text-zinc-400">{message}</p>
          <Button variant="outline" onClick={() => navigate(`/tournaments/${slug}`)}>Back to tournament</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="esportra-ambient-page relative min-h-screen overflow-hidden text-white">
      <motion.div
        className="relative z-10 max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6"
        variants={stagger.container}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.header variants={stagger.item} className="space-y-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(`/tournaments/${slug}`)}
              className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              aria-label="Back to tournament"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.22em]">Game Room</p>
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate tracking-tight mt-0.5">
                {tournament.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {context.stageName && (
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                    {context.stageName}
                  </span>
                )}
                {context.groupName && (
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
                    {context.groupName}
                  </span>
                )}
                {activeMatchup && (
                  <span className="text-[10px] font-mono text-zinc-500">{activeMatchup}</span>
                )}
              </div>
            </div>
            {connected && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0c]/60 backdrop-blur-md p-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span className="font-medium uppercase tracking-wider">Progress</span>
              <span className="font-mono text-zinc-400">{gamesCompleted} / {totalGames} games</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-green-600"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.header>

        {context.lobbies && context.lobbies.length > 0 && (
          <motion.div variants={stagger.item}>
            <button
              type="button"
              onClick={() => setScheduleExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0a0a0c]/50 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
            >
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Game schedule
              </span>
              <motion.div animate={{ rotate: scheduleExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-zinc-600" />
              </motion.div>
            </button>
            <AnimatePresence>
              {scheduleExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2 rounded-2xl border border-white/[0.06] bg-[#0a0a0c]/40 p-3">
                    {context.lobbies.map((lobby) => (
                      <div key={lobby.lobbyId} className="rounded-xl border border-white/[0.05] p-3">
                        <p className="text-sm text-zinc-300 font-medium">
                          {formatRoundLabel(lobby.waveNumber)}
                          {lobby.matchupLabel ? ` · ${formatMatchPairingFromLabel(lobby.matchupLabel)}` : ''}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {lobby.games.map((gameItem) => (
                            <li key={gameItem.id} className="flex justify-between gap-3 text-xs text-zinc-500">
                              <span>
                                Game {gameItem.gameNumber}
                                {gameItem.map ? ` · ${gameItem.map}` : ''}
                                <span className="ml-2 text-[10px] uppercase text-zinc-600">{gameItem.status}</span>
                              </span>
                              <span className="text-zinc-600 shrink-0">
                                {gameItem.scheduledAt
                                  ? new Date(gameItem.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                  : 'TBD'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeRoundNumber ? (
          <motion.div variants={stagger.item}>
            <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <div className={cn(
                'h-[3px]',
                isGameLive
                  ? 'bg-gradient-to-r from-transparent via-green-500 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-zinc-600 to-transparent',
              )} />

              <CardHeader className="pb-0 pt-5 px-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0',
                      isGameLive
                        ? 'bg-green-600/15 border-green-600/25'
                        : 'bg-white/[0.04] border-white/[0.08]',
                    )}>
                      <Gamepad2 className={cn('w-5 h-5', isGameLive ? 'text-green-400' : 'text-zinc-400')} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {liveGameNumber
                          ? `Game ${liveGameNumber}`
                          : formatRoundLabel(activeRoundNumber)}
                        {activeMatchup ? ` · ${activeMatchup}` : ''}
                      </CardTitle>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">
                        {isGameLive ? 'Match in progress — report when finished' : 'Join the lobby below'}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-1 rounded-full border flex-shrink-0',
                    isGameLive
                      ? 'bg-green-600/10 border-green-600/25'
                      : 'bg-white/[0.03] border-white/[0.08]',
                  )}>
                    <Radio className={cn('w-3 h-3', isGameLive ? 'text-green-400 animate-pulse' : 'text-zinc-500')} />
                    <span className={cn(
                      'text-[10px] font-bold uppercase tracking-widest',
                      isGameLive ? 'text-green-400' : 'text-zinc-400',
                    )}>
                      {isGameLive ? 'In game' : 'Lobby live'}
                    </span>
                  </div>
                </div>
              </CardHeader>

                <CardContent className="p-5 sm:p-6 space-y-5">
                  {queueRemainingSec != null && queueRemainingSec > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-200 uppercase tracking-wider">
                          {usesPerGameQueue || isGameLive ? 'Queue closes in' : 'Lobby queue closes in'}
                        </span>
                      </div>
                      <span className="text-lg font-mono font-bold text-amber-300 tabular-nums">
                        {String(Math.floor(queueRemainingSec / 60)).padStart(2, '0')}:
                        {String(queueRemainingSec % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}

                  {BR_FEATURE_FLAGS.mapsEnabled && isGameLive && activeMap && (
                    <BRMapCompact mapName={activeMap} imageUrl={activeMapImageUrl} />
                  )}

                  {userTeam && isLobbyLive && activeCode && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Lobby readiness</p>
                            <p className="text-sm text-zinc-300">
                              {readyCount}/{totalAssigned || '—'} teams checked in
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={isReady ? 'outline' : 'default'}
                          disabled={isCheckingIn}
                          onClick={() => { void (isReady ? checkOut() : checkIn()); }}
                          className={cn(
                            'flex-shrink-0',
                            !isReady && 'bg-emerald-600 hover:bg-emerald-500 text-white',
                          )}
                        >
                          {isReady ? 'Undo check-in' : "I'm in the lobby"}
                        </Button>
                      </div>
                      {isReady && (
                        <p className="text-xs text-emerald-400/90 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Organizer can see you are ready.
                        </p>
                      )}
                    </div>
                  )}

                  {activeCode ? (
                    <div className="rounded-2xl border border-green-600/20 bg-green-600/[0.06] p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Key className="w-4 h-4 text-green-500/80" />
                        <span className="text-[10px] text-green-500/80 font-bold uppercase tracking-[0.2em]">Lobby Code</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-black/30 rounded-xl px-5 py-4 border border-green-600/15">
                          <span className="text-2xl sm:text-3xl font-mono font-black text-green-400 tracking-[0.25em] select-all">
                            {activeCode}
                          </span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            navigator.clipboard.writeText(activeCode);
                            toast({ title: 'Copied!' });
                          }}
                          className="w-12 h-12 rounded-xl bg-green-600/15 border border-green-600/30 flex items-center justify-center text-green-400 hover:bg-green-600/25 transition-colors"
                          aria-label="Copy lobby code"
                        >
                          <Copy className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-zinc-800 bg-black/20">
                      <Clock className="w-7 h-7 text-zinc-700 mb-2" />
                      <p className="text-sm text-zinc-500 font-medium">Waiting for lobby code...</p>
                      <p className="text-[10px] text-zinc-700 mt-1">The organizer will share it shortly</p>
                    </div>
                  )}

                  {userTeam && !isGameLive && !userAlreadySubmitted && activeCode && (
                    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                      <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-zinc-300 font-medium">
                          {liveGameNumber
                            ? `Game ${liveGameNumber} hasn't started yet`
                            : 'Waiting for the match to start'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Join with the lobby code above. Result reporting opens when the organizer starts the game.
                        </p>
                      </div>
                    </div>
                  )}

                  {userTeam && isGameLive && !userAlreadySubmitted && (
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
                              max={100}
                              value={reportPlacement}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 1;
                                setReportPlacement(Math.max(1, Math.min(100, v)));
                              }}
                              className="h-11 text-center text-lg font-bold pl-7 bg-black/30 border-white/[0.06] focus:border-green-600/40 [color-scheme:dark]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 block">Kills</label>
                          <Input
                            type="number"
                            min={0}
                            max={brKillCap || 99}
                            value={reportKills}
                            onChange={(e) => setReportKills(Math.max(0, Math.min(brKillCap || 99, parseInt(e.target.value) || 0)))}
                            className="h-11 text-center text-lg font-bold bg-black/30 border-white/[0.06] focus:border-green-600/40 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2 block">Evidence Screenshot</label>
                        {evidencePreview ? (
                          <div className="relative rounded-xl overflow-hidden border border-white/[0.06] group">
                            <img src={evidencePreview} alt="Evidence preview" className="w-full h-36 object-cover" />
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
                            className="w-full h-24 border border-dashed border-zinc-800 hover:border-green-600/30 rounded-xl flex flex-col items-center justify-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-all duration-200 bg-black/20"
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

                      <SuccessButton
                        type="button"
                        onClick={submitReport}
                        disabled={isSubmitting || !evidenceFile}
                        className="w-full h-11"
                      >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                      </SuccessButton>
                      <p className="text-[9px] text-zinc-700 text-center">
                        The organizer will verify your results and finalize scores.
                      </p>
                    </div>
                  )}

                  {userTeam && userAlreadySubmitted && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-sm text-emerald-300/80">
                        Evidence submitted for {liveGameNumber ? `Game ${liveGameNumber}` : formatRoundLabel(activeRoundNumber)}.
                        {userEvidence?.reviewed
                          ? ' Your reported result has been approved.'
                          : ' Awaiting organizer review.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
          </motion.div>
        ) : allGamesFinished || winner ? (
          <motion.div variants={stagger.item}>
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-amber-500/[0.04]" />
              <Card className="relative bg-[#0a0a0c]/90 backdrop-blur-xl border border-amber-500/20 rounded-2xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Tournament Complete</h2>
                      {winner && (
                        <p className="text-amber-300/80 font-medium text-sm mt-1">
                          Winner: <span className="text-amber-300 font-bold">{winner.teamName}</span>
                          {' '}<span className="text-amber-400/60">— {winner.totalPoints} pts</span>
                        </p>
                      )}
                      {userTeam && winner && userEntityIds.has(winner.teamId) && (
                        <p className="text-amber-200 text-sm mt-1.5 font-bold flex items-center gap-1.5">
                          <Medal className="w-4 h-4" /> Congratulations! You won!
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={stagger.item}>
            <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl">
              <CardContent className="py-10 px-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Gamepad2 className="w-7 h-7 text-zinc-600" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mb-1">Waiting for Next Round</h3>
                <p className="text-sm text-zinc-500 max-w-xs">
                  {gamesCompleted} of {totalGames} games completed. The organizer will start the next game soon.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {userTeam && userEntry && (
          <motion.div variants={stagger.item}>
            <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className={cn(
                'h-[2px]',
                userRank === 1 ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent' :
                userRank <= 3 ? 'bg-gradient-to-r from-transparent via-zinc-400 to-transparent' :
                'bg-gradient-to-r from-transparent via-zinc-700 to-transparent',
              )} />
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center border font-black text-xl',
                    userRank === 1 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    userRank === 2 ? 'bg-zinc-400/10 border-zinc-400/15 text-zinc-300' :
                    userRank === 3 ? 'bg-amber-700/10 border-amber-700/15 text-amber-600' :
                    'bg-white/[0.03] border-white/[0.06] text-zinc-400',
                  )}>
                    #{userRank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                      <span className="truncate">{userTeam.name}</span>
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mt-0.5">
                      Your standing · {userEntry.gamesPlayed} round{userEntry.gamesPlayed !== 1 ? 's' : ''} played
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Points', value: userEntry.totalPoints, color: 'text-white' },
                    { label: 'Kills', value: userEntry.totalKills, color: 'text-green-400' },
                    { label: 'Best', value: `#${userEntry.bestPlacement === 999 ? '-' : userEntry.bestPlacement}`, color: 'text-emerald-400' },
                    { label: 'Wins', value: userEntry.wins, color: 'text-amber-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center rounded-xl bg-white/[0.02] border border-white/[0.04] py-3 px-2">
                      <p className={cn('text-xl sm:text-2xl font-bold', stat.color)}>{stat.value}</p>
                      <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {gamesCompleted > 0 && (
          <motion.div variants={stagger.item} className="space-y-2">
            <button
              onClick={() => setHistoryExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between px-1 py-1 group"
            >
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Round History
              </span>
              <motion.div animate={{ rotate: historyExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
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
                  className="overflow-hidden space-y-2"
                >
                  {completedGameSlots.map((slot) => {
                    const roundOrdinal = slot.lobby.round_number ?? slot.lobby.wave_number;
                    const resultKey = slot.gameNumber > 1
                      ? roundOrdinal * 100 + slot.gameNumber
                      : roundOrdinal;
                    const results = resultsByRoundNumber.get(resultKey) ?? [];
                    const userResult = userTeam
                      ? results.find((r) => userEntityIds.has(r.team_id))
                      : null;
                    const label = slot.gameNumber > 1
                      ? `${formatRoundLabel(roundOrdinal)} · Game ${slot.gameNumber}`
                      : formatRoundLabel(roundOrdinal);
                    return (
                      <div
                        key={`${slot.lobby.id}-${slot.gameNumber}`}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                          <span className="text-sm font-semibold text-zinc-300">{label}</span>
                        </div>
                        {userResult ? (
                          <div className="flex items-center gap-3 text-xs">
                            <span className={cn(
                              'font-bold px-2 py-0.5 rounded',
                              userResult.placement === 1 ? 'text-amber-400 bg-amber-500/10' :
                              userResult.placement <= 3 ? 'text-zinc-300 bg-white/[0.04]' : 'text-zinc-500',
                            )}>
                              #{userResult.placement}
                            </span>
                            <span className="text-green-400 font-medium">{userResult.kills} kills</span>
                            <span className="text-white font-bold">{userResult.total_points} pts</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-700 font-mono">No data</span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <motion.div variants={stagger.item}>
          <BRLeaderboard
            entries={leaderboard}
            totalGames={totalGames}
            gamesCompleted={gamesCompleted}
            qualificationCutoff={qualificationCutoff}
          />
        </motion.div>

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
                className="text-xs text-zinc-500 hover:text-rose-400 border border-white/[0.06] hover:border-white/20 rounded-lg px-3 py-1.5 h-auto flex-shrink-0"
              >
                Raise Dispute
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default BRGameRoom;
