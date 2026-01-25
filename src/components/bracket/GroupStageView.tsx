import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsTable } from './StandingsTable';
import { standingsService, TeamStanding } from '@/services/bracket/StandingsService';
import { BracketNode } from '@/types/bracket-graph';
import { MatchCard } from '@/pages/tournaments/brackets/MatchCard';
import { ReadOnlyMatchCard } from './ReadOnlyMatchCard';

interface GroupStageViewProps {
    stageId: string;
    matches: BracketNode[];
    advancementCount?: number;
    isOrganizer?: boolean;
    onMatchUpdate?: () => void;
}

export const GroupStageView: React.FC<GroupStageViewProps> = ({
    stageId,
    matches,
    advancementCount,
    isOrganizer,
    onMatchUpdate
}) => {
    const [standingsByGroup, setStandingsByGroup] = useState<Record<string, TeamStanding[]>>({});
    const [groups, setGroups] = useState<string[]>([]);
    const [activeGroup, setActiveGroup] = useState<string>("");

    useEffect(() => {
        // 1. Identify Groups
        const uniqueGroups = Array.from(new Set(matches.map(m => m.group_id || 'Group A'))).sort();
        setGroups(uniqueGroups);
        if (!activeGroup && uniqueGroups.length > 0) {
            setActiveGroup(uniqueGroups[0]);
        }

        // 2. Calculate Standings for each group
        const loadStandings = async () => {
            const newStandings: Record<string, TeamStanding[]> = {};

            for (const group of uniqueGroups) {
                // Filter matches for this group to calculate standings locally?
                // Or call service? Service fetches from DB.
                // Since we have matches prop, maybe we should use them?
                // But StandingsService fetches from DB.
                // For consistency with realtime updates, let's call the service.
                // Optimization: If we have matches, we could adapt service to accept matches.
                // But for now, let's trust the service.
                newStandings[group] = await standingsService.calculateStandings(stageId, group);
            }
            setStandingsByGroup(newStandings);
        };

        loadStandings();
    }, [matches, stageId]);

    // Group matches by group ID
    const matchesByGroup = matches.reduce((acc, match) => {
        const gid = match.group_id || 'Group A';
        if (!acc[gid]) acc[gid] = [];
        acc[gid].push(match);
        return acc;
    }, {} as Record<string, BracketNode[]>);

    if (groups.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">No groups found.</div>;
    }

    return (
        <div className="space-y-6">
            <Tabs value={activeGroup} onValueChange={setActiveGroup}>
                <TabsList>
                    {groups.map(group => (
                        <TabsTrigger key={group} value={group}>{group}</TabsTrigger>
                    ))}
                </TabsList>

                {groups.map(group => (
                    <TabsContent key={group} value={group} className="space-y-6">
                        {/* Standings */}
                        <StandingsTable
                            standings={standingsByGroup[group] || []}
                            title={`${group} Standings`}
                            advancementCount={advancementCount}
                        />

                        {/* Matches */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Matches</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-[450px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {matchesByGroup[group]?.map(match => (
                                            <div key={match.id} className="transform scale-90 origin-top-left">
                                                {isOrganizer ? (
                                                    <MatchCard
                                                        match={match}
                                                        isOrganizer={isOrganizer}
                                                        onMatchClick={() => { }} // Handle click if needed
                                                    />
                                                ) : (
                                                    <ReadOnlyMatchCard
                                                        match={match}
                                                        className="w-[260px]"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};
