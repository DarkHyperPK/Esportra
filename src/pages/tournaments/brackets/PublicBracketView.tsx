import React, { useMemo } from 'react';
import { useGraphBracket } from '@/hooks/useGraphBracket';
import { adaptGraphToBracketMatches, extractTeamIds } from '@/services/bracket/BracketAdapter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { BracketSidebarFilter, type FilterState } from '@/components/bracket/BracketSidebarFilter';
import { BracketRenderer } from '@/components/bracket/BracketRenderer';
import { BracketExporter } from '@/components/bracket/BracketExporter';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle, Maximize2 } from 'lucide-react';
import { SwissView } from '@/components/bracket/SwissView';
import { GroupStageView } from '@/components/bracket/GroupStageView';

interface PublicBracketViewProps {
    versionId: string | null; // Allow null to show sidebar even if no bracket
    tournamentId: string;

    // Stage Props
    stages?: any[];
    selectedStageId?: string | null;
    onStageSelect?: (stageId: string) => void;
    versionsMap?: Record<string, string>;
    onFullscreen?: () => void;
}

export const PublicBracketView: React.FC<PublicBracketViewProps> = ({
    versionId,
    tournamentId,
    stages,
    selectedStageId,
    onStageSelect,
    versionsMap,
    onFullscreen
}) => {
    const [activeFilter, setActiveFilter] = useState<FilterState>({ type: 'all' });
    const { data: graphData } = useGraphBracket(versionId || '');

    // Fetch teams
    const teamIds = useMemo(() => extractTeamIds(graphData?.nodes || []), [graphData?.nodes]);
    const { data: teamsData } = useQuery({
        queryKey: ['teams', teamIds],
        queryFn: async () => {
            if (teamIds.length === 0) return [];
            const { data } = await supabase.from('teams').select('id, name, logo_url').in('id', teamIds);
            return data || [];
        },
        enabled: teamIds.length > 0
    });

    // Adapt to bracket matches
    const matches = useMemo(() => {
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
                <div className="p-2 overflow-auto h-full">
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        {onFullscreen && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onFullscreen}
                                className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-100"
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Fullscreen
                            </Button>
                        )}
                    </div>
                    <SwissView
                        stageId={selectedStageId || ''}
                        versionId={versionId}
                        matches={matches}
                        isOrganizer={false}
                        tournamentId={tournamentId}
                        stage={currentStage}
                        activeFilter={activeFilter}
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
                <div className="p-2 overflow-auto h-full">
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                        {onFullscreen && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onFullscreen}
                                className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-100"
                            >
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Fullscreen
                            </Button>
                        )}
                    </div>
                    <GroupStageView
                        format="round_robin"
                        stageId={selectedStageId || ''}
                        versionId={versionId}
                        matches={matches}
                        isOrganizer={false}
                        advancementCount={perGroupAdvancement}
                    />
                </div>
            );
        }

        // --- ELIMINATION VIEW (Default) ---
        return (
            <>
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                    {onFullscreen && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onFullscreen}
                            className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-100"
                        >
                            <Maximize2 className="w-4 h-4 mr-2" />
                            Fullscreen
                        </Button>
                    )}

                    <BracketExporter
                        matches={matches}
                        triggerButton={
                            <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-100">
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        }
                    />
                </div>

                <BracketRenderer
                    matches={matches}
                    activeFilter={activeFilter}
                />
            </>
        );
    };

    return (
        <div className="flex h-[calc(100vh-140px)]">
            {/* 
               Only show Side Filter primarily for Elimination (Round Highlighting).
               Swiss/Group views manage their own internal filtering/tabs.
               However, we keep the structure to allow stage switching if stages>1 
               (The sidebar handles stage switching props).
            */}
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

            <div className="relative flex-1 overflow-auto bg-zinc-950/30">
                {renderContent()}
            </div>
        </div>
    );
};

export default PublicBracketView;
