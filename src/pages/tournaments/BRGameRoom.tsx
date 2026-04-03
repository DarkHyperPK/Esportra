import React, { useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBRGameResults } from '@/hooks/useBRGameResults';
import { isBattleRoyale, getBRConfig } from '@/utils/gameFeatures';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import PremiumBackground from '@/components/ui/PremiumBackground';
import {
  Trophy, Copy, ArrowLeft, Radio, Clock, CheckCircle, Key, Send,
  Target, Gamepad2, ImagePlus, X, AlertTriangle, ChevronDown,
  Crosshair, Medal, Flame, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import esportsGamesData from '@/data/esportsGames.json';
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

  // Fetch tournament data
  const { data: tournamentData, isLoading: loadingTournament } = useQuery({
    queryKey: ['tournament-details', slug],
    queryFn: () => apiClient.get<any>(`/api/tournaments/${slug}`),
    enabled: !!slug,
  });

  const tournament = tournamentData?.tournament || tournamentData;
  const game = tournament?.game || '';
  const isBR = isBattleRoyale(game);

  // Fetch participants
  const { data: participantsData } = useQuery({
    queryKey: ['tournament-participants', tournament?.id],
    queryFn: () => apiClient.get<any[]>(`/api/tournaments/${tournament.id}/participants`),
    enabled: !!tournament?.id,
  });

  const participants = participantsData || [];

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
  });

  // Self-report state
  const [reportPlacement, setReportPlacement] = useState<number>(1);
  const [reportKills, setReportKills] = useState<number>(0);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!userTeam || !brResults.activeGameNumber) return;
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

      // Submit evidence via hook
      await brResults.submitEvidence(brResults.activeGameNumber, {
        teamId: userTeam.id,
        teamName: userTeam.name,
        imageUrl,
        submittedAt: new Date().toISOString(),
        placement: reportPlacement,
        kills: reportKills,
      });

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

  if (loadingTournament) return <PremiumLoadingScreen />;

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

  const activeGame = brResults.activeGameNumber;
  const activeCode = activeGame ? brResults.getLobbyCode(activeGame) : null;
  const allGamesFinished = brResults.gamesCompleted >= brGameCount;

  // Find user's rank in leaderboard
  const userRank = userTeam
    ? brResults.leaderboard.findIndex(e => e.teamId === userTeam.id) + 1
    : 0;
  const userEntry = userTeam
    ? brResults.leaderboard.find(e => e.teamId === userTeam.id)
    : null;

  // Check if user already submitted evidence for active game
  const userAlreadySubmitted = activeGame && userTeam
    ? (brResults.getEvidence(activeGame) || []).some(ev => ev.teamId === userTeam.id)
    : false;

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
                {brResults.gamesCompleted}/{brGameCount} Games
              </span>
            </div>
          </div>
          {userTeam && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/[0.08] border border-rose-500/20">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-semibold text-rose-300 truncate max-w-[120px]">{userTeam.name}</span>
            </div>
          )}
        </motion.div>

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
                          {brResults.gamesCompleted} of {brGameCount} completed
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

                  {/* Queue start notice */}
                  {activeGame && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <p className="text-xs text-amber-300/80">Queue will be started <span className="font-semibold text-amber-300">5 minutes</span> after the lobby code goes live.</p>
                    </div>
                  )}

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
                              max={100}
                              value={reportPlacement}
                              onChange={(e) => {
                                const v = parseInt(e.target.value) || 1;
                                setReportPlacement(Math.max(1, Math.min(100, v)));
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
                            max={brKillCap || 99}
                            value={reportKills}
                            onChange={(e) => setReportKills(Math.max(0, Math.min(brKillCap || 99, parseInt(e.target.value) || 0)))}
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
        ) : allGamesFinished || brResults.winner ? (
          /* ─── Tournament Complete ─── */
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
                      {brResults.winner && (
                        <p className="text-amber-300/80 font-medium text-sm mt-1">
                          Winner: <span className="text-amber-300 font-bold">{brResults.winner.teamName}</span>
                          {' '}<span className="text-amber-400/60">— {brResults.winner.totalPoints} pts</span>
                        </p>
                      )}
                      {userTeam && brResults.winner?.teamId === userTeam.id && (
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
          /* ─── Waiting for Next Game ─── */
          <motion.div variants={stagger.item}>
            <Card className="bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl">
              <CardContent className="py-10 px-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <Gamepad2 className="w-7 h-7 text-zinc-600" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight mb-1">Waiting for Next Game</h3>
                <p className="text-sm text-zinc-500 max-w-xs">
                  {brResults.gamesCompleted} of {brGameCount} games completed. The organizer will start the next game soon.
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
        {brResults.gamesCompleted > 0 && (
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
                  {Array.from({ length: brGameCount }, (_, i) => i + 1)
                    .filter(n => brResults.getGameStatus(n) === 'completed')
                    .map(gameNum => {
                      const results = brResults.getGameResults(gameNum);
                      const sorted = results ? [...results].sort((a, b) => a.placement - b.placement) : [];
                      return (
                        <div
                          key={gameNum}
                          className="rounded-2xl bg-white/[0.02] border border-white/[0.04] overflow-hidden"
                        >
                          {/* Header */}
                          <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border-b border-white/[0.05]">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                            <span className="text-sm font-bold text-zinc-200">Game {gameNum}</span>
                            <span className="text-[10px] text-zinc-600 ml-auto font-mono">{sorted.length} players</span>
                          </div>

                          {/* Column headers */}
                          <div className="flex items-center px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600 border-b border-white/[0.03] bg-white/[0.01]">
                            <span className="w-6 text-center">#</span>
                            <span className="flex-1 pl-2">Player</span>
                            <span className="w-14 text-center">Place</span>
                            <span className="w-14 text-center">Kills</span>
                            <span className="w-12 text-right">Pts</span>
                          </div>

                          {/* Rows */}
                          <div className="divide-y divide-white/[0.025]">
                            {sorted.map((r) => {
                              const isUser = userTeam?.id === r.teamId;
                              const teamInfo = brResults.leaderboard.find(e => e.teamId === r.teamId);
                              return (
                                <div
                                  key={r.teamId}
                                  className={cn(
                                    "flex items-center px-4 py-2 text-xs transition-colors",
                                    isUser ? "bg-rose-500/[0.07] border-l-2 border-l-rose-500" : "hover:bg-white/[0.015]"
                                  )}
                                >
                                  <span className={cn(
                                    "w-6 text-center font-bold tabular-nums",
                                    r.placement === 1 ? "text-amber-400" : r.placement === 2 ? "text-zinc-300" : r.placement === 3 ? "text-orange-400" : "text-zinc-600"
                                  )}>
                                    {r.placement}
                                  </span>
                                  <span className={cn(
                                    "flex-1 pl-2 truncate font-semibold",
                                    isUser ? "text-white" : "text-zinc-400"
                                  )}>
                                    {teamInfo?.teamName || r.teamName || 'Unknown'}
                                    {isUser && <span className="ml-1.5 text-[9px] text-rose-400 font-normal">(you)</span>}
                                  </span>
                                  <span className={cn(
                                    "w-14 text-center font-bold tabular-nums",
                                    r.placement === 1 ? "text-amber-400" : "text-zinc-400"
                                  )}>
                                    #{r.placement}
                                  </span>
                                  <span className="w-14 text-center font-medium tabular-nums text-rose-400">
                                    {r.kills}
                                  </span>
                                  <span className="w-12 text-right font-bold tabular-nums text-white">
                                    {r.totalPoints}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ─── Leaderboard ─── */}
        <motion.div variants={stagger.item}>
          <BRLeaderboard
            entries={brResults.leaderboard}
            totalGames={brGameCount}
            gamesCompleted={brResults.gamesCompleted}
          />
        </motion.div>

        {/* ─── Dispute Option ─── */}
        {brResults.gamesCompleted > 0 && userTeam && (
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
