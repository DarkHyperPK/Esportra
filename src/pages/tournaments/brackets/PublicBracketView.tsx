import React, { useMemo } from 'react';
import { useGraphBracket } from '@/hooks/useGraphBracket';
import { adaptGraphToBracketMatches, extractTeamIds } from '@/services/bracket/BracketAdapter';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { BracketSidebarFilter, type FilterState } from '@/components/bracket/BracketSidebarFilter';

interface PublicBracketViewProps {
    versionId: string;
    tournamentId: string;
}

import { BracketRenderer } from '@/components/bracket/BracketRenderer';
import { BracketExporter } from '@/components/bracket/BracketExporter';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export const PublicBracketView: React.FC<PublicBracketViewProps> = ({
    versionId,
    tournamentId
}) => {
    const [activeFilter, setActiveFilter] = useState<FilterState>({ type: 'all' });
    const { data: graphData } = useGraphBracket(versionId);

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
    const { winnersRounds, losersRounds, finalsMatches, maxWinnersRound } = useMemo(() => {
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



    if (!graphData || matches.length === 0) {
        return (
            <div className="flex items-center justify-center py-20 text-gray-400">
                Loading bracket...
            </div>
        );
    }

    const isMatchVisible = (match: any) => {
        if (activeFilter.type === 'all') return true;
        if (activeFilter.type === 'winners') return match.bracketSide === 'winners' && match.round === activeFilter.round;
        if (activeFilter.type === 'losers') return match.bracketSide === 'losers' && match.round === activeFilter.round;
        if (activeFilter.type === 'final') return match.bracketSide === 'final';
        return false;
    };

    return (
        <div className="flex h-[calc(100vh-140px)]">
            <BracketSidebarFilter
                winnersRounds={Object.keys(winnersRounds).map(Number).sort((a, b) => a - b)}
                losersRounds={Object.keys(losersRounds).map(Number).sort((a, b) => a - b)}
                hasFinals={finalsMatches.length > 0}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
            />

            <div className="relative flex-1 overflow-auto bg-zinc-950/30">
                <div className="absolute top-4 right-4 z-50">
                    <BracketExporter
                        matches={matches}
                        triggerButton={
                            <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
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
            </div>
        </div>
    );
};

export default PublicBracketView;
