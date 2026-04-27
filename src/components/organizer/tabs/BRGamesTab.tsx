import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Users, Trophy, Filter, ChevronRight } from 'lucide-react';
import { useBRGroupLeaderboard, useBRGroupRounds } from '@/hooks/useBRGroupLeaderboard';
import { useBRGroupsDetail } from '@/hooks/useBRGroups';
import { RoundManagementPanel } from '@/components/organizer/br/RoundManagementPanel';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import type { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface ScoringPreset {
    placements: number[];
    killPoints: number;
    killCap: number | null;
}

interface BRGamesTabProps {
    tournamentId: string;
    stages: TournamentStage[];
    scoringPreset: ScoringPreset;
}

export const BRGamesTab: React.FC<BRGamesTabProps> = ({ tournamentId, stages: stagesProp, scoringPreset }) => {
    const stages = stagesProp ?? [];
    const sortedStages = useMemo(
        () => [...stages].sort((a, b) => a.stage_order - b.stage_order),
        [stages]
    );

    // Auto-select first stage
    const [selectedStageId, setSelectedStageId] = useState<string>(() =>
        sortedStages.length > 0 ? sortedStages[0].id : ''
    );
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');

    const selectedStage = sortedStages.find(s => s.id === selectedStageId);

    // Fetch groups + all roster rows for the selected stage in one request
    const { data: groupDetail, isLoading: groupsLoading } = useBRGroupsDetail(selectedStageId || null);
    const groups = groupDetail?.groups ?? [];
    const teamsByGroup = groupDetail?.teams_by_group ?? {};

    // Auto-select first group when groups load
    React.useEffect(() => {
        if (groups.length > 0 && (!selectedGroupId || !groups.find(g => g.id === selectedGroupId))) {
            setSelectedGroupId(groups[0].id);
        }
    }, [groups, selectedGroupId]);

    // Reset group selection when stage changes
    const handleStageChange = (stageId: string) => {
        setSelectedStageId(stageId);
        setSelectedGroupId('');
    };

    const selectedGroup = groups.find(g => g.id === selectedGroupId);

    const groupTeams = selectedGroupId ? (teamsByGroup[selectedGroupId] ?? []) : [];

    // Fetch leaderboard for the selected group
    const { leaderboard, isLoading: leaderboardLoading } = useBRGroupLeaderboard(
        selectedStageId || null,
        selectedGroupId || null
    );

    // Fetch round summary for accurate totalGames/gamesCompleted in leaderboard
    const { totalRounds, completedRounds } = useBRGroupRounds(
        selectedStageId || null,
        selectedGroupId || null
    );

    if (sortedStages.length === 0) {
        return (
            <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl p-8">
                <div className="text-center py-8">
                    <Layers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-1">No stages configured yet.</p>
                    <p className="text-sm text-gray-500">
                        Go to the Stages tab to set up your tournament stages and create groups first.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-5">
            {/* Stage & Group Filter Bar */}
            <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Filter className="w-4 h-4" />
                        <span className="font-medium text-white">Filter</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                        {/* Stage Selector */}
                        <div className="space-y-0.5">
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Stage</label>
                            <Select value={selectedStageId} onValueChange={handleStageChange}>
                                <SelectTrigger className="w-[200px] h-8 text-xs bg-white/5 border-white/10">
                                    <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedStages.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <span className="flex items-center gap-2">
                                                <span className="text-gray-500">{s.stage_order}.</span>
                                                {s.name}
                                                {s.status === 'live' && (
                                                    <span className="text-[9px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded uppercase">live</span>
                                                )}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-600 hidden sm:block mt-4" />

                        {/* Group Selector */}
                        <div className="space-y-0.5">
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">Group</label>
                            {groupsLoading ? (
                                <div className="h-8 w-[180px] bg-white/5 rounded-md animate-pulse" />
                            ) : groups.length === 0 ? (
                                <p className="text-xs text-amber-400/80 mt-1.5">
                                    No groups in this stage. Create groups in the Stages tab.
                                </p>
                            ) : (
                                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                                    <SelectTrigger className="w-[180px] h-8 text-xs bg-white/5 border-white/10">
                                        <SelectValue placeholder="Select group" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {groups.map(g => (
                                            <SelectItem key={g.id} value={g.id}>
                                                <span className="flex items-center gap-2">
                                                    {g.name}
                                                    <span className="text-gray-500 text-[10px]">
                                                        {g.team_count}/{g.lobby_size}
                                                    </span>
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {/* Quick info */}
                    {selectedGroup && (
                        <div className="flex items-center gap-3 text-xs text-gray-500 ml-auto">
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {selectedGroup.team_count} teams
                            </span>
                        </div>
                    )}
                </div>
            </Card>

            {/* Group Content */}
            {selectedStageId && selectedGroupId && selectedGroup ? (
                <>
                    {/* Group Leaderboard */}
                    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                {selectedGroup.name} — Leaderboard
                            </h3>
                            {selectedStage && (
                                <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-semibold ${
                                    selectedStage.status === 'live' ? "bg-red-500/20 text-red-400" :
                                    selectedStage.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                                    "bg-blue-500/15 text-blue-400"
                                }`}>
                                    {selectedStage.status || 'upcoming'}
                                </span>
                            )}
                        </div>
                        {leaderboardLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-6">
                                No results yet. Start rounds below and submit results.
                            </p>
                        ) : (
                            <>
                            <BRLeaderboard
                                entries={leaderboard}
                                totalGames={totalRounds}
                                gamesCompleted={completedRounds}
                                qualificationCutoff={selectedStage?.advancement_count ?? undefined}
                                pageSize={20}
                            />
                            <p className="text-xs text-zinc-500 text-right mt-1">
                              Rounds are managed in the panel above
                            </p>
                            </>
                        )}
                    </Card>

                    {/* Rounds & Results */}
                    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <RoundManagementPanel
                            stageId={selectedStageId}
                            groupId={selectedGroupId}
                            groupName={selectedGroup.name}
                            teams={groupTeams ?? []}
                            scoringPreset={scoringPreset}
                        />
                    </Card>
                </>
            ) : selectedStageId && groups.length > 0 && !selectedGroupId ? (
                <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Select a group above to manage rounds and results.</p>
                </Card>
            ) : null}
        </div>
    );
};
