import React, { useEffect, useMemo, useState } from 'react';
import { CtaButton, OutlineButton } from '@/components/ui/app-buttons';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, Save, AlertTriangle } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useBRGroupsDetail, useBRGroupsMutations } from '@/hooks/useBRGroups';
import { formatBRStageFormatLabel } from '@/utils/brGameContext';
import { computeStageFlows } from '@/utils/brStageFlow';
import { useBRStageSchedule } from '@/hooks/useBRStageSchedule';
import { getStageBRConfig } from '@/utils/brConfigResolve';
import { useBRStageConfig } from '@/hooks/useBRStageConfig';
import { usesGameOnlySchedule } from '@/utils/brLobbyPatch';
import { generateBrSchedule } from '@/utils/brScheduleGenerator';
import {
  formatMatchPairing,
  formatRotationMatchdayLabel,
  groupLobbiesByWave,
  resolveMatchupLabelFromLobby,
  seedGroupShortLabel,
  summarizeGroupRotationSchedule,
} from '@/utils/brWaveScheduleDisplay';
import {
  collectGameScheduleErrors,
  collectLobbyScheduleErrors,
  getBRScheduleCopy,
  resolveGameScheduleMin,
  resolveLobbyDisplayLabel,
  validateLobbyGameSchedules,
} from '@/utils/brScheduleLabels';
import { getTournamentDatetimeLocalBounds } from '@/utils/tournamentScheduleValidation';
import { utcToLocalInput } from '@/lib/timeUtils';
import type { BRRound, BRGame } from '@/types/brLobbies';
import type { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface BRStageScheduleSectionProps {
  stage: TournamentStage;
  tournamentId: string;
  tournamentStartDate?: string | null;
  tournamentEndDate?: string | null;
  allStages: TournamentStage[];
  registeredUnitCount?: number;
  onUpdate: () => void;
}

export const BRStageScheduleSection: React.FC<BRStageScheduleSectionProps> = ({
  stage,
  tournamentStartDate,
  tournamentEndDate,
  allStages,
  registeredUnitCount = 0,
  onUpdate,
}) => {
  const { toast } = useToast();
  const brConfig = getStageBRConfig(stage);
  const { apiConfig } = useBRStageConfig(stage.id);
  const gamesModelActive = apiConfig?.gamesModelActive ?? false;
  const stageFormat = brConfig?.format ?? 'static_groups';
  const isRotation = stageFormat === 'group_rotation';
  const scheduleCopy = getBRScheduleCopy(stageFormat);

  const { data: groupsDetail, isLoading: groupsLoading } = useBRGroupsDetail(stage.id, { includeTeams: false });
  const groups = groupsDetail?.groups ?? [];
  const hasLobbies = groupsDetail?.has_rounds === true;
  const totalAssigned = groups.reduce((sum, g) => sum + g.team_count, 0);
  const stageFlows = useMemo(
    () => computeStageFlows(allStages, registeredUnitCount),
    [allStages, registeredUnitCount],
  );
  const expectedUnits = stageFlows.get(stage.id)?.teamsEntering ?? registeredUnitCount;
  const seedingComplete =
    groups.length > 0
    && totalAssigned > 0
    && (expectedUnits <= 0 || totalAssigned >= expectedUnits)
    && !groups.some((group) => group.team_count === 0);

  const { schedule: committedFormation, commitSchedule } = useBRStageSchedule(stage.id);
  const { generateLobbies } = useBRGroupsMutations(stage.id);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [lobbies, setLobbies] = useState<BRRound[]>([]);
  const [lobbySchedules, setLobbySchedules] = useState<Record<string, string>>({});
  const [gameSchedules, setGameSchedules] = useState<Record<string, string>>({});
  const [gamesByLobby, setGamesByLobby] = useState<Record<string, BRGame[]>>({});
  const [loadingLobbies, setLoadingLobbies] = useState(false);
  const [savingLobbies, setSavingLobbies] = useState(false);
  const [savingGames, setSavingGames] = useState(false);

  const activeGroupId = selectedGroupId && groups.some((g) => g.id === selectedGroupId)
    ? selectedGroupId
    : groups[0]?.id ?? null;

  useEffect(() => {
    setSelectedGroupId(null);
  }, [stage.id]);

  useEffect(() => {
    if (!hasLobbies) {
      setLobbies([]);
      setLobbySchedules({});
      setGamesByLobby({});
      setGameSchedules({});
      return;
    }

    let cancelled = false;
    setLoadingLobbies(true);
    apiClient
      .get<BRRound[]>(`/api/stages/${stage.id}/br/lobbies`)
      .then(async (rows) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setLobbies(list);
        const schedMap: Record<string, string> = {};
        const gameMap: Record<string, BRGame[]> = {};
        const gameSchedMap: Record<string, string> = {};
        await Promise.all(
          list.map(async (lobby) => {
            schedMap[lobby.id] = utcToLocalInput(lobby.scheduled_at ?? '');
            try {
              const games = await apiClient.get<BRGame[]>(`/api/lobbies/${lobby.id}/games`);
              gameMap[lobby.id] = games;
              for (const game of games) {
                gameSchedMap[game.id] = utcToLocalInput(game.scheduled_at ?? '');
              }
            } catch {
              gameMap[lobby.id] = [];
            }
          }),
        );
        if (cancelled) return;
        setLobbySchedules(schedMap);
        setGamesByLobby(gameMap);
        setGameSchedules(gameSchedMap);
      })
      .catch(() => {
        if (!cancelled) {
          setLobbies([]);
          setLobbySchedules({});
          setGamesByLobby({});
          setGameSchedules({});
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLobbies(false);
      });

    return () => { cancelled = true; };
  }, [stage.id, hasLobbies]);

  const gamesPerLobby = brConfig?.gamesPerLobby ?? brConfig?.gameCount ?? 6;
  const hasGamesModel = usesGameOnlySchedule(gamesModelActive, gamesPerLobby);

  const gameSchedulesDirty = useMemo(() => {
    for (const games of Object.values(gamesByLobby)) {
      for (const game of games) {
        const local = gameSchedules[game.id] ?? '';
        const committed = utcToLocalInput(game.scheduled_at ?? '');
        if (local !== committed) return true;
      }
    }
    return false;
  }, [gamesByLobby, gameSchedules]);

  const lobbySchedulesDirty = useMemo(() => {
    if (hasGamesModel) return false;
    for (const lobby of lobbies) {
      const local = lobbySchedules[lobby.id] ?? '';
      const committed = utcToLocalInput(lobby.scheduled_at ?? '');
      if (local !== committed) return true;
    }
    return false;
  }, [hasGamesModel, lobbies, lobbySchedules]);

  const scheduleDirty = gameSchedulesDirty || lobbySchedulesDirty;
  const formatLabel = formatBRStageFormatLabel(brConfig?.format ?? 'static_groups');

  const rotationSummary = useMemo(() => {
    if (!isRotation || groups.length < 2) return null;
    return summarizeGroupRotationSchedule(groups.length, gamesPerLobby);
  }, [isRotation, groups.length, gamesPerLobby]);

  const schedulePreview = useMemo(() => {
    if (!isRotation || groups.length < 2) return null;
    try {
      return generateBrSchedule({ seedGroupCount: groups.length });
    } catch {
      return null;
    }
  }, [isRotation, groups.length]);

  const lobbiesForSelectedGroup = useMemo(() => {
    if (!activeGroupId) return [];
    return lobbies.filter((lobby) => lobby.group_ids?.includes(activeGroupId));
  }, [lobbies, activeGroupId]);

  const lobbiesByWave = useMemo(() => groupLobbiesByWave(lobbies), [lobbies]);

  const scheduleBounds = useMemo(
    () => getTournamentDatetimeLocalBounds(tournamentStartDate, tournamentEndDate),
    [tournamentStartDate, tournamentEndDate],
  );

  const gameScheduleErrors = useMemo(
    () => collectGameScheduleErrors(gamesByLobby, gameSchedules, {
      tournamentStart: tournamentStartDate,
      tournamentEnd: tournamentEndDate,
      lobbySchedules: hasGamesModel ? {} : lobbySchedules,
    }),
    [gamesByLobby, gameSchedules, tournamentStartDate, tournamentEndDate, lobbySchedules, hasGamesModel],
  );

  const lobbyScheduleErrors = useMemo(
    () => hasGamesModel
      ? []
      : collectLobbyScheduleErrors(lobbies, lobbySchedules, {
          tournamentStart: tournamentStartDate,
          tournamentEnd: tournamentEndDate,
          isRotation,
        }),
    [hasGamesModel, lobbies, lobbySchedules, tournamentStartDate, tournamentEndDate, isRotation],
  );

  const scheduleErrors = useMemo(
    () => [...lobbyScheduleErrors, ...gameScheduleErrors],
    [lobbyScheduleErrors, gameScheduleErrors],
  );

  const handleCreateMatches = async () => {
    if (!schedulePreview) return;
    try {
      await commitSchedule.mutateAsync({
        mode: 'rotating_pairwise',
        seedGroupCount: groups.length,
        groupsPerLobby: 2,
        matchesPerWave: 1,
        matchupSchedule: 'auto',
        waves: schedulePreview.waves,
      });
      onUpdate();
    } catch { /* toast in hook */ }
  };

  const handleSaveLobbyTimes = async (lobbyIds: string[]) => {
    const targetLobbies = lobbies.filter((l) => lobbyIds.includes(l.id));
    const errors = collectLobbyScheduleErrors(targetLobbies, lobbySchedules, {
      tournamentStart: tournamentStartDate,
      tournamentEnd: tournamentEndDate,
      isRotation,
    });
    if (errors.length > 0) {
      toast({
        title: 'Lobby times are invalid',
        description: errors[0],
        variant: 'destructive',
      });
      return;
    }

    setSavingLobbies(true);
    try {
      let updated = 0;
      for (const lobbyId of lobbyIds) {
        const lobby = lobbies.find((l) => l.id === lobbyId);
        if (!lobby) continue;
        const localVal = lobbySchedules[lobbyId] || '';
        const isoVal = localVal ? new Date(localVal).toISOString() : null;
        const existingVal = lobby.scheduled_at ? new Date(lobby.scheduled_at).toISOString() : null;
        if (isoVal !== existingVal) {
          await apiClient.patch(`/api/br/lobbies/${lobbyId}`, { scheduledAt: isoVal });
          updated += 1;
        }
      }
      toast({ title: updated > 0 ? `${updated} lobby time(s) saved` : 'No lobby changes to save' });
      onUpdate();
    } catch (error: unknown) {
      toast({
        title: 'Could not save lobby times',
        description: getApiErrorMessage(error, { context: 'brStageSchedule' }),
        variant: 'destructive',
      });
    } finally {
      setSavingLobbies(false);
    }
  };

  const handleSaveGameTimes = async (lobbyIds: string[]) => {
    const relevantGames = lobbyIds.flatMap((id) => gamesByLobby[id] ?? []);
    const relevantSchedules = Object.fromEntries(
      relevantGames.map((g) => [g.id, gameSchedules[g.id] ?? '']),
    );
    const errors = collectGameScheduleErrors(
      Object.fromEntries(lobbyIds.map((id) => [id, gamesByLobby[id] ?? []])),
      relevantSchedules,
      {
        tournamentStart: tournamentStartDate,
        tournamentEnd: tournamentEndDate,
        lobbySchedules,
      },
    );
    if (errors.length > 0) {
      toast({
        title: 'Game times must be sequential',
        description: errors[0],
        variant: 'destructive',
      });
      return;
    }

    setSavingGames(true);
    try {
      let updated = 0;
      for (const game of relevantGames) {
        const localVal = gameSchedules[game.id] || '';
        const isoVal = localVal ? new Date(localVal).toISOString() : null;
        const existingVal = game.scheduled_at ? new Date(game.scheduled_at).toISOString() : null;
        if (isoVal !== existingVal) {
          await apiClient.patch(`/api/br/games/${game.id}`, { scheduledAt: isoVal });
          updated += 1;
        }
      }
      toast({ title: updated > 0 ? `${updated} game time(s) saved` : 'No game changes to save' });
      onUpdate();
    } catch (error: unknown) {
      toast({
        title: 'Could not save game times',
        description: getApiErrorMessage(error, { context: 'brStageSchedule' }),
        variant: 'destructive',
      });
    } finally {
      setSavingGames(false);
    }
  };

  const renderGameRows = (lobby: BRRound) => {
    const lobbyGames = [...(gamesByLobby[lobby.id] ?? [])].sort((a, b) => a.game_number - b.game_number);
    if (lobbyGames.length === 0) return null;
    const lobbyScheduleLocal = hasGamesModel ? '' : (lobbySchedules[lobby.id] ?? '');
    const gameValidationOptions = {
      tournamentStart: tournamentStartDate,
      tournamentEnd: tournamentEndDate,
      lobbyScheduleLocal,
    };

    return (
      <div className="mt-3 space-y-2 pl-2 border-l border-white/10">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">Games</p>
        {lobbyGames.map((game, gameIdx) => {
          const prevGame = gameIdx > 0 ? lobbyGames[gameIdx - 1] : null;
          const prevTime = prevGame ? gameSchedules[prevGame.id] : '';
          const gameMin = resolveGameScheduleMin(
            prevTime,
            lobbyScheduleLocal,
            scheduleBounds.min,
          );
          const rowError = gameSchedules[game.id]
            ? validateLobbyGameSchedules(lobbyGames, gameSchedules, gameValidationOptions)
            : null;
          return (
            <div key={game.id} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 w-16 shrink-0">Game {game.game_number}</span>
                <Input
                  type="datetime-local"
                  value={gameSchedules[game.id] || ''}
                  onChange={(e) =>
                    setGameSchedules((prev) => ({ ...prev, [game.id]: e.target.value }))
                  }
                  min={gameMin || scheduleBounds.min || undefined}
                  max={scheduleBounds.max || undefined}
                  className="h-7 text-[10px] flex-1 [color-scheme:dark] bg-white/5 border-white/10"
                />
              </div>
              {rowError && gameSchedules[game.id] && (
                <p className="text-[10px] text-amber-400/90 pl-[4.5rem]">{rowError}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderGroupSchedulePanel = () => {
    const group = groups.find((g) => g.id === activeGroupId);
    const groupLobbies = lobbiesForSelectedGroup;

    if (groupLobbies.length === 0) {
      return (
        <p className="text-sm text-zinc-500 py-4 text-center">
          No lobby for this group yet. Create group lobbies first.
        </p>
      );
    }

    if (groupLobbies.length > 1) {
      return (
        <p className="text-sm text-amber-300/90 py-2">
          Group {seedGroupShortLabel(group?.name ?? '')} has {groupLobbies.length} lobbies — qualifiers should have exactly one.
        </p>
      );
    }

    const lobby = groupLobbies[0];
    return (
      <div className="space-y-4 py-2">
        <p className="text-sm text-zinc-300">
          {resolveLobbyDisplayLabel(lobby, groups, stageFormat, null)}
        </p>
        {!hasGamesModel && (
          <Input
            type="datetime-local"
            value={lobbySchedules[lobby.id] || ''}
            onChange={(e) =>
              setLobbySchedules((prev) => ({ ...prev, [lobby.id]: e.target.value }))
            }
            min={scheduleBounds.min || undefined}
            max={scheduleBounds.max || undefined}
            className="h-9 text-sm max-w-xs [color-scheme:dark] bg-white/5 border-white/10"
          />
        )}
        {renderGameRows(lobby)}
        <div className="flex flex-wrap gap-2">
          {hasGamesModel ? (
            <CtaButton
              size="sm"
              disabled={savingGames || gameScheduleErrors.length > 0 || !gameSchedulesDirty}
              onClick={() => handleSaveGameTimes([lobby.id])}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingGames ? 'Saving...' : 'Save schedule'}
            </CtaButton>
          ) : (
            <>
              <CtaButton
                size="sm"
                disabled={savingLobbies || lobbyScheduleErrors.length > 0 || !lobbySchedulesDirty}
                onClick={() => handleSaveLobbyTimes([lobby.id])}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingLobbies ? 'Saving...' : 'Save lobby time'}
              </CtaButton>
              <OutlineButton
                type="button"
                size="sm"
                disabled={savingGames || gameScheduleErrors.length > 0 || !gameSchedulesDirty}
                onClick={() => handleSaveGameTimes([lobby.id])}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingGames ? 'Saving...' : 'Save game times'}
              </OutlineButton>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {(tournamentStartDate || tournamentEndDate) && (
        <p className="text-xs text-zinc-500">
          {hasGamesModel ? 'Game start times' : 'Lobby and game start times'} must fall within the tournament window:{' '}
          <span className="text-zinc-400">{scheduleBounds.windowLabel}</span>
        </p>
      )}
      {scheduleDirty && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-amber-100">
            You have unsaved schedule changes. Save schedule before leaving this tab.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{stage.name}</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Stage {stage.stage_order}
            {groups.length > 0 && <> · {groups.length} groups · {totalAssigned} seeded</>}
            {rotationSummary && (
              <> · {rotationSummary.matchdayCount} matchdays · {gamesPerLobby} games/match</>
            )}
          </p>
        </div>
        <Badge variant="outline" className="border-white/10 text-zinc-400 font-normal">
          {formatLabel}
        </Badge>
      </div>

      {groupsLoading ? (
        <div className="h-20 bg-white/5 animate-pulse" />
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-500 py-6 text-center">
          Initialize groups in Stages first.
        </p>
      ) : (
        <>
          {isRotation ? (
            <div className="space-y-5">
              {!hasLobbies && schedulePreview ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {schedulePreview.waves.map((wave) => (
                      <div key={wave.wave} className="px-1 py-2">
                        <p className="text-xs font-medium text-zinc-300">
                          {formatRotationMatchdayLabel(wave.wave)}
                        </p>
                        <ul className="mt-1.5 space-y-0.5 text-sm text-zinc-500">
                          {wave.lobbies.map((pairing, idx) => (
                            <li key={idx}>{formatMatchPairing(pairing)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={commitSchedule.isPending}
                    onClick={handleCreateMatches}
                    className={cn(buttonVariants({ variant: 'success', size: 'sm' }))}
                  >
                    {commitSchedule.isPending ? 'Creating...' : 'Create matches'}
                  </button>
                </>
              ) : !hasLobbies ? (
                <p className="text-sm text-amber-400/90">Need an even number of groups.</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {!hasLobbies ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={generateLobbies.isPending || !seedingComplete}
                    onClick={() => generateLobbies.mutate(undefined, { onSuccess: () => onUpdate() })}
                    className={cn(buttonVariants({ variant: 'success', size: 'sm' }))}
                  >
                    {generateLobbies.isPending ? scheduleCopy.createPending : scheduleCopy.createAction}
                  </button>
                  {!seedingComplete && (
                    <span className="text-xs text-zinc-500">
                      {totalAssigned}/{expectedUnits || '—'} seeded
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {hasLobbies && (
            <div className="space-y-5 pt-2 border-t border-white/5">
              <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {scheduleCopy.startTimesTitle}
              </h4>

              {loadingLobbies ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : isRotation ? (
                <>
                  {scheduleErrors.length > 0 && (
                    <p className="text-xs text-amber-300/90">{scheduleErrors[0]}</p>
                  )}
                  <div className="space-y-4 max-h-[28rem] overflow-y-auto overscroll-contain" data-lenis-prevent>
                    {[...lobbiesByWave.entries()].map(([waveNumber, waveLobbies]) => (
                      <div key={waveNumber} className="space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                          {scheduleCopy.waveHeader(waveNumber, waveLobbies.length)}
                        </p>
                        {waveLobbies.map((lobby) => {
                          const matchup = resolveMatchupLabelFromLobby(
                            lobby,
                            groups,
                            committedFormation ?? brConfig?.lobbyFormation,
                            groups.length,
                          );
                          return (
                            <div
                              key={lobby.id}
                              className="py-3 border-b border-white/5 last:border-0"
                            >
                              <p className="text-sm text-zinc-300 mb-2">{matchup}</p>
                              {!hasGamesModel && (
                                <Input
                                  type="datetime-local"
                                  value={lobbySchedules[lobby.id] || ''}
                                  onChange={(e) =>
                                    setLobbySchedules((prev) => ({ ...prev, [lobby.id]: e.target.value }))
                                  }
                                  min={scheduleBounds.min || undefined}
                                  max={scheduleBounds.max || undefined}
                                  className="h-8 text-xs [color-scheme:dark] bg-white/5 border-white/10"
                                />
                              )}
                              {renderGameRows(lobby)}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hasGamesModel ? (
                      <CtaButton
                        size="sm"
                        disabled={savingGames || gameScheduleErrors.length > 0 || !gameSchedulesDirty}
                        onClick={() => handleSaveGameTimes(lobbies.map((l) => l.id))}
                      >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {savingGames ? 'Saving...' : 'Save schedule'}
                      </CtaButton>
                    ) : (
                      <>
                        <CtaButton
                          size="sm"
                          disabled={savingLobbies || lobbyScheduleErrors.length > 0 || !lobbySchedulesDirty}
                          onClick={() => handleSaveLobbyTimes(lobbies.map((l) => l.id))}
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          {savingLobbies ? 'Saving...' : 'Save all lobby times'}
                        </CtaButton>
                        <OutlineButton
                          type="button"
                          size="sm"
                          disabled={savingGames || gameScheduleErrors.length > 0 || !gameSchedulesDirty}
                          onClick={() => handleSaveGameTimes(lobbies.map((l) => l.id))}
                        >
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                          {savingGames ? 'Saving...' : 'Save all game times'}
                        </OutlineButton>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {groups.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                            activeGroupId === group.id
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                              : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {seedGroupShortLabel(group.name)}
                        </button>
                      ))}
                    </div>
                  )}
                  {renderGroupSchedulePanel()}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BRStageScheduleSection;
