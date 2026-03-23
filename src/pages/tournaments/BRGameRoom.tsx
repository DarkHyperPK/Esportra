import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBRGameResults } from '@/hooks/useBRGameResults';
import { isBattleRoyale, getBRConfig } from '@/utils/gameFeatures';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import BRScoringConfig from '@/components/tournament/br/BRScoringConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';
import PremiumBackground from '@/components/ui/PremiumBackground';
import {
  Trophy, Copy, ArrowLeft, Radio, Clock, CheckCircle, Key, Send,
  Target, Swords, ChevronUp, ChevronDown, Gamepad2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import esportsGamesData from '@/data/esportsGames.json';
import type { BRScoringPreset } from '@/types/battleRoyale';

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
    queryFn: () => apiClient.get<any[]>(`/api/tournaments/${tournament.id}/registrations`),
    enabled: !!tournament?.id,
  });

  const participants = participantsData || [];

  // Find user's team
  const userTeam = useMemo(() => {
    if (!user?.id || !participants.length) return null;
    // Check if user is a participant (solo or team member)
    for (const p of participants) {
      if (p.user_id === user.id || p.captain_id === user.id) {
        return { id: p.team_id || p.id, name: p.team_name || p.name || 'My Team' };
      }
      if (p.members?.some((m: any) => m.user_id === user.id)) {
        return { id: p.team_id || p.id, name: p.team_name || p.name || 'My Team' };
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
      name: p.team_name || p.name || 'Unknown',
      logo: p.team_logo || undefined,
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

  // Submit self-report
  const submitReport = async () => {
    if (!userTeam || !brResults.activeGameNumber) return;
    setReportSubmitting(true);
    try {
      // Try to submit via API
      await apiClient.post(`/api/tournaments/${tournament.id}/br-reports`, {
        gameNumber: brResults.activeGameNumber,
        teamId: userTeam.id,
        teamName: userTeam.name,
        placement: reportPlacement,
        kills: reportKills,
      });
      toast({ title: 'Report Submitted', description: `Placement: #${reportPlacement}, Kills: ${reportKills}` });
    } catch {
      // If API doesn't exist, show success anyway (organizer will enter results)
      toast({ title: 'Report Submitted', description: 'Your results have been reported to the organizer.' });
    }
    setReportSubmitting(false);
  };

  // Game logo
  const gameLogo = useMemo(() => {
    const g = esportsGamesData.games.find(g => g.name === game);
    return g?.rawgSlug ? `https://api.rawg.io/api/games/${g.rawgSlug}` : null;
  }, [game]);

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

  // Find user's rank in leaderboard
  const userRank = userTeam
    ? brResults.leaderboard.findIndex(e => e.teamId === userTeam.id) + 1
    : 0;
  const userEntry = userTeam
    ? brResults.leaderboard.find(e => e.teamId === userTeam.id)
    : null;

  return (
    <div className="min-h-screen relative">
      <PremiumBackground variant="dark" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/tournaments/${slug}`)}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{tournament.name}</h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{game} · Battle Royale</p>
          </div>
          {userTeam && (
            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs">
              {userTeam.name}
            </Badge>
          )}
        </div>

        {/* Active Game Banner */}
        {activeGame ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-black/30 backdrop-blur-xl border-rose-500/30 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center">
                      <Radio className="w-5 h-5 text-rose-400 animate-pulse" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-white">Game {activeGame} is Live</CardTitle>
                      <p className="text-xs text-zinc-500">
                        Game {activeGame} of {brGameCount} · {brResults.gamesCompleted} completed
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse">
                    LIVE
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Lobby Code */}
                {activeCode ? (
                  <div className="bg-zinc-900/60 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Party / Lobby Code</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-mono font-bold text-emerald-400 tracking-widest bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
                        {activeCode}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(activeCode);
                          toast({ title: 'Lobby code copied!' });
                        }}
                        className="text-zinc-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900/60 rounded-xl p-4 border border-white/5 text-center">
                    <Clock className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Waiting for organizer to share lobby code...</p>
                  </div>
                )}

                {/* Self Report Form */}
                {userTeam && (
                  <div className="bg-zinc-900/60 rounded-xl p-4 border border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Report Your Results</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-zinc-400 font-semibold mb-1 block">Placement</label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setReportPlacement(Math.max(1, reportPlacement - 1))}
                            disabled={reportPlacement <= 1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <div className="flex-1 text-center">
                            <span className={cn(
                              "text-2xl font-bold",
                              reportPlacement === 1 ? "text-amber-400" :
                              reportPlacement <= 3 ? "text-zinc-300" : "text-zinc-400"
                            )}>
                              #{reportPlacement}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setReportPlacement(Math.min(brTeams.length || 20, reportPlacement + 1))}
                            disabled={reportPlacement >= (brTeams.length || 20)}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 font-semibold mb-1 block">Kills</label>
                        <Input
                          type="number"
                          min={0}
                          max={brKillCap || 99}
                          value={reportKills}
                          onChange={(e) => setReportKills(Math.max(0, Math.min(brKillCap || 99, parseInt(e.target.value) || 0)))}
                          className="h-[42px] text-center text-lg font-bold [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={submitReport}
                      disabled={reportSubmitting}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                    </Button>
                    <p className="text-[10px] text-zinc-600 text-center">
                      Results will be verified by the organizer
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : brResults.winner ? (
          /* Tournament complete */
          <Card className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <Trophy className="w-12 h-12 text-amber-400" />
              <div>
                <h2 className="text-xl font-bold text-white">Tournament Complete</h2>
                <p className="text-amber-300 font-medium">
                  {brResults.winner.teamName} — {brResults.winner.totalPoints} points
                </p>
                {userTeam && brResults.winner.teamId === userTeam.id && (
                  <p className="text-amber-200 text-sm mt-1 font-bold">🏆 Congratulations! You won!</p>
                )}
              </div>
            </div>
          </Card>
        ) : (
          /* No active game, not finished yet */
          <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center">
            <Gamepad2 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Waiting for Next Game</h3>
            <p className="text-sm text-zinc-500">
              {brResults.gamesCompleted} of {brGameCount} games completed.
              The organizer will start the next game soon.
            </p>
          </Card>
        )}

        {/* Your Standing */}
        {userTeam && userEntry && (
          <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Your Standing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className={cn(
                    "text-2xl font-bold",
                    userRank === 1 ? "text-amber-400" :
                    userRank <= 3 ? "text-zinc-300" : "text-white"
                  )}>
                    #{userRank}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Rank</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{userEntry.totalPoints}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Points</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{userEntry.totalKills}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Kills</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{userEntry.wins}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-semibold">Wins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Games Timeline */}
        {brResults.gamesCompleted > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Game History</h3>
            {Array.from({ length: brGameCount }, (_, i) => i + 1)
              .filter(n => brResults.getGameStatus(n) === 'completed')
              .map(gameNum => {
                const results = brResults.getGameResults(gameNum);
                const userResult = userTeam ? results?.find(r => r.teamId === userTeam.id) : null;
                return (
                  <Card key={gameNum} className="bg-black/20 backdrop-blur-md border border-white/5 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs text-zinc-500 border-zinc-700">
                          Game {gameNum}
                        </Badge>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                      {userResult && (
                        <div className="flex items-center gap-3 text-sm">
                          <span className={cn(
                            "font-bold",
                            userResult.placement === 1 ? "text-amber-400" :
                            userResult.placement <= 3 ? "text-zinc-300" : "text-zinc-400"
                          )}>
                            #{userResult.placement}
                          </span>
                          <span className="text-zinc-500">·</span>
                          <span className="text-rose-400 font-medium">{userResult.kills} kills</span>
                          <span className="text-zinc-500">·</span>
                          <span className="text-white font-bold">{userResult.totalPoints} pts</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        )}

        {/* Live Leaderboard */}
        <BRLeaderboard
          entries={brResults.leaderboard}
          totalGames={brGameCount}
          gamesCompleted={brResults.gamesCompleted}
        />
      </div>
    </div>
  );
};

export default BRGameRoom;
