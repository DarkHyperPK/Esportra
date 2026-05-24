import React, { useMemo } from 'react';
import { useGraphBracket } from '@/hooks/useGraphBracket';
import { adaptGraphToBracketMatches, extractTeamIds } from '@/services/bracket/BracketAdapter';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useState } from 'react';
import { BracketSidebarFilter, type FilterState } from '@/components/bracket/BracketSidebarFilter';
import { BracketRenderer } from '@/components/bracket/BracketRenderer';
import { BracketExporter } from '@/components/bracket/BracketExporter';
import { Download, AlertCircle, Maximize2 } from 'lucide-react';
import { SwissView } from '@/components/bracket/SwissView';
import { GroupStageView } from '@/components/bracket/GroupStageView';
import { MatchResultsDialog } from './dialogs/MatchResultsDialog';
import { cn } from '@/lib/utils';
import type { BracketMatch } from '@/types/bracketTypes';
import { CommandButton, CommandSegmentedButton } from '@/components/management/CommandSurface';
import { useBracketWheelScroll } from '@/hooks/useBracketWheelScroll';

interface PublicBracketViewProps {
    versionId: string | null; // Allow null to show sidebar even if no bracket
    tournamentId: string;

    // Stage Props
    stages?: any[];
    selectedStageId?: string | null;
    onStageSelect?: (stageId: string) => void;
    versionsMap?: Record<string, string>;
    onFullscreen?: () => void;
    mode?: 'page' | 'embedded' | 'fullscreen';
    disableMotion?: boolean;
    height?: string;
    className?: string;
}

export const PublicBracketView: React.FC<PublicBracketViewProps> = ({
    versionId,
    tournamentId,
    stages,
    selectedStageId,
    onStageSelect,
    versionsMap,
    onFullscreen,
    mode = 'page',
    disableMotion,
    height,
    className,
}) => {
    const [activeFilter, setActiveFilter] = useState<FilterState>({ type: 'all' });
    const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
    const [resultsDialogMatch, setResultsDialogMatch] = useState<BracketMatch | null>(null);
    const bracketScroll = useBracketWheelScroll<HTMLDivElement>();

    const { data: graphData } = useGraphBracket(versionId || '');

    // Fetch match proofs (manual submissions + screenshot reports)
    const { data: proofs } = useQuery({
        queryKey: ['match-proofs', tournamentId],
        queryFn: async () => {
            if (!tournamentId) return {};
            const map: Record<string, string[]> = {};

            // Old system
            try {
                const data = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/match-proofs`);
                data?.forEach((r: any) => {
                    const id = r.match_id;
                    if (!map[id]) map[id] = [];
                    if (r.image_url) map[id].push(r.image_url);
                });
            } catch { /* may not exist */ }

            // New system: match_result_reports with screenshot_urls
            try {
                const reports = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/result-reports`);
                reports?.forEach((r: any) => {
                    const id = r.match_id;
                    if (!map[id]) map[id] = [];
                    const urls = r.screenshot_urls ?? r.screenshotUrls;
                    if (Array.isArray(urls)) {
                        urls.forEach((url: string) => { if (url) map[id].push(url); });
                    }
                });
            } catch { /* endpoint may not exist yet */ }

            return map;
        },
        enabled: !!tournamentId,
        staleTime: 1000 * 60,
    });

    // Fetch detailed game results (automated reports)
    const { data: automatedGames } = useQuery({
        queryKey: ['bracket-match-games', tournamentId],
        queryFn: async () => {
            if (!tournamentId) return {};
            const data = await apiClient.get(`/api/tournaments/${tournamentId}/match-games`);

            const map: Record<string, any[]> = {};
            data?.forEach((game: any) => {
                const prefixedId = game.match_id;
                if (!map[prefixedId]) map[prefixedId] = [];
                map[prefixedId].push(game);
            });
            return map;
        },
        enabled: !!tournamentId,
        staleTime: 1000 * 60,
    });

    // Fetch teams
    const teamIds = useMemo(() => extractTeamIds(graphData?.nodes || []), [graphData?.nodes]);
    const { data: teamsData } = useQuery({
        queryKey: ['teams', teamIds],
        queryFn: async () => {
            if (teamIds.length === 0) return [];
            return apiClient.post('/api/teams/batch', { ids: teamIds });
        },
        enabled: teamIds.length > 0
    });

    // Adapt to bracket matches
    const matches = useMemo(() => {
        if (graphData?.version?.cached_ui_state) {
            return graphData.version.cached_ui_state;
        }

        if (!graphData?.nodes || !graphData?.edges) return [];
        const teamsMap = new Map();
        teamsData?.forEach((t: any) => teamsMap.set(t.id, t));
        return adaptGraphToBracketMatches(graphData.nodes, graphData.edges, teamsMap);
    }, [graphData, teamsData]);

    // Categorize matches by round (needed for rendering headers and loops)
    const { winnersRounds, losersRounds, finalsMatches } = useMemo(() => {
        const winners: Record<number, any[]> = {};
        const losers: Record<number, any[]> = {};
        const finals: any[] = [];

        matches.forEach(m => {
            if (m.bracketSide === 'final') finals.push(m);
            else if (m.bracketSide === 'losers') {
                if (!losers[m.round]) losers[m.round] = [];
                losers[m.round].push(m);
            } else {
                if (!winners[m.round]) winners[m.round] = [];
                winners[m.round].push(m);
            }
        });

        Object.values(winners).forEach(arr => arr.sort((a, b) => a.matchNumber - b.matchNumber));
        Object.values(losers).forEach(arr => arr.sort((a, b) => a.matchNumber - b.matchNumber));

        return {
            winnersRounds: winners,
            losersRounds: losers,
            finalsMatches: finals.sort((a, b) => a.matchNumber - b.matchNumber),
            maxWinnersRound: Math.max(...Object.keys(winners).map(Number), 0)
        };
    }, [matches]);

    // Detect Format
    const format = useMemo(() => {
        if (matches.some(m => m.bracketType === 'group')) return 'round_robin';
        if (matches.some(m => m.bracketType === 'swiss_round')) return 'swiss';
        return 'elimination';
    }, [matches]);
    const shouldDisableMotion = disableMotion ?? (mode !== 'fullscreen' || matches.length > 12);

    // Derived stage object needed for config (e.g. max swiss rounds)
    const currentStage = useMemo(() => {
        return stages?.find(s => s.id === selectedStageId);
    }, [stages, selectedStageId]);

    // Render loading or empty state ONLY for the content area, preserving the sidebar
    const renderContent = () => {
        if (!versionId) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 h-full">
                    <AlertCircle className="w-10 h-10 mb-3 opacity-20" />
                    <p>No bracket generated for this stage</p>
                </div>
            );
        }

        if (!graphData || matches.length === 0) {
            return (
                <div className="flex items-center justify-center py-20 text-gray-400 h-full">
                    Loading bracket...
                </div>
            );
        }

        if (format === 'swiss') {
            return (
                <div className="relative h-full min-h-0 overflow-auto p-2 [touch-action:pan-x_pan-y] overscroll-contain">
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        {onFullscreen && (
                            <CommandButton
                                variant="secondary"
                                size="sm"
                                onClick={onFullscreen}
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Fullscreen
                            </CommandButton>
                        )}
                    </div>
                    <SwissView
                        stageId={selectedStageId || ''}
                        versionId={versionId || ''}
                        matches={matches}
                        isOrganizer={false}
                        tournamentId={tournamentId}
                        stage={currentStage}
                        activeFilter={activeFilter}
                        onMatchClick={(m) => {
                            setResultsDialogMatch(m);
                            setResultsDialogOpen(true);
                        }}
                        hasResultsMap={automatedGames}
                        hasProofsMap={proofs}
                    />
                </div>
            );
        }

        // --- GROUP STAGE VIEW ---
        if (format === 'round_robin') {
            const uniqueGroups = Array.from(new Set(matches.map(m => m.groupId || (m as any).group_id).filter(Boolean)));
            const groupCount = uniqueGroups.length || 1;
            const perGroupAdvancement = currentStage?.advancement_count
                ? Math.floor(currentStage.advancement_count / groupCount)
                : undefined;

            return (
                <div className="relative h-full min-h-0 overflow-auto p-2 [touch-action:pan-x_pan-y] overscroll-contain">
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        {onFullscreen && (
                            <CommandButton
                                variant="secondary"
                                size="sm"
                                onClick={onFullscreen}
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Fullscreen
                            </CommandButton>
                        )}
                    </div>
                    <GroupStageView
                        stageId={selectedStageId || ''}
                        versionId={versionId || ''}
                        matches={matches}
                        isOrganizer={false}
                        advancementCount={perGroupAdvancement}
                        onMatchClick={(m) => {
                            setResultsDialogMatch(m);
                            setResultsDialogOpen(true);
                        }}
                        hasResultsMap={automatedGames}
                        hasProofsMap={proofs}
                    />
                </div>
            );
        }

        // --- ELIMINATION VIEW (Default) ---
        const isDoubleElim = Object.keys(losersRounds).length > 0;
        const roundTabs: { label: string; filter: FilterState }[] = [
            { label: 'All', filter: { type: 'all' } },
            ...Object.keys(winnersRounds).map(Number).sort((a, b) => a - b).map(r => ({
                label: isDoubleElim ? `WB R${r}` : `Round ${r}`,
                filter: { type: 'winners' as const, round: r },
            })),
            ...Object.keys(losersRounds).map(Number).sort((a, b) => a - b).map(r => ({
                label: `LB R${r}`,
                filter: { type: 'losers' as const, round: r },
            })),
            ...(finalsMatches.length > 0 ? [{ label: 'Grand Final', filter: { type: 'final' as const } }] : []),
        ];

        const isTabActive = (f: FilterState) => JSON.stringify(f) === JSON.stringify(activeFilter);

        return (
            <>
                {/* Round tabs */}
                <div className="sticky top-0 z-40 flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 bg-zinc-950 px-4 py-2">
                    {roundTabs.map(tab => (
                        <CommandSegmentedButton
                            key={tab.label}
                            onClick={() => setActiveFilter(tab.filter)}
                            active={isTabActive(tab.filter)}
                            className="shrink-0 whitespace-nowrap"
                        >
                            {tab.label}
                        </CommandSegmentedButton>
                    ))}

                    <div className="ml-auto flex items-center gap-2 pl-4">
                        {onFullscreen && (
                            <CommandButton
                                variant="secondary"
                                size="sm"
                                onClick={onFullscreen}
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Fullscreen
                            </CommandButton>
                        )}
                        <BracketExporter
                            matches={matches}
                            triggerButton={
                                <CommandButton variant="secondary" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </CommandButton>
                            }
                        />
                    </div>
                </div>

                <div
                    ref={bracketScroll.scrollRef}
                    onWheel={bracketScroll.onWheel}
                    tabIndex={0}
                    aria-label="Scrollable tournament bracket canvas"
                    className="min-h-0 flex-1 overflow-auto overscroll-contain [touch-action:pan-x_pan-y] focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                    <BracketRenderer
                        matches={matches}
                        activeFilter={activeFilter}
                        onMatchClick={(m) => {
                            setResultsDialogMatch(m);
                            setResultsDialogOpen(true);
                        }}
                        hasResultsMap={automatedGames}
                        hasProofsMap={proofs}
                        isSingleElimination={currentStage?.format === 'single_elimination'}
                        disableAnimations={shouldDisableMotion}
                    />
                </div>
            </>
        );
    };

    return (
        <div
            className={cn(
                'flex min-h-0 w-full overflow-hidden',
                mode === 'embedded' ? 'h-full' : 'h-[calc(100vh-140px)]',
                className,
            )}
            style={height ? { height } : undefined}
        >
            {/* 
               Only show Side Filter primarily for Elimination (Round Highlighting).
               Swiss/Group views manage their own internal filtering/tabs.
               However, we keep the structure to allow stage switching if stages>1 
               (The sidebar handles stage switching props).
            */}
            {mode !== 'embedded' ? (
                <BracketSidebarFilter
                    winnersRounds={Object.keys(winnersRounds).map(Number).sort((a, b) => a - b)}
                    losersRounds={Object.keys(losersRounds).map(Number).sort((a, b) => a - b)}
                    hasFinals={finalsMatches.length > 0}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}

                    stages={stages}
                    selectedStageId={selectedStageId}
                    onStageSelect={onStageSelect}
                    versionsMap={versionsMap}
                />
            ) : null}

            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950/30">
                {renderContent()}
            </div>

            <MatchResultsDialog
                open={resultsDialogOpen}
                onOpenChange={setResultsDialogOpen}
                results={resultsDialogMatch ? (proofs?.[resultsDialogMatch.id.replace(/^(db-|wb-|lb-)/, '')] || []).map((url: string) => ({
                    image_url: url,
                    comment: null,
                    created_at: new Date().toISOString(),
                    reporter_user_id: ''
                })) : []}
                automatedResults={resultsDialogMatch ? (automatedGames?.[resultsDialogMatch.id.replace(/^(db-|wb-|lb-)/, '')] || []) : []}
                team1Name={resultsDialogMatch?.team1?.name}
                team2Name={resultsDialogMatch?.team2?.name}
                team1Id={resultsDialogMatch?.team1?.id}
            />
        </div>
    );
};

export default PublicBracketView;
