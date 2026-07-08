import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsTable } from './StandingsTable';
import { standingsService, TeamStanding } from '@/services/bracket/StandingsService';
import { BracketMatch } from '@/types/bracketTypes';
import { MatchCard } from '@/pages/tournaments/brackets/MatchCard';
import { ReadOnlyMatchCard } from '@/components/bracket/ReadOnlyMatchCard';
import { Button, SuccessButton } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { SwissGenerator } from '@/services/bracket/SwissGenerator';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Undo2, Check, Copy, Gamepad2, Swords } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraphMatchService } from '@/services/bracket/GraphMatchService';
import { MapVeto } from '@/components/tournament/MapVeto';
import { StageProgressChip } from '@/components/tournament/StageProgressChip';
import { useStageCompletion } from '@/hooks/useStageCompletion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FilterState } from '@/components/bracket/BracketSidebarFilter';
import { isMatchTooEarlyForLive } from '@/lib/timeUtils';

interface SwissViewProps {
    stageId: string;
    versionId: string;
    matches: BracketMatch[];
    isOrganizer?: boolean;
    onMatchUpdate?: () => void;
    tournamentId?: string;
    game?: string;
    onByeAdvance?: (matchId: string) => void;
    stage?: any;
    activeFilter?: FilterState;
    onMatchClick?: (match: BracketMatch) => void;
    onMatchRoom?: (match: BracketMatch) => void;
    hasResultsMap?: Record<string, any[]>;
    hasProofsMap?: Record<string, string[]>;
    canUseMapVeto?: boolean;
    suppressVetoRoleSwitchPrompt?: boolean;
    hoveredTeamId?: string | null;
    onTeamHover?: (teamId: string | null) => void;
}

// Extracted Component to prevent re-renders
const SwissGroupPanel = React.memo(({
    groupMatches,
    groupStandings,
    isOrganizer,
    isProcessing,
    expandedMatch,
    toggleExpand,
    handleScoreChange,
    openGoLive,
    openMapVeto,
    openPartyCode,
    saveScore,
    scoreDraftRef,
    onByeAdvance,
    advancementCount,
    activeFilter,
    eliminationCount,
    qualificationWins,
    onMatchClick,
    onMatchRoom,
    hasResultsMap = {},
    hasProofsMap = {},
    canUseMapVeto = false,
    suppressVetoRoleSwitchPrompt: _suppressVetoRoleSwitchPrompt = false,
    hoveredTeamId,
    onTeamHover
}: {
    groupMatches: BracketMatch[],
    groupStandings: TeamStanding[],
    isOrganizer: boolean,
    isProcessing: boolean,
    expandedMatch: string | null,
    toggleExpand: (id: string) => void,
    handleScoreChange: (id: string, t: 't1' | 't2', v: string) => void,
    openGoLive: (m: BracketMatch, code?: string, force?: boolean) => void,
    openMapVeto: (m: BracketMatch) => void,
    openPartyCode: (m: BracketMatch) => void,
    saveScore: (m: BracketMatch) => void,
    scoreDraftRef: React.MutableRefObject<Record<string, { t1: string; t2: string }>>,
    onByeAdvance?: (matchId: string) => void,
    advancementCount?: number,
    activeFilter?: FilterState,
    eliminationCount?: number,
    qualificationWins?: number,
    onMatchClick?: (match: BracketMatch) => void,
    onMatchRoom?: (match: BracketMatch) => void,
    hasResultsMap?: Record<string, any[]>,
    hasProofsMap?: Record<string, string[]>,
    canUseMapVeto?: boolean,
    suppressVetoRoleSwitchPrompt?: boolean,
    hoveredTeamId?: string | null,
    onTeamHover?: (teamId: string | null) => void
}) => {
    // Helper to get raw ID (remove prefixes if present)
    const getRawId = (id: string | number) => String(id).replace(/^(db-|wb-|lb-|source-)/, '');

    const matchesByRound = useMemo(() => groupMatches.reduce((acc, match) => {
        const round = match.round || (match as any).round_number || 1;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {} as Record<number, BracketMatch[]>), [groupMatches]);

    const rounds = useMemo(() => Object.keys(matchesByRound).map(Number).sort((a, b) => b - a), [matchesByRound]);

    const filteredRounds = useMemo(() => {
        if (!activeFilter || activeFilter.type === 'all') return rounds;
        if (activeFilter.type === 'winners') {
            return rounds.filter(r => r === activeFilter.round);
        }
        return [];
    }, [rounds, activeFilter]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Matches */}
            <div className="lg:col-span-7 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white">Matches</h3>
                </div>

                {filteredRounds.map(round => (
                    <Card key={round} className="bg-zinc-900/30 border-white/10">
                        <CardHeader className="py-4">
                            <CardTitle className="text-base font-medium text-white">Round {round}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[700px] overflow-y-auto overscroll-contain pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent" data-lenis-prevent>
                                {matchesByRound[round]?.sort((a, b) => (a.matchNumber - b.matchNumber) || a.id.localeCompare(b.id)).map(match => (
                                    <div key={match.id} className="relative">
                                        {isOrganizer ? (
                                            <MatchCard
                                                match={match}
                                                label={match.groupId ? `${match.groupId}.R${round}.M${match.matchNumber}` : `R${round}.M${match.matchNumber}`}
                                                isOrganizer={isOrganizer}
                                                isProcessing={isProcessing}
                                                expandedMatchId={expandedMatch}
                                                onToggleExpand={toggleExpand}
                                                onScoreChange={handleScoreChange}
                                                onGoLive={openGoLive}
                                                onMapVeto={canUseMapVeto ? openMapVeto : undefined}
                                                onPartyCode={openPartyCode}
                                                onSaveScore={saveScore}
                                                scoreDraftRef={scoreDraftRef}
                                                onByeAdvance={onByeAdvance}
                                                onMatchRoom={onMatchRoom}
                                            />
                                        ) : (
                                            <ReadOnlyMatchCard
                                                match={match}
                                                label={match.groupId ? `${match.groupId}.R${round}.M${match.matchNumber}` : `R${round}.M${match.matchNumber}`}
                                                className="w-[260px]"
                                                onClick={() => onMatchClick?.(match)}
                                                hasAutomatedResults={hasResultsMap[getRawId(match.id)]?.length > 0}
                                                hasProofs={hasProofsMap[getRawId(match.id)]?.length > 0}
                                                hoveredTeamId={hoveredTeamId}
                                                onTeamHover={onTeamHover}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {rounds.length === 0 && (
                    <div className="text-center p-12 text-zinc-500 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
                        No matches generated yet.
                    </div>
                )}
            </div>

            {/* Right Column: Standings */}
            <div className="lg:col-span-5">
                <div className="sticky top-6">
                    <StandingsTable
                        standings={groupStandings}
                        title="Live Standings"
                        advancementCount={advancementCount}
                        eliminationCount={eliminationCount}
                        qualificationWins={qualificationWins}
                    />
                </div>
            </div>
        </div>
    );
});

export const SwissView: React.FC<SwissViewProps> = ({
    stageId,
    versionId,
    matches,
    isOrganizer,
    onMatchUpdate,
    tournamentId,
    game = 'valorant',
    onByeAdvance,
    stage,
    activeFilter,
    onMatchClick,
    onMatchRoom,
    hasResultsMap,
    hasProofsMap,
    canUseMapVeto = false,
    suppressVetoRoleSwitchPrompt = false,
    hoveredTeamId,
    onTeamHover
}) => {
    const { toast } = useToast();
    const [standings, setStandings] = useState<TeamStanding[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Match Interaction State
    const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
    const scoreDraftRef = useRef<Record<string, { t1: string; t2: string }>>({});
    const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
    const [goLiveMatch, setGoLiveMatch] = useState<BracketMatch | null>(null);
    const [partyCodeInput, setPartyCodeInput] = useState('');
    const [partyCodeOpen, setPartyCodeOpen] = useState(false);
    const [partyCodeMatch, setPartyCodeMatch] = useState<BracketMatch | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mapVetoOpen, setMapVetoOpen] = useState(false);
    const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);

    const { isComplete, alreadyAdvanced, progressLabel } = useStageCompletion(stageId);

    // Helpers
    const getRawId = (id: string | number) => String(id).replace('db-', '');
    const isDbMatch = (id: string | number) => String(id).startsWith('db-');

    // Load Standings
    useEffect(() => {
        const loadStandings = async () => {
            const data = await standingsService.calculateStandings(stageId);
            setStandings(data);
        };
        loadStandings();
    }, [matches, stageId]);

    // Group Logic
    const groups = useMemo(() => {
        const uniqueGroups = Array.from(new Set(matches.map(m => m.groupId || (m as any).group_id).filter(Boolean)));
        return uniqueGroups.sort();
    }, [matches]);

    const hasGroups = groups.length > 0;

    // Determine current round
    const allRounds = matches.map(m => m.round || (m as any).round_number || 1);
    const currentRound = allRounds.length > 0 ? Math.max(...allRounds) : 0;
    const isRoundComplete = matches.filter(m => (m.round || (m as any).round_number) === currentRound).every(m => m.status === 'completed');

    // Calculate Max Rounds
    const totalTeams = standings.length > 0
        ? standings.length
        : new Set([
            ...matches.map(m => m.team1?.id).filter(Boolean),
            ...matches.map(m => m.team2?.id).filter(Boolean)
        ] as string[]).size;

    const parsedStageConfig = stage?.config
        ? (typeof stage.config === 'string' ? (() => { try { return JSON.parse(stage.config); } catch { return stage.config; } })() : stage.config)
        : null;
    const configuredMaxRounds = parsedStageConfig?.swiss_rounds ? parseInt(parsedStageConfig.swiss_rounds) : null;
    const maxRounds = configuredMaxRounds || (totalTeams > 0 ? Math.ceil(Math.log2(totalTeams)) : 99);

    // Debug logging
    console.log('[SwissView] Stage config:', {
        stageId,
        hasStage: !!stage,
        config: stage?.config,
        configuredMaxRounds,
        maxRounds,
        currentRound
    });

    const isMaxRoundsReached = currentRound >= maxRounds;
    const isAllMatchesComplete = matches.length > 0 && matches.every(m => m.status === 'completed');
    const canFinalizeStage = isMaxRoundsReached && isAllMatchesComplete;

    // Swiss Standard Thresholds
    // Typically: For N rounds, win threshold is ceil(N/2) + 1?
    // Actually, "3 lives" means Elimination at 3 losses.
    // Qualification usually matches Elimination count (3 wins to qualify, 3 losses to eliminate).
    // Let's deduce from maxRounds.
    // 3 Rounds -> 2 wins qualify, 2 losses elim.
    // 5 Rounds -> 3 wins qualify, 3 losses elim.
    // Formula: ceil((maxRounds + 1) / 2)
    const threshold = Math.ceil((maxRounds + 1) / 2);

    // Finalize stage — completion is derived from match results

    // Handlers
    const handleGenerateNextRound = async () => {
        if (isMaxRoundsReached) {
            toast({ title: 'Stage Completed', description: 'Max rounds reached.', variant: 'default' });
            return;
        }

        setIsGenerating(true);
        try {
            // Re-calc current round just primarily safe
            const allRounds = matches.map(m => m.round || (m as any).round_number || 1);
            const cr = allRounds.length > 0 ? Math.max(...allRounds) : 0;

            const result = await SwissGenerator.generateNextRound(stageId, versionId, cr);
            if (result.success) {
                toast({ title: 'Round Generated', description: `Round ${cr + 1} pairings created.` });
                onMatchUpdate?.();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error) {
            console.error('Generation error:', error);
            toast({ title: 'Error', description: 'Failed to generate round.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUndoRound = async () => {
        const allRounds = matches.map(m => m.round || (m as any).round_number || 1);
        const cr = allRounds.length > 0 ? Math.max(...allRounds) : 0;

        if (cr <= 1) {
            toast({ title: 'Cannot Undo', description: 'Cannot delete the first round. Reset the stage instead.', variant: 'destructive' });
            return;
        }

        if (!confirm(`Are you sure you want to delete Round ${cr}? This cannot be undone.`)) return;

        setIsGenerating(true);
        try {
            const result = await SwissGenerator.deleteRound(stageId, cr);
            if (result.success) {
                toast({ title: 'Round Deleted', description: `Round ${cr} has been removed.` });
                onMatchUpdate?.();
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            console.error('Undo error:', error);
            toast({ title: 'Error', description: 'Failed to delete round.', variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAutoAdvanceByes = async () => {
        if (!versionId) return;

        try {
            const byeMatches = await apiClient.get<any[]>(`/api/brackets/${versionId}/bye-matches`);

            if (!byeMatches || byeMatches.length === 0) {
                toast({ title: 'No BYEs', description: 'No PENDING BYE matches to advance' });
                return;
            }

            let advancedCount = 0;
            for (const match of byeMatches) {
                // Series score: maps won (1-0 for BO1, 2-0/2-1 for BO3, etc.)
                const winScore = Math.ceil((match.best_of || 1) / 2);

                const result = await GraphMatchService.saveScoreAndAdvance(
                    match.id,
                    match.team1_id ? winScore : 0,
                    match.team2_id ? winScore : 0,
                    match.team1_id,
                    match.team2_id
                );
                if (result.success) advancedCount++;
            }

            toast({ title: 'BYEs Advanced', description: `${advancedCount} BYE match(es) have been processed!` });
            onMatchUpdate?.();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    // --- Match Handlers ---
    const toggleExpand = useCallback((id: string) => setExpandedMatch(p => p === id ? null : id), []);

    const handleGoLive = useCallback(async (matchOverride?: BracketMatch, codeOverride?: string, force = false) => {
        const match = matchOverride || goLiveMatch;
        const code = codeOverride || partyCodeInput;

        if (!match || !isDbMatch(match.id) || !code?.trim()) {
            toast({ title: 'Party code required', variant: 'destructive' });
            return;
        }
        setIsProcessing(true);
        const r = await GraphMatchService.goLive(
            getRawId(match.id),
            code.trim(),
            force || (isOrganizer && isMatchTooEarlyForLive(match.scheduledTime)),
        );
        setIsProcessing(false);
        if (r.success) {
            toast({ title: 'Match is live' });
            setGoLiveDialogOpen(false);
            onMatchUpdate?.();
        } else {
            toast({ title: 'Error', description: r.error, variant: 'destructive' });
        }
    }, [goLiveMatch, partyCodeInput, toast, onMatchUpdate, isOrganizer]);

    const openGoLive = useCallback((m: BracketMatch, code?: string, force = false) => {
        if (code) {
            handleGoLive(m, code, force);
        } else {
            setGoLiveMatch(m);
            setPartyCodeInput('');
            setGoLiveDialogOpen(true);
        }
    }, [handleGoLive]);

    const openMapVeto = useCallback((m: BracketMatch) => {
        if (!canUseMapVeto) {
            toast({ title: 'Map veto unavailable', description: 'This tournament does not use map veto.', variant: 'destructive' });
            return;
        }
        setMapVetoMatch(m);
        setMapVetoOpen(true);
    }, [canUseMapVeto, toast]);

    const openPartyCode = useCallback((m: BracketMatch) => {
        setPartyCodeMatch(m);
        setPartyCodeOpen(true);
        setCopiedCode(false);
    }, []);

    const copyPartyCode = async () => {
        if (!partyCodeMatch?.partyCode) return;
        await navigator.clipboard.writeText(partyCodeMatch.partyCode);
        setCopiedCode(true);
        toast({ title: '📋 Copied!' });
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleScoreChange = useCallback((id: string, t: 't1' | 't2', v: string) => {
        const rawId = getRawId(id);
        if (!scoreDraftRef.current[rawId]) {
            const match = matches.find(m => String(m.id) === id || getRawId(m.id) === rawId);
            scoreDraftRef.current[rawId] = {
                t1: match?.team1_score?.toString() ?? '',
                t2: match?.team2_score?.toString() ?? ''
            };
        }
        scoreDraftRef.current[rawId][t] = v;
    }, [matches]);

    const saveScore = useCallback(async (m: BracketMatch) => {
        if (!isDbMatch(m.id)) return;

        const draft = scoreDraftRef.current[getRawId(m.id)];
        const s1Str = draft ? draft.t1 : (m.team1_score?.toString() ?? '');
        const s2Str = draft ? draft.t2 : (m.team2_score?.toString() ?? '');

        const s1 = parseInt(s1Str), s2 = parseInt(s2Str);

        if (!Number.isFinite(s1) || !Number.isFinite(s2)) {
            toast({ title: 'Invalid scores', description: 'Please enter valid numbers.', variant: 'destructive' });
            return;
        }
        if (s1 === s2) {
            toast({ title: 'Invalid scores', description: 'Scores cannot be equal.', variant: 'destructive' });
            return;
        }

        setIsProcessing(true);
        const r = await GraphMatchService.saveScoreAndAdvance(getRawId(m.id), s1, s2, m.team1?.id || null, m.team2?.id || null);
        setIsProcessing(false);
        if (r.success) {
            delete scoreDraftRef.current[getRawId(m.id)];
            toast({ title: '🏆 Score saved!' });
            onMatchUpdate?.();
        } else {
            toast({ title: 'Error', description: r.error, variant: 'destructive' });
        }
    }, [toast, onMatchUpdate]);

    return (
        <div className="space-y-6">
            {/* Controls */}
            {isOrganizer && (
                <div className="flex items-center justify-between gap-2 mb-4 relative">
                    {/* Left: Auto Advance */}
                    <div className="flex gap-2">
                        <button type="button"
                            onClick={handleAutoAdvanceByes}
                            className={cn(buttonVariants(), 'border-transparent bg-amber-600 hover:bg-amber-500 text-white font-medium')}
                        >
                            Auto Advance Byes
                        </button>
                        <button type="button"
                            onClick={handleUndoRound}
                            disabled={currentRound <= 1 || isGenerating}
                            className={cn(buttonVariants({ variant: 'outline' }), 'border-red-500/20 hover:bg-red-500/10 text-red-400')}
                        >
                            <Undo2 className="w-4 h-4 mr-2" />
                            Undo Round
                        </button>
                    </div>

                    {/* Center: Stage Complete Indicator */}
                    {isMaxRoundsReached && !canFinalizeStage && (
                        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full animate-in fade-in zoom-in duration-300">
                            <Check className="w-4 h-4 text-amber-500" />
                            <span className="text-amber-400 font-bold uppercase tracking-wider text-sm">All Rounds Generated</span>
                        </div>
                    )}

                    {/* Right: Generate Round or Finalize Stage */}
                    <div>
                        {!isMaxRoundsReached && (
                            <button type="button"
                                onClick={handleGenerateNextRound}
                                disabled={!isRoundComplete || isGenerating}
                                className={cn(buttonVariants(), 'border-transparent bg-indigo-600 hover:bg-indigo-500')}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                                Generate Round {currentRound + 1}
                            </button>
                        )}
                        {(isComplete || alreadyAdvanced) && (
                            <div className="flex items-center gap-2">
                                <StageProgressChip progressLabel={progressLabel} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {hasGroups ? (
                <Tabs defaultValue={groups[0] as string} className="w-full">
                    <TabsList className="bg-zinc-900/50 border border-white/5 mb-6">
                        {groups.map(group => (
                            <TabsTrigger key={group as string} value={group as string}>
                                {group}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {groups.map(group => {
                        const groupMatches = matches.filter(m => (m.groupId || (m as any).group_id) === group);
                        // Filter standings: teams that have played in this group
                        const groupTeamIds = new Set<string>();
                        groupMatches.forEach(m => {
                            if (m.team1?.id) groupTeamIds.add(m.team1.id);
                            if (m.team2?.id) groupTeamIds.add(m.team2.id);
                        });
                        const groupStandings = standings
                            .filter(s => groupTeamIds.has(s.teamId))
                            .map((s, i) => ({ ...s, rank: i + 1 })); // Re-rank for display

                        const groupCount = groups.length || 1;
                        const perGroupAdvancement = stage?.advancement_count ? Math.floor(stage.advancement_count / groupCount) : undefined;

                        return (
                            <TabsContent key={group as string} value={group as string}>
                                <SwissGroupPanel
                                    groupMatches={groupMatches}
                                    groupStandings={groupStandings}
                                    isOrganizer={isOrganizer || false}
                                    isProcessing={isProcessing}
                                    expandedMatch={expandedMatch}
                                    toggleExpand={toggleExpand}
                                    handleScoreChange={handleScoreChange}
                                    openGoLive={openGoLive}
                                    openMapVeto={openMapVeto}
                                    openPartyCode={openPartyCode}
                                    saveScore={saveScore}
                                    scoreDraftRef={scoreDraftRef}

                                    onByeAdvance={onByeAdvance}
                                    advancementCount={perGroupAdvancement}
                                    activeFilter={activeFilter}
                                    eliminationCount={threshold}
                                    qualificationWins={threshold}
                                    onMatchClick={onMatchClick}
                                    onMatchRoom={onMatchRoom}
                                    hasResultsMap={hasResultsMap}
                                    hasProofsMap={hasProofsMap}
                                    canUseMapVeto={canUseMapVeto}
                                    suppressVetoRoleSwitchPrompt={suppressVetoRoleSwitchPrompt}
                                    hoveredTeamId={hoveredTeamId}
                                    onTeamHover={onTeamHover}
                                />
                            </TabsContent>
                        );
                    })}
                </Tabs>
            ) : (
                <SwissGroupPanel
                    groupMatches={matches}
                    groupStandings={standings}
                    isOrganizer={isOrganizer || false}
                    isProcessing={isProcessing}
                    expandedMatch={expandedMatch}
                    toggleExpand={toggleExpand}
                    handleScoreChange={handleScoreChange}
                    openGoLive={openGoLive}
                    openMapVeto={openMapVeto}
                    openPartyCode={openPartyCode}
                    saveScore={saveScore}
                    scoreDraftRef={scoreDraftRef}
                    onByeAdvance={onByeAdvance}
                    advancementCount={stage?.advancement_count}
                    activeFilter={activeFilter}
                    eliminationCount={threshold}
                    qualificationWins={threshold}
                    onMatchClick={onMatchClick}
                    onMatchRoom={onMatchRoom}
                    hasResultsMap={hasResultsMap}
                    hasProofsMap={hasProofsMap}
                    canUseMapVeto={canUseMapVeto}
                    suppressVetoRoleSwitchPrompt={suppressVetoRoleSwitchPrompt}
                    hoveredTeamId={hoveredTeamId}
                    onTeamHover={onTeamHover}
                />
            )}

            {/* Dialogs */}
            <Dialog open={goLiveDialogOpen} onOpenChange={setGoLiveDialogOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden border border-white/20 shadow-2xl bg-zinc-900">
                    <div className="text-center pt-6 pb-4">
                        <h2 className="text-lg font-semibold text-white">Start Match</h2>
                    </div>
                    <div className="px-6 pb-6 space-y-5">
                        <input
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-lg font-mono uppercase tracking-[0.25em] text-center placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors text-white"
                            placeholder="PARTY CODE"
                            value={partyCodeInput}
                            onChange={(e) => setPartyCodeInput(e.target.value.toUpperCase())}
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setGoLiveDialogOpen(false)} className="flex-1">Cancel</Button>
                            <SuccessButton onClick={() => handleGoLive()} disabled={isProcessing || !partyCodeInput.trim()} className="flex-1">Go Live</SuccessButton>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={partyCodeOpen} onOpenChange={setPartyCodeOpen}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 max-w-xs text-center">
                    <DialogHeader><DialogTitle><Gamepad2 className="w-5 h-5 inline mr-2 text-green-500" />Party Code</DialogTitle></DialogHeader>
                    <div className="py-5">
                        <div className="text-3xl font-mono font-bold bg-white/5 rounded-xl py-5 mb-4 text-white">{partyCodeMatch?.partyCode || 'N/A'}</div>
                        <Button onClick={copyPartyCode} className="w-full">{copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}{copiedCode ? 'Copied!' : 'Copy Code'}</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={canUseMapVeto && mapVetoOpen} onOpenChange={setMapVetoOpen}>
                <DialogContent className="bg-[#09090b] border-zinc-800/80 max-w-[min(96vw,1280px)] h-[min(86dvh,780px)] overflow-hidden p-0 flex flex-col gap-0">
                    <DialogHeader className="px-4 py-3 border-b border-zinc-800 bg-[#18181b] flex-shrink-0">
                        <DialogTitle className="text-white flex items-center gap-2 text-base font-semibold">
                            <Swords className="w-4 h-4 text-rose-500" />
                            Map Veto
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-lenis-prevent>
                        {mapVetoMatch && tournamentId && (
                            <MapVeto
                                matchId={getRawId(mapVetoMatch.id)}
                                tournamentId={tournamentId}
                                team1Id={mapVetoMatch.team1?.id}
                                team2Id={mapVetoMatch.team2?.id}
                                team1Name={mapVetoMatch.team1?.name}
                                team2Name={mapVetoMatch.team2?.name}
                                game={game}
                                bestOf={mapVetoMatch.bestOf ?? (mapVetoMatch as any).best_of ?? stage?.best_of ?? stage?.bestOf ?? 1}
                                matchStatus={mapVetoMatch.status as any}
                                layout="modal"
                                showShareLinks
                                suppressRoleSwitchPrompt={suppressVetoRoleSwitchPrompt}
                                onComplete={() => { setMapVetoOpen(false); onMatchUpdate?.(); }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
