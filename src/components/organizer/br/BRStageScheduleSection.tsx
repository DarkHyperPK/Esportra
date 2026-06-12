import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Clock, Save } from 'lucide-react';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useBRGroupsDetail, useBRGroupsMutations } from '@/hooks/useBRGroups';
import { formatBRStageStructureSummary } from '@/utils/brGameContext';
import { computeStageFlows } from '@/utils/brStageFlow';
import { useBRStageSchedule } from '@/hooks/useBRStageSchedule';
import { getStageBRConfig } from '@/utils/brConfigResolve';
import { generateBrSchedule } from '@/utils/brScheduleGenerator';
import {
  formatMatchPairing,
  formatMatchPairingFromLabel,
  formatRotationMatchdayLabel,
  groupLobbiesByWave,
  resolveMatchupLabelFromLobby,
  summarizeGroupRotationSchedule,
} from '@/utils/brWaveScheduleDisplay';
import {
  collectGameScheduleErrors,
  getBRScheduleCopy,
  resolveLobbyDisplayLabel,
  validateLobbyGameSchedules,
} from '@/utils/brScheduleLabels';
import { seedGroupShortLabel } from '@/utils/brWaveScheduleDisplay';
import type { BRRound, BRGame } from '@/types/brLobbies';
import type { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface BRStageScheduleSectionProps {
  stage: TournamentStage;
  tournamentId: string;
  allStages: TournamentStage[];
  registeredUnitCount?: number;
  onUpdate: () => void;
}

const toLocalInput = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const BRStageScheduleSection: React.FC<BRStageScheduleSectionProps> = ({
  stage,
  allStages,
  registeredUnitCount = 0,
  onUpdate,
}) => {
  const { toast } = useToast();
  const brConfig = getStageBRConfig(stage);
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
            schedMap[lobby.id] = toLocalInput(lobby.scheduled_at);
            try {
              const games = await apiClient.get<BRGame[]>(`/api/lobbies/${lobby.id}/games`);
              gameMap[lobby.id] = games;
              for (const game of games) {
                gameSchedMap[game.id] = toLocalInput(game.scheduled_at);
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

  const gameScheduleErrors = useMemo(
    () => collectGameScheduleErrors(gamesByLobby, gameSchedules),
    [gamesByLobby, gameSchedules],
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
        description: getApiErrorMessage(error, 'Please try again.'),
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
        description: getApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setSavingGames(false);
    }
  };

  const formatLabel = (brConfig?.format ?? 'static_groups').replace(/_/g, ' ');
  const gamesPerLobby = brConfig?.gamesPerLobby ?? brConfig?.gameCount ?? 6;
  const structureSummary = formatBRStageStructureSummary({
    format: brConfig?.format ?? 'static_groups',
    seedGroups: groups.length || 1,
    gamesPerLobby,
    lobbyCapacity: stage.capacity,
    unitsLabel: 'teams',
  });

  const renderGameRows = (lobby: BRRound) => {
    const lobbyGames = [...(gamesByLobby[lobby.id] ?? [])].sort((a, b) => a.game_number - b.game_number);
    if (lobbyGames.length === 0) return null;

    return (
      <div className="mt-3 space-y-2 pl-2 border-l border-white/10">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
          Per-game starts (sequential — same roster)
        </p>
        {lobbyGames.map((game, gameIdx) => {
          const prevGame = gameIdx > 0 ? lobbyGames[gameIdx - 1] : null;
          const prevTime = prevGame ? gameSchedules[prevGame.id] : '';
          const rowError = gameSchedules[game.id] && prevGame
            ? validateLobbyGameSchedules(lobbyGames, gameSchedules)
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
                  min={prevTime || undefined}
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
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 space-y-3">
        <div>
          <p className="text-sm font-medium text-white">
            {resolveLobbyDisplayLabel(lobby, groups, stageFormat, null)}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {(gamesByLobby[lobby.id] ?? []).length} game{(gamesByLobby[lobby.id] ?? []).length === 1 ? '' : 's'} in this lobby
          </p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Lobby start (optional)</p>
          <Input
            type="datetime-local"
            value={lobbySchedules[lobby.id] || ''}
            onChange={(e) =>
              setLobbySchedules((prev) => ({ ...prev, [lobby.id]: e.target.value }))
            }
            className="h-8 text-xs [color-scheme:dark] bg-white/5 border-white/10"
          />
        </div>
        {renderGameRows(lobby)}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            className="bg-rose-600 hover:bg-rose-500"
            disabled={savingLobbies}
            onClick={() => handleSaveLobbyTimes([lobby.id])}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {savingLobbies ? 'Saving...' : 'Save lobby time'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10"
            disabled={savingGames || gameScheduleErrors.length > 0}
            onClick={() => handleSaveGameTimes([lobby.id])}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {savingGames ? 'Saving...' : 'Save game times'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-white">{stage.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Stage {stage.stage_order} · {groups.length} seed group{groups.length === 1 ? '' : 's'} · {totalAssigned} assigned
          </p>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">{structureSummary.title} — {structureSummary.subtitle}</p>
        </div>
        <Badge className="border-white/10 bg-white/5 text-zinc-300 capitalize">{formatLabel}</Badge>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h4 className="text-sm font-semibold text-white mb-2">Setup checklist</h4>
        <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
          <li>Seed participants into groups (Stages tab → Manage lobbies)</li>
          <li>{scheduleCopy.checklistCreate}</li>
          <li>Set manual start times per group and game below (optional)</li>
          <li>{scheduleCopy.checklistRun}</li>
        </ol>
      </section>

      {groupsLoading ? (
        <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500 text-center">
          Initialize seed groups in the Stages tab before configuring this stage.
        </div>
      ) : (
        <>
          {isRotation ? (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Matchday schedule</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  {summarizeGroupRotationSchedule(groups.length, gamesPerLobby).subtitle}
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  {summarizeGroupRotationSchedule(groups.length, gamesPerLobby).notDoubleRoundRobinNote}
                </p>
              </div>

              {!hasLobbies && schedulePreview ? (
                <>
                  <p className="text-xs text-zinc-400">
                    {schedulePreview.totalWaves} matchday{schedulePreview.totalWaves === 1 ? '' : 's'} ·{' '}
                    {schedulePreview.totalLobbies} cross-group match{schedulePreview.totalLobbies === 1 ? '' : 'es'} ·{' '}
                    {gamesPerLobby} scored game{gamesPerLobby === 1 ? '' : 's'} each
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {schedulePreview.waves.map((wave) => (
                      <div key={wave.wave} className="rounded-lg border border-white/5 px-3 py-2 text-xs text-zinc-400">
                        <span className="text-zinc-300 font-medium">{formatRotationMatchdayLabel(wave.wave)}</span>
                        <ul className="mt-1 space-y-0.5">
                          {wave.lobbies.map((pairing, idx) => (
                            <li key={idx}>
                              {formatMatchPairing(pairing)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    disabled={commitSchedule.isPending}
                    onClick={handleCreateMatches}
                  >
                    {commitSchedule.isPending ? 'Creating matches...' : 'Create matches'}
                  </Button>
                </>
              ) : !hasLobbies ? (
                <p className="text-sm text-amber-300/90">Need at least 2 even groups for round scheduling.</p>
              ) : null}
            </section>
          ) : (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Group lobbies</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  One lobby per seed group ({gamesPerLobby} games each). Create lobbies, then schedule below.
                </p>
              </div>

              {!hasLobbies ? (
                <div className="py-2 space-y-3">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    disabled={generateLobbies.isPending || !seedingComplete}
                    onClick={() => generateLobbies.mutate(undefined, { onSuccess: () => onUpdate() })}
                  >
                    {generateLobbies.isPending ? scheduleCopy.createPending : scheduleCopy.createAction}
                  </Button>
                  {!seedingComplete && (
                    <p className="text-xs text-amber-300/90">
                      Seed all participants first ({totalAssigned}/{expectedUnits || '—'} assigned).
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-emerald-300/90">
                  {lobbies.length} group lobby{lobbies.length === 1 ? '' : 'ies'} ready — schedule each group below.
                </p>
              )}
            </section>
          )}

          {hasLobbies && (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-400" />
                  {scheduleCopy.startTimesTitle}
                </h4>
                <p className="text-xs text-zinc-500 mt-1">{scheduleCopy.startTimesHint}</p>
              </div>

              {loadingLobbies ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : isRotation ? (
                <>
                  {gameScheduleErrors.length > 0 && (
                    <p className="text-xs text-amber-300/90">{gameScheduleErrors[0]}</p>
                  )}
                  <div className="space-y-4 max-h-[28rem] overflow-y-auto">
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
                              className="rounded-xl border border-white/8 bg-white/[0.03] p-3"
                            >
                              <p className="text-xs font-medium text-zinc-300 mb-2">{matchup}</p>
                              <Input
                                type="datetime-local"
                                value={lobbySchedules[lobby.id] || ''}
                                onChange={(e) =>
                                  setLobbySchedules((prev) => ({ ...prev, [lobby.id]: e.target.value }))
                                }
                                className="h-8 text-xs [color-scheme:dark] bg-white/5 border-white/10"
                              />
                              {renderGameRows(lobby)}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-rose-600 hover:bg-rose-500"
                      disabled={savingLobbies}
                      onClick={() => handleSaveLobbyTimes(lobbies.map((l) => l.id))}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {savingLobbies ? 'Saving...' : 'Save all lobby times'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10"
                      disabled={savingGames || gameScheduleErrors.length > 0}
                      onClick={() => handleSaveGameTimes(lobbies.map((l) => l.id))}
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {savingGames ? 'Saving...' : 'Save all game times'}
                    </Button>
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
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default BRStageScheduleSection;
