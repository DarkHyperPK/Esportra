import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { JackButton } from '@/components/ui/JackButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Trophy, Clock, Search, Info, SearchX, RefreshCcw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';
import { useMatchResultReport } from '@/hooks/useMatchResultReport';
import { useSubmitRiotReport } from '@/hooks/useSubmitRiotReport';
import type { RiotMatchCandidate } from '@/types/riotMatchCandidate';
import { RiotMatchCandidateList } from './RiotMatchCandidateList';

type MatchCandidate = RiotMatchCandidate;

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
    team1Name: _team1Name = 'Team 1',
    team2Name: _team2Name = 'Team 2',
    team1Logo: _team1Logo,
    team2Logo: _team2Logo,
    isCaptain = true,
    onSuccess: _onSuccess,
    className
}) => {
    const {
        activeReport,
        acceptedReport,
    } = useMatchResultReport(matchId, gameNumber);
    const submitRiot = useSubmitRiotReport(matchId, gameNumber);

    // Scan dialog state
    const [scanOpen, setScanOpen] = useState(false);
    const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'selecting' | 'error'>('idle');
    const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
    const [scanError, setScanError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);


    // ── Scan Flow ──
    const handleScan = async () => {
        setScanStep('scanning');
        setScanError(null);
        try {
            const data = await apiClient.post<{ error?: string; matches?: MatchCandidate[] }>('/api/matches/scan', {
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
        if (!userTeamId) return;
        setSubmitting(true);
        try {
            await submitRiot.mutateAsync({
                candidate,
                ctx: { gameNumber, userTeamId, team1Id, team2Id, mapId, mapName },
            });
            setScanOpen(false);
            setScanStep('idle');
        } catch (err) {
            setScanError(err instanceof Error ? err.message : 'Could not submit the result.');
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
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-4">
                    <Info className="w-4 h-4 text-rose-400" />
                    <p className="text-sm text-rose-300">
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
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Clock className="w-8 h-8 text-rose-400" />
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
                                <button type="button" onClick={handleScan} className={cn(buttonVariants(), 'w-full max-w-[280px] border-transparent bg-rose-600 hover:bg-rose-700')}>
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
                                        className="h-full w-1/3 rounded-full bg-rose-500 animate-[scan-progress_1.2s_ease-in-out_infinite]"
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
                                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-6 px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10')}
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
                                    <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent pointer-events-none" />
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
                                            className={cn(buttonVariants({ variant: 'outline' }), 'border-white/10 bg-rose-500/5 hover:bg-rose-500/10 hover:border-white/20 text-rose-400 h-10 px-8 font-black uppercase tracking-widest text-xs transition-all')}
                                        >
                                            <RefreshCcw className="w-3 h-3 mr-2" /> Try Again
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <RiotMatchCandidateList candidates={candidates} submitting={submitting} onSelect={handleSelectMatch} />
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
