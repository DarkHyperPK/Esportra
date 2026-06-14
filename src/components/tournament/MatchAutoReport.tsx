import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { JackButton } from '@/components/ui/JackButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Trophy, Clock, Swords, Check, Search, Info, SearchX, RefreshCcw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';
import { useMatchResultReport } from '@/hooks/useMatchResultReport';
import { formatDistanceToNow } from 'date-fns';
import { MAP_THEMES, getAgentIcon, getMapSplash } from './fullScoreboardConstants';

interface MatchCandidate {
    id: string;
    map: string;
    mapId: string;
    queueId: string;
    startTime: number;
    gameLengthMillis: number;
    myTeamScore: number;
    enemyTeamScore: number;
    reporterSide?: 'Blue' | 'Red';
    score: string;
    result: 'Victory' | 'Defeat';
    kda: string;
    agent: string;
    blueTeam: { roundsWon: number; won: boolean };
    redTeam: { roundsWon: number; won: boolean };
    players: any[];
    roundTimeline?: Array<{ round: number; winningTeam: string; resultCode?: string | null; result?: string | null; plantSite?: string | null }>;
    economyTimeline?: Array<{ round: number; blueSpent: number; redSpent: number; blueLoadout?: number; redLoadout?: number }>;
    weaponSummaries?: Array<{ weapon: string; roundCount: number }>;
    matchInfo?: {
        mapId?: string | null;
        gameMode?: string | null;
        region?: string | null;
        isRanked?: boolean;
    } | null;
}

interface MatchAutoReportProps {
    matchId: string;
    gameNumber: number;
    mapName: string;
    mapId: string;
    scheduledTime?: string;
    userTeamId?: string;
    team1Id?: string;
    team2Id?: string;
    team1Name?: string;
    team2Name?: string;
    team1Logo?: string;
    team2Logo?: string;
    isCaptain?: boolean;
    onSuccess: () => void;
    className?: string;
}



export const MatchAutoReport: React.FC<MatchAutoReportProps> = ({
    matchId,
    gameNumber,
    mapName,
    mapId,
    scheduledTime,
    userTeamId,
    team1Id,
    team2Id,
    team1Name = 'Team 1',
    team2Name = 'Team 2',
    team1Logo,
    team2Logo,
    isCaptain = true,
    onSuccess,
    className
}) => {
    const {
        activeReport,
        acceptedReport,
        submitReport,
    } = useMatchResultReport(matchId, gameNumber);

    // Scan dialog state
    const [scanOpen, setScanOpen] = useState(false);
    const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'selecting' | 'error'>('idle');
    const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
    const [scanError, setScanError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isTeam1 = userTeamId === team1Id;

    // ── Scan Flow ──
    const handleScan = async () => {
        setScanStep('scanning');
        setScanError(null);
        try {
            const data = await apiClient.post('/api/matches/scan', {
                matchId, gameNumber, mapName, scheduledTime,
            });
            if (data.error) throw new Error(data.error);
            setCandidates(data.matches || []);
            setScanStep('selecting');
        } catch (err: any) {
            console.error('Scan failed:', err);
            setScanError(err.message || 'Failed to scan matches');
            setScanStep('idle');
        }
    };

    const handleSelectMatch = async (candidate: MatchCandidate) => {
        setSubmitting(true);
        try {
            // Determine side identification
            const blueWon = candidate.blueTeam.won;
            const reporterWon = candidate.result === 'Victory';

            // Fallback side logic if reporterSide is missing:
            // If I won and Blue won -> I'm Blue. 
            // If I lost and Blue won -> I'm Red.
            // If I won and Red won -> I'm Red.
            // If I lost and Red won -> I'm Blue.
            const reporterSide = candidate.reporterSide || (reporterWon ? (blueWon ? 'Blue' : 'Red') : (blueWon ? 'Red' : 'Blue'));

            // Map scores correctly to Tournament Team 1 and Team 2
            const team1Score = isTeam1 ? candidate.myTeamScore : candidate.enemyTeamScore;
            const team2Score = isTeam1 ? candidate.enemyTeamScore : candidate.myTeamScore;

            // The winner ID needs to be explicitly the other team if I lost
            const winnerTeamId = reporterWon ? (userTeamId || null) : (isTeam1 ? (team2Id || null) : (team1Id || null));

            console.log('[AutoReport] Submitting Result:', {
                map: candidate.map,
                reporterSide,
                reporterWon,
                isTeam1Reporter: isTeam1,
                team1Score,
                team2Score,
                winnerTeamId
            });

            // Determine which Riot side corresponds to Tournament Team 1
            // Reporter is isTeam1 and on reporterSide → team1 is on that side
            // Reporter is NOT team1 → team1 is on the opposite side
            const t1Side = isTeam1 ? reporterSide : (reporterSide === 'Blue' ? 'Red' : 'Blue');

            await submitReport.mutateAsync({
                gameNumber,
                riotMatchId: candidate.id,
                mapId: mapId || undefined,
                mapName: candidate.map || mapName,
                team1Score,
                team2Score,
                winnerTeamId: winnerTeamId as any,
                reportedByTeamId: (userTeamId || null) as any,
                matchData: {
                    players: candidate.players,
                    blueTeam: candidate.blueTeam,
                    redTeam: candidate.redTeam,
                    queueId: candidate.queueId,
                    gameLengthMillis: candidate.gameLengthMillis,
                    startTime: candidate.startTime,
                    reporterResult: candidate.result,
                    reporterKda: candidate.kda,
                    reporterSide: reporterSide,
                    reportedByTeamId: userTeamId,
                    t1Side: t1Side,
                    roundTimeline: candidate.roundTimeline,
                    economyTimeline: candidate.economyTimeline,
                    weaponSummaries: candidate.weaponSummaries,
                    matchInfo: candidate.matchInfo,
                },
            });

            setScanOpen(false);
            setScanStep('idle');
        } catch (err: any) {
            console.error('Submit failed:', err);
            setScanError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Verification UI is rendered by CaptainMatchPage / MatchResultUpload
    if (acceptedReport || activeReport) {
        return null;
    }

    // ── No Report — Show Scan Button ──
    return (
        <div className="space-y-4 flex flex-col items-center">
            {isCaptain ? (
                <button type="button"
                    onClick={() => setScanOpen(true)}
                    className={cn(buttonVariants(), 'w-full shadow-lg shadow-rose-900/20', className)}
                >
                    <Search className="w-4 h-4 mr-2" />
                    Auto-Fetch Game {gameNumber} Result
                </button>
            ) : (
                <div className="flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg mb-4">
                    <Info className="w-4 h-4 text-indigo-400" />
                    <p className="text-sm text-indigo-300">
                        Ask your team captain to auto-fetch the match result.
                    </p>
                </div>
            )}

            {/* Scan Dialog */}
            <Dialog open={scanOpen} onOpenChange={setScanOpen}>
                <DialogContent className="bg-zinc-900 border border-zinc-700 text-white sm:max-w-2xl px-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Report Game {gameNumber} Result
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Scan your recent matches to find the result for <strong>{mapName}</strong>.
                            The opponent will need to verify.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step: Idle */}
                    {scanStep === 'idle' && (
                        <div className="py-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-indigo-400" />
                            </div>
                            <p className="text-sm text-zinc-300">
                                Make sure you have played the match on <strong>{mapName}</strong> and the game is finished.
                            </p>
                            {scanError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                                    {scanError}
                                </div>
                            )}
                            <div className="flex justify-center mt-6">
                                <button type="button" onClick={handleScan} className={cn(buttonVariants(), 'w-full max-w-[280px] border-transparent bg-indigo-600 hover:bg-indigo-700')}>
                                    <Search className="w-4 h-4 mr-2" />
                                    Scan Recent Matches
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step: Scanning */}
                    {scanStep === 'scanning' && (
                        <div className="py-14 px-6 text-center space-y-5">
                            <div className="mx-auto w-full max-w-xs space-y-3">
                                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                                    <div
                                        className="h-full w-1/3 rounded-full bg-rose-500 motion-safe:animate-[scan-progress_1.2s_ease-in-out_infinite]"
                                        aria-hidden
                                    />
                                </div>
                                <p className="text-sm font-medium text-zinc-300">
                                    Scanning recent matches
                                </p>
                                <p className="text-xs text-zinc-500">
                                    Checking Riot match history for {mapName}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step: Error */}
                    {scanStep === 'error' && (
                        <div className="py-16 text-center space-y-6">
                            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-rose-500" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Verification Failed</h3>
                                <p className="text-zinc-500 text-sm max-w-xs mx-auto font-medium">
                                    {scanError || 'An unexpected error occurred during processing.'}
                                </p>
                            </div>
                            <JackButton
                                onClick={() => setScanStep('idle')}
                                className="px-8"
                            >
                                TRY AGAIN
                            </JackButton>
                        </div>
                    )}

                    {/* Step: Selecting */}
                    {scanStep === 'selecting' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Select Sequence</p>
                                <div className="flex items-center gap-2">
                                    <button type="button"
                                        onClick={handleScan}
                                        disabled={submitting}
                                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-6 px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10')}
                                    >
                                        <RefreshCcw className="w-3 h-3 mr-1.5" />
                                        Refetch
                                    </button>
                                    <span className="bg-zinc-800 text-[10px] px-2 py-0.5 rounded-full font-bold text-zinc-400 border border-zinc-700">
                                        {candidates.length} FOUND
                                    </span>
                                </div>
                            </div>

                            {candidates.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-16 px-6 border border-zinc-800/50 rounded-3xl bg-zinc-950/50 backdrop-blur-sm relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
                                    <div className="relative z-10">
                                        <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-zinc-800 shadow-2xl">
                                            <SearchX className="w-10 h-10 text-zinc-700" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">No Matches Found</h3>
                                        <p className="text-zinc-500 text-sm max-w-[260px] mx-auto leading-relaxed mb-8">
                                            We couldn't find any recent <strong>{mapName}</strong> matches.
                                            Ensure the match is complete and public.
                                        </p>
                                        <button type="button"
                                            onClick={handleScan}
                                            className={cn(buttonVariants({ variant: 'outline' }), 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 text-indigo-400 h-10 px-8 font-black uppercase tracking-widest text-xs transition-all')}
                                        >
                                            <RefreshCcw className="w-3 h-3 mr-2" /> Try Again
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="grid gap-4 max-h-[500px] overflow-y-auto px-2 -mx-2 py-2 pb-10 custom-scrollbar scroll-smooth">
                                    <AnimatePresence mode="popLayout">
                                        {candidates.map((match, idx) => {
                                            const theme = MAP_THEMES[match.map.toLowerCase()] || { color: 'text-zinc-400', bg: 'bg-zinc-800', id: '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047' };
                                            return (
                                                <motion.div
                                                    key={match.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{
                                                        delay: idx * 0.08,
                                                        type: "spring",
                                                        stiffness: 100,
                                                        damping: 15
                                                    }}
                                                    onClick={() => !submitting && handleSelectMatch(match)}
                                                    className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-950/40 backdrop-blur-md hover:border-indigo-500/40 transition-all duration-300 cursor-pointer shadow-xl hover:shadow-indigo-500/5 ${submitting ? 'opacity-50 pointer-events-none' : ''}`}
                                                >
                                                    {/* Map Splash Background */}
                                                    <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700 pointer-events-none">
                                                        <img
                                                            src={getMapSplash(match.mapId?.split('/').pop() || theme.id)}
                                                            alt=""
                                                            className="w-full h-full object-cover grayscale brightness-200 scale-125 group-hover:scale-110 transition-transform duration-1000"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>

                                                    {/* Background Glow */}
                                                    <div className={`absolute -right-8 -top-8 w-32 h-32 blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${match.result === 'Victory' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                                                    <div className="relative p-5 sm:p-7 grid grid-cols-[auto,minmax(80px,1fr),auto,auto,auto] items-center gap-3 sm:gap-6 min-h-[120px]">
                                                        {/* 1. Agent Display */}
                                                        <div className="relative flex-shrink-0">
                                                            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 group-hover:border-indigo-500/30 transition-all duration-500 shadow-2xl shadow-black`}>
                                                                {match.agent ? (
                                                                    <img src={getAgentIcon(match.agent)} loading="lazy" alt="Agent" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Swords className="w-6 h-6 text-zinc-800" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className={`absolute -top-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-black text-[9px] sm:text-[10px] shadow-2xl border border-white/10 backdrop-blur-md ${match.result === 'Victory' ? 'bg-emerald-500/90 text-white' : 'bg-zinc-800/90 text-zinc-400'}`}>
                                                                {match.result === 'Victory' ? 'W' : 'L'}
                                                            </div>
                                                        </div>

                                                        {/* 2. Map Identity */}
                                                        <div className="min-w-0 flex flex-col justify-center gap-1">
                                                            <span className={`text-base sm:text-xl font-black uppercase tracking-tight transition-colors group-hover:text-white ${theme.color}`}>
                                                                {match.map}
                                                            </span>
                                                            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                                                <Clock className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                                                                {formatDistanceToNow(match.startTime)} ago
                                                            </div>
                                                        </div>

                                                        {/* 3. Stats Column (Hidden on mobile) */}
                                                        <div className="hidden lg:flex flex-col items-center px-4 border-l border-white/5 min-w-[90px] whitespace-nowrap">
                                                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2 px-1 text-center opacity-40">KDA Stats</span>
                                                            <div className="text-[11px] font-mono font-black flex items-center gap-1.5 leading-none">
                                                                <span className="text-emerald-400">{match.kda.split('/')[0]}</span>
                                                                <span className="text-zinc-700">/</span>
                                                                <span className="text-rose-500">{match.kda.split('/')[1]}</span>
                                                                <span className="text-zinc-700">/</span>
                                                                <span className="text-zinc-400">{match.kda.split('/')[2]}</span>
                                                            </div>
                                                            <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-2">{match.queueId || 'Custom'}</span>
                                                        </div>

                                                        {/* 4. Score Column */}
                                                        <div className="flex flex-col items-center sm:px-6 border-l border-white/10 py-1 min-w-[110px] sm:min-w-[140px]">
                                                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[.2em] sm:tracking-[.3em] mb-2 opacity-50 px-1 text-center">Scoreboard</span>
                                                            <div className="flex items-center gap-3 sm:gap-5 leading-none">
                                                                <span className={`text-2xl sm:text-4xl font-black tabular-nums tracking-tighter transition-all group-hover:scale-105 ${match.result === 'Victory' ? 'text-emerald-400' : 'text-white'}`}>{match.myTeamScore}</span>
                                                                <div className="text-zinc-800 font-bold text-xl sm:text-2xl opacity-40">/</div>
                                                                <span className={`text-2xl sm:text-4xl font-black tabular-nums tracking-tighter transition-all group-hover:scale-105 ${match.result === 'Victory' ? 'text-zinc-700' : 'text-rose-500'}`}>{match.enemyTeamScore}</span>
                                                            </div>
                                                        </div>

                                                        {/* 5. Select Action */}
                                                        <div className="flex-shrink-0 flex justify-end">
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:border-indigo-400 transition-all duration-300 ring-4 ring-transparent group-hover:ring-indigo-500/10">
                                                                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 group-hover:text-white transition-colors" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                            {scanError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                                    {scanError}
                                </div>
                            )}
                            {submitting && (
                                <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting result report...
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
