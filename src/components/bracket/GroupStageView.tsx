import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsTable } from './StandingsTable';
import { standingsService, TeamStanding } from '@/services/bracket/StandingsService';
import { BracketNode } from '@/types/bracket-graph';
import { BracketMatch } from '@/types/bracketTypes';
import { MatchCard } from '@/pages/tournaments/brackets/MatchCard';
import { ReadOnlyMatchCard } from './ReadOnlyMatchCard';
import { Button, SuccessButton } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, Gamepad2, LayoutGrid, List, Swords } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GraphMatchService } from '@/services/bracket/GraphMatchService';
import { MapVeto } from '@/components/tournament/MapVeto';
import { StageProgressChip } from '@/components/tournament/StageProgressChip';
import { useStageCompletion } from '@/hooks/useStageCompletion';
import { isMatchTooEarlyForLive } from '@/lib/timeUtils';

interface GroupStageViewProps {
    stageId: string;
    versionId?: string;
    matches: BracketNode[] | BracketMatch[];
    advancementCount?: number;
    isOrganizer?: boolean;
    onMatchUpdate?: () => void;
    tournamentId?: string;
    game?: string;
    onByeAdvance?: (matchId: string) => void;
    stage?: any;
    /** Pre-fetched teams data from parent - avoids duplicate fetch */
    teamsMap?: Map<string, { id: string; name: string; logo_url?: string | null }>;
    onMatchClick?: (match: BracketMatch) => void;
    onMatchRoom?: (match: BracketMatch) => void;
    hasResultsMap?: Record<string, any[]>;
    hasProofsMap?: Record<string, string[]>;
    canUseMapVeto?: boolean;
    suppressVetoRoleSwitchPrompt?: boolean;
    hoveredTeamId?: string | null;
    onTeamHover?: (teamId: string | null) => void;
    topRightAction?: React.ReactNode;
}

// Helpers
const getRawId = (id: string | number) => String(id).replace(/^(db-|wb-|lb-|source-)/, '');
const isDbMatch = (id: string | number) => String(id).startsWith('db-');
const resolveNodeSeed = (node: BracketNode, slot: 1 | 2) => {
    const snakeSeed = slot === 1 ? (node as any).team1_seed : (node as any).team2_seed;
    if (typeof snakeSeed === 'number' && Number.isFinite(snakeSeed) && snakeSeed > 0) return snakeSeed;

    const camelSeed = slot === 1 ? (node as any).team1Seed : (node as any).team2Seed;
    if (typeof camelSeed === 'number' && Number.isFinite(camelSeed) && camelSeed > 0) return camelSeed;

    return (node.match_number || 0) * 2 - (slot === 1 ? 1 : 0);
};

// Convert BracketNode to BracketMatch for MatchCard compatibility
const nodeToMatch = (node: BracketNode): BracketMatch => ({
    id: `db-${node.id}`,
    round: (node.round_index || 0) + 1,
    matchNumber: node.match_number || 0,
    team1: node.team1_id ? { id: node.team1_id, name: (node as any).team1_name || 'Team 1', seed: resolveNodeSeed(node, 1) } : null,
    team2: node.team2_id ? { id: node.team2_id, name: (node as any).team2_name || 'Team 2', seed: resolveNodeSeed(node, 2) } : null,
    winner: null,
    score: null,
    team1_score: (node as any).team1_score ?? null,
    team2_score: (node as any).team2_score ?? null,
    status: node.status as any || 'pending',
    scheduledTime: (node as any).scheduled_time,
    bestOf: (node as any).best_of,
    partyCode: (node as any).party_code,
    bracketType: node.bracket_type,
    groupId: node.group_id,
    x: node.x,
    y: node.y
});
void nodeToMatch;

// Extracted Panel Component (matching SwissView's SwissGroupPanel)
const GroupPanel = React.memo(({
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
    onMatchClick,
    onMatchRoom,
    hasResultsMap = {},
    hasProofsMap = {},
    canUseMapVeto = false,
    suppressVetoRoleSwitchPrompt: _suppressVetoRoleSwitchPrompt = false,
    hoveredTeamId,
    onTeamHover,
    activeRound,
    viewMode
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
    onMatchClick?: (match: BracketMatch) => void,
    onMatchRoom?: (match: BracketMatch) => void,
    hasResultsMap?: Record<string, any[]>,
    hasProofsMap?: Record<string, string[]>,
    canUseMapVeto?: boolean,
    suppressVetoRoleSwitchPrompt?: boolean,
    hoveredTeamId?: string | null,
    onTeamHover?: (teamId: string | null) => void,
    activeRound?: number | 'all',
    viewMode: 'overview' | 'matches'
}) => {
    // Group matches by round
    const matchesByRound = useMemo(() => {
        const byRound: Record<number, BracketMatch[]> = {};
        groupMatches.forEach(match => {
            const round = match.round || 1;
            if (!byRound[round]) byRound[round] = [];
            byRound[round].push(match);
        });
        return byRound;
    }, [groupMatches]);

    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    const visibleRounds = activeRound === 'all' || activeRound === undefined
        ? rounds
        : rounds.filter(round => round === activeRound);

    return (
        <div className={viewMode === 'matches' ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 lg:grid-cols-12 gap-6'}>
            {/* Left Column: Matches by Round */}
            <div className={viewMode === 'matches' ? 'space-y-6' : 'lg:col-span-7 space-y-6'}>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white">Matches</h3>
                    <span className="text-sm text-zinc-500">{rounds.length} Round{rounds.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-6 max-h-[700px] overflow-y-auto overscroll-contain pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent" data-lenis-prevent>
                    {visibleRounds.map(round => (
                        <Card key={round} className="bg-zinc-900/30 border-white/10">
                            <CardHeader className="py-3 px-4 border-b border-white/5">
                                <CardTitle className="text-sm font-medium text-zinc-300">
                                    Round {round}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 pb-4">
                                <div
                                    className={viewMode === 'matches' ? 'grid justify-start gap-3' : 'space-y-3'}
                                    style={viewMode === 'matches' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 320px))' } : undefined}
                                >
                                    {matchesByRound[round].sort((a, b) => (a.matchNumber - b.matchNumber)).map(match => (
                                        <div key={match.id} className="relative min-w-0">
                                            {isOrganizer ? (
                                                <MatchCard
                                                    match={match}
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
                                                    className={viewMode === 'matches' ? 'w-full' : 'w-[260px]'}
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
                </div>

                {groupMatches.length === 0 && (
                    <div className="text-center p-12 text-zinc-500 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
                        No matches generated yet.
                    </div>

                )}
                {groupMatches.length > 0 && visibleRounds.length === 0 && (
                    <div className="text-center p-12 text-zinc-500 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
                        No matches found for this round.
                    </div>
                )}
            </div>

            {/* Right Column: Standings */}
            {viewMode === 'overview' && (
                <div className="lg:col-span-5">
                    <div className="sticky top-6">
                        <StandingsTable
                            standings={groupStandings}
                            title="Group Standings"
                            advancementCount={advancementCount}
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

export const GroupStageView: React.FC<GroupStageViewProps> = ({
    stageId,
    versionId,
    matches: rawMatches,
    advancementCount,
    isOrganizer = false,
    onMatchUpdate,
    tournamentId,
    game = 'valorant',
    onByeAdvance,
    stage: _stage,
    teamsMap: propTeamsMap,
    onMatchClick,
    onMatchRoom,
    hasResultsMap,
    hasProofsMap,
    canUseMapVeto = false,
    suppressVetoRoleSwitchPrompt = false,
    hoveredTeamId,
    onTeamHover,
    topRightAction
}) => {
    const { toast } = useToast();
    const [standingsByGroup, setStandingsByGroup] = useState<Record<string, TeamStanding[]>>({});
    const [groups, setGroups] = useState<string[]>([]);
    const [activeGroup, setActiveGroup] = useState<string>("");
    const [localTeamsMap, setLocalTeamsMap] = useState<Map<string, { id: string; name: string; logo_url?: string | null }>>(new Map());

    // Match Interaction State (matching SwissView)
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
    const [activeRoundFilter, setActiveRoundFilter] = useState<number | 'all'>('all');
    const [viewMode, setViewMode] = useState<'overview' | 'matches'>('overview');

    // Use prop teamsMap if provided (from parent), otherwise use local state
    const teamsMap = propTeamsMap || localTeamsMap;

    // Extract all team IDs from matches (only needed for fallback fetch)
    const teamIds = useMemo(() => {
        if (propTeamsMap && propTeamsMap.size > 0) return []; // Skip if prop provided
        const ids = new Set<string>();
        rawMatches.forEach((node: any) => {
            if (node.team1_id) ids.add(node.team1_id);
            if (node.team2_id) ids.add(node.team2_id);
        });
        return Array.from(ids);
    }, [rawMatches, propTeamsMap]);

    // Fallback: Fetch team data from database only if prop not provided
    useEffect(() => {
        if (propTeamsMap && propTeamsMap.size > 0) return; // Skip if prop provided
        if (teamIds.length === 0) return;

        const fetchTeams = async () => {
            try {
                const data = await apiClient.post<any[]>('/api/teams/batch', { ids: teamIds });
                const map = new Map<string, { id: string; name: string; logo_url?: string | null }>();
                data?.forEach((team: any) => map.set(team.id, team));
                setLocalTeamsMap(map);
            } catch (error) {
                console.error('[GroupStageView] Error fetching teams:', error);
            }
        };

        fetchTeams();
    }, [teamIds, propTeamsMap]);

    // Convert matches with team data
    const matches = useMemo(() => (rawMatches as any[]).map(node => {
        // If it's already a BracketMatch, just return it
        if (node.team1 && typeof node.team1 === 'object' && 'seed' in node.team1) return node as BracketMatch;

        const team1 = node.team1_id ? teamsMap.get(node.team1_id) : null;
        const team2 = node.team2_id ? teamsMap.get(node.team2_id) : null;

        return {
            id: `db-${node.id}`,
            round: (node.round_index || 0) + 1,
            matchNumber: node.match_number || 0,
            team1: node.team1_id ? {
                id: node.team1_id,
                name: team1?.name || (node as any).team1_name || 'TBD',
                seed: resolveNodeSeed(node, 1),
                logo_url: team1?.logo_url || (node as any).team1_logo
            } : null,
            team2: node.team2_id ? {
                id: node.team2_id,
                name: team2?.name || (node as any).team2_name || 'TBD',
                seed: resolveNodeSeed(node, 2),
                logo_url: team2?.logo_url || (node as any).team2_logo
            } : null,
            winner: null,
            score: null,
            team1_score: (node as any).team1_score ?? null,
            team2_score: (node as any).team2_score ?? null,
            status: node.status as any || 'pending',
            scheduledTime: (node as any).scheduled_time,
            bestOf: (node as any).best_of,
            partyCode: (node as any).party_code,
            bracketType: node.bracket_type,
            groupId: node.group_id,
            x: node.x,
            y: node.y
        } as BracketMatch;
    }), [rawMatches, teamsMap]);

    useEffect(() => {
        // 1. Identify Groups (ensure groupId is cast to string)
        const uniqueGroups = Array.from(new Set(matches.map(m => String(m.groupId || 'Group A')))).sort();
        setGroups(uniqueGroups);
        if (!activeGroup && uniqueGroups.length > 0) {
            setActiveGroup(uniqueGroups[0]);
        }


        // 2. Calculate Standings for each group
        const loadStandings = async () => {
            const newStandings: Record<string, TeamStanding[]> = {};

            for (const group of uniqueGroups) {
                newStandings[group] = await standingsService.calculateStandings(stageId, group);
            }
            setStandingsByGroup(newStandings);
        };

        loadStandings();
    }, [matches, stageId, activeGroup]);


    // Group matches by group ID
    const matchesByGroup = useMemo(() => matches.reduce((acc, match) => {
        const gid = match.groupId || 'Group A';
        if (!acc[gid]) acc[gid] = [];
        acc[gid].push(match);
        return acc;
    }, {} as Record<string, BracketMatch[]>), [matches]);

    const activeGroupRounds = useMemo(() => {
        const groupMatches = matchesByGroup[activeGroup] || [];
        return Array.from(new Set(groupMatches.map(match => match.round || 1))).sort((a, b) => a - b);
    }, [activeGroup, matchesByGroup]);

    useEffect(() => {
        if (activeRoundFilter !== 'all' && !activeGroupRounds.includes(activeRoundFilter)) {
            setActiveRoundFilter('all');
        }
    }, [activeGroupRounds, activeRoundFilter]);

    // --- Match Handlers (matching SwissView) ---
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
                const isBo1 = (match.best_of || 1) === 1;
                const winScore = isBo1 ? 13 : Math.ceil((match.best_of || 1) / 2);

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

    if (groups.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No groups found.</div>;
    }

    return (
        <div className="space-y-6">
            <Tabs value={activeGroup} onValueChange={setActiveGroup}>
                <div className="flex flex-wrap items-center gap-2">
                        <TabsList className="h-10 bg-[#121214] border border-white/10 p-1 rounded-xl">
                            {groups.map(group => (
                                <TabsTrigger
                                    key={group}
                                    value={group}
                                    className="h-8 data-[state=active]:bg-rose-500 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors rounded-lg px-3.5"
                                >
                                    {group}
                                </TabsTrigger>
                            ))}
                    </TabsList>
                    {activeGroupRounds.length > 1 && (
                        <div className="flex h-10 items-center gap-1 rounded-xl border border-white/10 bg-zinc-950/80 p-1">
                            {(['all', ...activeGroupRounds] as Array<number | 'all'>).map(round => {
                                const active = activeRoundFilter === round;
                                return (
                                    <button
                                        key={round}
                                        type="button"
                                        onClick={() => setActiveRoundFilter(round)}
                                        className={`h-8 min-w-[82px] shrink-0 rounded-lg px-3.5 text-sm font-medium transition-colors ${
                                            active
                                                ? 'bg-rose-500 text-white'
                                                : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        {round === 'all' ? 'All Matches' : `Round ${round}`}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <div className="flex h-10 items-center gap-1 rounded-xl border border-white/10 bg-zinc-950/80 p-1">
                        <button
                            type="button"
                            onClick={() => setViewMode('overview')}
                            className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                                viewMode === 'overview'
                                    ? 'bg-rose-500 text-white'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Overview
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('matches')}
                            className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                                viewMode === 'matches'
                                    ? 'bg-rose-500 text-white'
                                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <List className="h-3.5 w-3.5" />
                            Matches
                        </button>
                    </div>
                    {isOrganizer && (
                        <button
                            type="button"
                            onClick={handleAutoAdvanceByes}
                            disabled={!versionId}
                            className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl border border-amber-500/30 bg-amber-600 px-3.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Auto Advance Byes
                        </button>
                    )}
                    {(isComplete || alreadyAdvanced) && (
                        <div className="flex h-10 items-center gap-2">
                            <StageProgressChip progressLabel={progressLabel} />
                            {isComplete && !alreadyAdvanced && (
                                <span className="text-xs text-gray-400">Advance teams from the Stages tab.</span>
                            )}
                        </div>
                    )}
                    {topRightAction && (
                        <div className="ml-auto flex h-10 items-center">
                            {topRightAction}
                        </div>
                    )}
                </div>

                {groups.map((group, groupIndex) => {
                    const groupMatches = matchesByGroup[group] || [];
                    const groupStandings = standingsByGroup[group] || [];
                    const groupCount = groups.length || 1;
                    const baseAdv = advancementCount ? Math.floor(advancementCount / groupCount) : 0;
                    const remainder = advancementCount ? advancementCount % groupCount : 0;
                    const perGroupAdvancement = advancementCount
                        ? baseAdv + (groupIndex < remainder ? 1 : 0)
                        : undefined;

                    return (
                        <TabsContent key={group} value={group} className="mt-6">
                            <GroupPanel
                                groupMatches={groupMatches}
                                groupStandings={groupStandings}
                                isOrganizer={isOrganizer}
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
                                onMatchClick={onMatchClick}
                                onMatchRoom={onMatchRoom}
                                hasResultsMap={hasResultsMap}
                                hasProofsMap={hasProofsMap}
                                canUseMapVeto={canUseMapVeto}
                                suppressVetoRoleSwitchPrompt={suppressVetoRoleSwitchPrompt}
                                hoveredTeamId={hoveredTeamId}
                                onTeamHover={onTeamHover}
                                activeRound={activeRoundFilter}
                                viewMode={viewMode}
                            />
                        </TabsContent>
                    );
                })}
            </Tabs>

            {/* Dialogs (matching SwissView) */}
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
                                bestOf={mapVetoMatch.bestOf ?? (mapVetoMatch as any).best_of ?? _stage?.best_of ?? _stage?.bestOf ?? 1}
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
