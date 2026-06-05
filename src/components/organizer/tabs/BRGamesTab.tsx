import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Users, Trophy, Filter, ChevronRight, RefreshCw } from 'lucide-react';
import { useBRGroupLeaderboard, useBRGroupRounds } from '@/hooks/useBRGroupLeaderboard';
import { useBRGroupTeams, useBRGroups } from '@/hooks/useBRGroups';
import { RoundManagementPanel } from '@/components/organizer/br/RoundManagementPanel';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import { StageProgressChip } from '@/components/tournament/StageProgressChip';
import { useStageCompletion } from '@/hooks/useStageCompletion';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { Database } from '@/integrations/supabase/types';
import { resolveStageBRConfig, getQualificationCutoff, sortBRLeaderboardEntries } from '@/utils/brConfigResolve';
import { useGameCatalogGame } from '@/hooks/useGameCatalogGame';
import { getCatalogMapItems } from '@/utils/gameCatalogBr';
import type { BRMapConfig } from '@/types/battleRoyale';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface ScoringPreset {
    placements: number[];
    killPoints: number;
    killCap: number | null;
}

interface BRGamesTabProps {
    tournamentId: string;
    stages: TournamentStage[];
    game: string;
    tournamentSettings?: Record<string, unknown> | null;
    teamSize?: number;
    /** @deprecated use resolved stage config instead */
    scoringPreset?: ScoringPreset;
}

export const BRGamesTab: React.FC<BRGamesTabProps> = ({
    tournamentId: _tournamentId,
    stages: stagesProp,
    game,
    tournamentSettings,
    teamSize = 1,
    scoringPreset: legacyScoringPreset,
}) => {
    const stages = useMemo(() => stagesProp ?? [], [stagesProp]);
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

    const { data: catalogGame } = useGameCatalogGame(game);
    const catalogBrConfig = catalogGame?.brConfig;
    const mapCatalogItems = useMemo(() => getCatalogMapItems(catalogBrConfig), [catalogBrConfig]);

    const resolvedStageConfig = useMemo(() => {
        if (!selectedStage) return null;
        return resolveStageBRConfig({
            gameName: game,
            settings: tournamentSettings,
            stage: selectedStage,
            teamSize,
            catalogBrConfig,
        });
    }, [selectedStage, game, tournamentSettings, teamSize, catalogBrConfig]);

    const scoringPreset = useMemo(() => {
        if (resolvedStageConfig) {
            return {
                placements: resolvedStageConfig.scoringPreset.placements,
                killPoints: resolvedStageConfig.scoringPreset.killPoints,
                killCap: resolvedStageConfig.killCap,
            };
        }
        return legacyScoringPreset ?? { placements: [10, 6, 5, 4, 3, 2, 1, 1], killPoints: 1, killCap: null };
    }, [resolvedStageConfig, legacyScoringPreset]);

    const mapConfig: BRMapConfig = resolvedStageConfig?.map ?? { mode: 'none', pool: [], fixedMap: null };

    const {
        groups,
        isLoading: groupsLoading,
        error: groupsError,
        refetch: refetchGroups,
        bootstrapLobby,
    } = useBRGroups(selectedStageId || null);

    // Auto-select first group when groups load
    React.useEffect(() => {
        if (groups.length > 0 && (!selectedGroupId || !groups.find(g => g.id === selectedGroupId))) {
            setSelectedGroupId(groups[0].id);
        }
        if (groups.length === 0 && selectedGroupId) {
            setSelectedGroupId('');
        }
    }, [groups, selectedGroupId]);

    // Reset group selection when stage changes
    const handleStageChange = (stageId: string) => {
        setSelectedStageId(stageId);
        setSelectedGroupId('');
    };

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    const isSingleLobby = groups.length === 1;
    const selectedGroupName = isSingleLobby ? 'Main Lobby' : selectedGroup?.name;

    const {
        data: groupTeams = [],
        isLoading: groupTeamsLoading,
    } = useBRGroupTeams(selectedStageId || null, selectedGroupId || null);

    // Fetch leaderboard for the selected group
    const { leaderboard, isLoading: leaderboardLoading } = useBRGroupLeaderboard(
        selectedStageId || null,
        selectedGroupId || null
    );

    const sortedLeaderboard = useMemo(() => {
        if (!resolvedStageConfig) return leaderboard;
        return sortBRLeaderboardEntries(leaderboard, resolvedStageConfig.tiebreaker);
    }, [leaderboard, resolvedStageConfig]);

    const qualificationCutoff = useMemo(() => {
        if (!resolvedStageConfig) {
            return selectedStage?.advancement_count && selectedStage.advancement_count > 0
                ? selectedStage.advancement_count
                : undefined;
        }
        return getQualificationCutoff(resolvedStageConfig, groups.length);
    }, [resolvedStageConfig, selectedStage, groups.length]);

    // Fetch round summary for accurate totalGames/gamesCompleted in leaderboard
    const { totalRounds, completedRounds } = useBRGroupRounds(
        selectedStageId || null,
        selectedGroupId || null
    );

    const { progressLabel: selectedStageProgress } = useStageCompletion(selectedStageId || null);

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

                        {groups.length !== 1 && (
                            <ChevronRight className="w-4 h-4 text-gray-600 hidden sm:block mt-4" />
                        )}

                        {/* Group Selector */}
                        <div className="space-y-0.5">
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">
                                {isSingleLobby ? 'Lobby' : 'Group'}
                            </label>
                            {groupsLoading ? (
                                <div className="h-8 w-[180px] bg-white/5 rounded-md animate-pulse" />
                            ) : groups.length === 0 ? (
                                <Button
                                    size="sm"
                                    onClick={() => bootstrapLobby.mutate()}
                                    disabled={bootstrapLobby.isPending}
                                    className="h-8 bg-white text-black hover:bg-white/90 font-mono text-[11px] font-bold uppercase tracking-wider"
                                >
                                    {bootstrapLobby.isPending ? 'Initializing...' : 'Initialize Lobby'}
                                </Button>
                            ) : isSingleLobby ? (
                                <div className="h-8 flex items-center border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-white">
                                    Main Lobby
                                </div>
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

            {groupsError && (
                <Card className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-red-300">Failed to load groups</p>
                            <p className="text-xs text-red-400/70">
                                {getApiErrorMessage(groupsError, 'We could not load BR groups for this stage.')}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetchGroups()}
                            className="text-red-200 hover:text-white hover:bg-red-500/10"
                        >
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            Retry
                        </Button>
                    </div>
                </Card>
            )}

            {/* Group Content */}
            {!groupsError && selectedStageId && selectedGroupId && selectedGroup ? (
                <>
                    {/* Group Leaderboard */}
                    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                {selectedGroupName} — Leaderboard
                            </h3>
                            {selectedStage && (
                                <StageProgressChip progressLabel={selectedStageProgress} />
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
                                entries={sortedLeaderboard}
                                totalGames={totalRounds}
                                gamesCompleted={completedRounds}
                                qualificationCutoff={qualificationCutoff}
                                pageSize={20}
                            />
                            <p className="text-xs text-zinc-500 text-right mt-1">
                              Rounds are managed in the panel below
                            </p>
                            </>
                        )}
                    </Card>

                    {/* Rounds & Results */}
                    {groupTeamsLoading ? (
                        <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-2">
                            <div className="h-5 w-44 bg-white/5 rounded animate-pulse" />
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </Card>
                    ) : (
                        <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                            <RoundManagementPanel
                                stageId={selectedStageId}
                                groupId={selectedGroupId}
                                groupName={selectedGroupName || selectedGroup.name}
                                teams={groupTeams}
                                scoringPreset={scoringPreset}
                                mapConfig={mapConfig}
                                mapCatalogItems={mapCatalogItems}
                            />
                        </Card>
                    )}
                </>
            ) : selectedStageId && groups.length > 0 && !selectedGroupId ? (
                <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Select a group above to manage rounds and results.</p>
                </Card>
            ) : selectedStageId && groups.length === 0 && !groupsLoading && !groupsError ? (
                <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Initialize the lobby to manage rounds and results.</p>
                </Card>
            ) : null}
        </div>
    );
};
