import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Users, Trophy, Filter, ChevronRight, RefreshCw } from 'lucide-react';
import { useBRGroupLeaderboard, useBRGroupRounds, useBRStageLeaderboard } from '@/hooks/useBRGroupLeaderboard';
import { useBRGroupTeams, useBRGroups, useBRGroupsDetail } from '@/hooks/useBRGroups';
import { useStageLobbiesDeduped } from '@/hooks/useBRLobbies';
import { LobbyManagementPanel } from '@/components/organizer/br/LobbyManagementPanel';
import { BRWaveLobbyPanel } from '@/components/organizer/br/BRWaveLobbyPanel';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import { StageProgressChip } from '@/components/tournament/StageProgressChip';
import { useStageCompletion } from '@/hooks/useStageCompletion';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { Database } from '@/integrations/supabase/types';
import { getQualificationCutoff, sortBRLeaderboardEntries } from '@/utils/brConfigResolve';
import { useBRStageConfig } from '@/hooks/useBRStageConfig';
import { computeStageFlows, resolveBRRegisteredUnitCount } from '@/utils/brStageFlow';
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
    tournamentStartDate?: string | null;
    tournamentEndDate?: string | null;
    stages: TournamentStage[];
    game: string;
    tournamentSettings?: Record<string, unknown> | null;
    teamSize?: number;
    maxTeams?: number | null;
    participants?: Array<{ status?: string | null; checked_in_at?: string | null }>;
    checkInRequired?: boolean;
    /** @deprecated use resolved stage config instead */
    scoringPreset?: ScoringPreset;
}

export const BRGamesTab: React.FC<BRGamesTabProps> = ({
    tournamentId: _tournamentId,
    tournamentStartDate,
    tournamentEndDate,
    stages: stagesProp,
    game,
    tournamentSettings,
    teamSize = 1,
    maxTeams,
    participants,
    checkInRequired = false,
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

    const { config: resolvedStageConfig } = useBRStageConfig(selectedStage?.id, {
        tournamentSettings,
        stage: selectedStage ?? null,
        gameName: game,
        catalogBrConfig,
    });

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
        generateLobbies,
    } = useBRGroups(selectedStageId || null);

    const { data: groupsDetail } = useBRGroupsDetail(selectedStageId || null, { includeTeams: false });
    const hasRounds = groupsDetail?.has_rounds === true;

    const registeredUnitCount = resolveBRRegisteredUnitCount(participants, maxTeams ?? 0, checkInRequired);
    const stageFlows = useMemo(
        () => computeStageFlows(sortedStages, registeredUnitCount),
        [sortedStages, registeredUnitCount],
    );
    const selectedStageFlow = stageFlows.get(selectedStageId);
    const expectedUnits = selectedStageFlow?.teamsEntering ?? registeredUnitCount;
    const totalAssigned = groups.reduce((sum, group) => sum + group.team_count, 0);
    const seedingComplete =
        groups.length > 0
        && totalAssigned > 0
        && (expectedUnits <= 0 || totalAssigned >= expectedUnits)
        && !groups.some((group) => group.team_count === 0);

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
    const { leaderboard: groupLeaderboard, isLoading: groupLeaderboardLoading } = useBRGroupLeaderboard(
        selectedStageId || null,
        selectedGroupId || null
    );
    const { leaderboard: stageLeaderboard, isLoading: stageLeaderboardLoading } = useBRStageLeaderboard(
        selectedStageId || null,
    );

    const stageFormat = resolvedStageConfig?.format ?? 'static_groups';
    const isGroupRotation = stageFormat === 'group_rotation';
    const isMultiLobbyCut = stageFormat === 'multi_lobby_cut';
    const useWaveLobbyView = isGroupRotation;
    const needsMatchGeneration = !useWaveLobbyView && seedingComplete && !hasRounds;

    const leaderboardScope = resolvedStageConfig?.leaderboardScope ?? 'per_seed_group';
    const leaderboard = leaderboardScope === 'stage_global' ? stageLeaderboard : groupLeaderboard;
    const leaderboardLoading = leaderboardScope === 'stage_global' ? stageLeaderboardLoading : groupLeaderboardLoading;

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
    const { totalGames, completedGames } = useBRGroupRounds(
        selectedStageId || null,
        selectedGroupId || null
    );

    const { progressLabel: selectedStageProgress } = useStageCompletion(selectedStageId || null);

    const { lobbies: stageLobbies } = useStageLobbiesDeduped(
        useWaveLobbyView ? selectedStageId || null : null,
        useWaveLobbyView ? groups : [],
    );
    const rotationGamesCompleted = useMemo(
        () => stageLobbies.filter((l) => l.status === 'completed').length,
        [stageLobbies],
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

                        {!useWaveLobbyView && groups.length !== 1 && (
                            <ChevronRight className="w-4 h-4 text-gray-600 hidden sm:block mt-4" />
                        )}

                        {/* Group Selector — hidden for group rotation (wave-based view) */}
                        {!useWaveLobbyView && (
                        <div className="space-y-0.5">
                            <label className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">
                                {isSingleLobby ? 'Lobby' : isMultiLobbyCut ? 'Parallel lobby' : 'Group'}
                            </label>
                            {groupsLoading ? (
                                <div className="h-8 w-[180px] bg-white/5 rounded-md animate-pulse" />
                            ) : groups.length === 0 ? (
                                <Button
                                    size="sm"
                                    onClick={() => bootstrapLobby.mutate()}
                                    disabled={bootstrapLobby.isPending}
                                    className="h-8 bg-emerald-600 text-white hover:bg-emerald-500 hover:text-white border-emerald-500/40 font-mono text-[11px] font-bold uppercase tracking-wider"
                                >
                                    {bootstrapLobby.isPending ? 'Initializing...' : 'Initialize Groups'}
                                </Button>
                            ) : needsMatchGeneration ? (
                                <Button
                                    size="sm"
                                    onClick={() => generateLobbies.mutate()}
                                    disabled={generateLobbies.isPending}
                                    className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold uppercase tracking-wider"
                                >
                                    {generateLobbies.isPending ? 'Creating...' : 'Create Matches'}
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
                        )}
                        {useWaveLobbyView && groups.length > 0 && (
                            <div className="text-xs text-zinc-500 mt-4 sm:mt-0">
                                {groups.length} groups · round matches below
                            </div>
                        )}
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

            {groups.length > 0 && !hasRounds && !seedingComplete && !useWaveLobbyView && (
                <Card className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <p className="text-sm text-amber-200">
                        Finish seeding in the Stages tab ({totalAssigned}/{expectedUnits || '—'} assigned) before creating matches.
                    </p>
                </Card>
            )}

            {needsMatchGeneration && (
                <Card className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <p className="text-sm text-amber-200">
                        Seed participants in the Stages tab, then create matches to unlock the Games panel.
                    </p>
                </Card>
            )}

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
            {!groupsError && selectedStageId && useWaveLobbyView && groups.length > 0 ? (
                <>
                    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                {selectedStage?.name} — Stage leaderboard
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
                        ) : sortedLeaderboard.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-6">
                                No results yet. Complete round matches below.
                            </p>
                        ) : (
                            <BRLeaderboard
                                entries={sortedLeaderboard}
                                totalGames={stageLobbies.length}
                                gamesCompleted={rotationGamesCompleted}
                                qualificationCutoff={qualificationCutoff}
                                pageSize={20}
                            />
                        )}
                    </Card>
                    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <BRWaveLobbyPanel
                            stageId={selectedStageId}
                            groups={groups}
                            seedGroupCount={groups.length}
                            gamesPerMatch={resolvedStageConfig?.gamesPerLobby ?? resolvedStageConfig?.gameCount ?? 6}
                            scoringPreset={scoringPreset}
                            mapConfig={mapConfig}
                            mapCatalogItems={mapCatalogItems}
                            tournamentStartDate={tournamentStartDate}
                            tournamentEndDate={tournamentEndDate}
                        />
                    </Card>
                </>
            ) : !groupsError && selectedStageId && selectedGroupId && selectedGroup && hasRounds ? (
                <>
                    {/* Group Leaderboard */}
                    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                {leaderboardScope === 'stage_global' ? selectedStage?.name : selectedGroupName} — Leaderboard
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
                                No results yet. Start lobbies below and submit results.
                            </p>
                        ) : (
                            <>
                            <BRLeaderboard
                                entries={sortedLeaderboard}
                                totalGames={totalGames}
                                gamesCompleted={completedGames}
                                qualificationCutoff={qualificationCutoff}
                                pageSize={20}
                            />
                            <p className="text-xs text-zinc-500 text-right mt-1">
                              Lobbies are managed in the panel below
                            </p>
                            </>
                        )}
                    </Card>

                    {/* Lobbies & Results */}
                    {groupTeamsLoading ? (
                        <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-2">
                            <div className="h-5 w-44 bg-white/5 rounded animate-pulse" />
                            {Array.from({ length: 2 }).map((_, i) => (
                                <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </Card>
                    ) : (
                        <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                            <LobbyManagementPanel
                                stageId={selectedStageId}
                                groupId={selectedGroupId}
                                groupName={selectedGroupName || selectedGroup.name}
                                teams={groupTeams}
                                scoringPreset={scoringPreset}
                                mapConfig={mapConfig}
                                mapCatalogItems={mapCatalogItems}
                                tournamentStartDate={tournamentStartDate}
                                tournamentEndDate={tournamentEndDate}
                                allowCreateLobby={!isGroupRotation}
                                gamesPerLobby={resolvedStageConfig?.gamesPerLobby ?? resolvedStageConfig?.gameCount ?? 6}
                            />
                        </Card>
                    )}
                </>
            ) : selectedStageId && groups.length > 0 && !selectedGroupId ? (
                <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Select a group above to manage lobbies and results.</p>
                </Card>
            ) : selectedStageId && groups.length === 0 && !groupsLoading && !groupsError ? (
                <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Initialize the lobby to manage lobbies and results.</p>
                </Card>
            ) : null}
        </div>
    );
};
