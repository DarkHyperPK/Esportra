import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Save, Wand2 } from 'lucide-react';
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
  formatRoundLabel,
  groupLobbiesByWave,
  resolveLobbyMatchupLabel,
} from '@/utils/brWaveScheduleDisplay';
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

const formatShort = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export const BRStageScheduleSection: React.FC<BRStageScheduleSectionProps> = ({
  stage,
  tournamentId,
  allStages,
  registeredUnitCount = 0,
  onUpdate,
}) => {
  const { toast } = useToast();
  const brConfig = getStageBRConfig(stage);
  const stageFormat = brConfig?.format ?? 'static_groups';
  const isRotation = stageFormat === 'group_rotation';

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

  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  const [lobbies, setLobbies] = useState<BRRound[]>([]);
  const [lobbySchedules, setLobbySchedules] = useState<Record<string, string>>({});
  const [gameSchedules, setGameSchedules] = useState<Record<string, string>>({});
  const [gamesByLobby, setGamesByLobby] = useState<Record<string, BRGame[]>>({});
  const [loadingLobbies, setLoadingLobbies] = useState(false);
  const [savingLobbies, setSavingLobbies] = useState(false);
  const [savingGames, setSavingGames] = useState(false);

  useEffect(() => {
    setStartsAt(toLocalInput(stage.starts_at));
    setEndsAt(toLocalInput(stage.ends_at));
  }, [stage.id, stage.starts_at, stage.ends_at]);

  useEffect(() => {
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

  const handleSaveStageWindow = async () => {
    setSavingStage(true);
    try {
      const stageDtos = allStages.map((s) => ({
        id: s.id,
        name: s.name,
        format: s.format || 'battle_royale',
        stageOrder: s.stage_order,
        bestOf: 1 as const,
        capacity: s.capacity,
        advancementCount: s.advancement_count,
        startsAt: s.id === stage.id ? (startsAt ? new Date(startsAt).toISOString() : null) : (s.starts_at || null),
        endsAt: s.id === stage.id ? (endsAt ? new Date(endsAt).toISOString() : null) : (s.ends_at || null),
        ...(s.config && typeof s.config === 'object' ? { config: s.config } : {}),
      }));
      await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
      toast({ title: 'Stage window saved' });
      onUpdate();
    } catch (error: unknown) {
      toast({
        title: 'Could not save stage window',
        description: getApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setSavingStage(false);
    }
  };

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

  const handleAutoDistribute = () => {
    if (!startsAt || !endsAt || lobbies.length === 0) return;
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (end <= start) return;
    const interval = (end - start) / lobbies.length;
    const newSchedules: Record<string, string> = {};
    for (let i = 0; i < lobbies.length; i += 1) {
      newSchedules[lobbies[i].id] = toLocalInput(new Date(start + interval * i).toISOString());
    }
    setLobbySchedules(newSchedules);
  };

  const handleSaveGameTimes = async () => {
    setSavingGames(true);
    try {
      let updated = 0;
      for (const [gameId, localVal] of Object.entries(gameSchedules)) {
        const isoVal = localVal ? new Date(localVal).toISOString() : null;
        const existing = Object.values(gamesByLobby)
          .flat()
          .find((g) => g.id === gameId)?.scheduled_at;
        const existingVal = existing ? new Date(existing).toISOString() : null;
        if (isoVal !== existingVal) {
          await apiClient.patch(`/api/br/games/${gameId}`, { scheduledAt: isoVal });
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

  const handleSaveLobbyTimes = async () => {
    setSavingLobbies(true);
    try {
      let updated = 0;
      for (const lobby of lobbies) {
        const localVal = lobbySchedules[lobby.id] || '';
        const isoVal = localVal ? new Date(localVal).toISOString() : null;
        const existingVal = lobby.scheduled_at ? new Date(lobby.scheduled_at).toISOString() : null;
        if (isoVal !== existingVal) {
          await apiClient.patch(`/api/br/lobbies/${lobby.id}`, { scheduledAt: isoVal });
          updated += 1;
        }
      }
      toast({ title: updated > 0 ? `${updated} lobby time(s) saved` : 'No changes to save' });
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

  const formatLabel = (brConfig?.format ?? 'static_groups').replace(/_/g, ' ');
  const lobbiesByWave = useMemo(() => groupLobbiesByWave(lobbies), [lobbies]);
  const gamesPerLobby = brConfig?.gamesPerLobby ?? brConfig?.gameCount ?? 6;
  const structureSummary = formatBRStageStructureSummary({
    format: brConfig?.format ?? 'static_groups',
    seedGroups: groups.length || 1,
    gamesPerLobby,
    lobbyCapacity: stage.capacity,
    unitsLabel: 'teams',
  });

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
        <h4 className="text-sm font-semibold text-white mb-2">Scheduling checklist</h4>
        <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
          <li>Seed participants into groups (Stages tab → Manage lobbies)</li>
          <li>
            {isRotation
              ? 'Create matches from the round schedule below'
              : 'Create matches (button below, or Games tab)'}
          </li>
          <li>Set the stage time window, then lobby start times</li>
          <li>Optional: set per-game start times under each lobby</li>
          <li>Run matches in the Games tab (start game → enter results)</li>
        </ol>
      </section>

      {groupsLoading ? (
        <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500 text-center">
          Initialize seed groups in the Stages tab before configuring schedules.
        </div>
      ) : (
        <>
          {isRotation && (
            <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Round schedule</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Each round pairs two groups into one match. Review below, then create matches.
                </p>
              </div>

              {hasLobbies ? (
                <p className="text-sm text-emerald-300/90">
                  {lobbies.length} match{lobbies.length === 1 ? '' : 'es'} created — set start times below or run them in Games.
                </p>
              ) : schedulePreview ? (
                <>
                  <p className="text-xs text-zinc-400">
                    {schedulePreview.totalWaves} round{schedulePreview.totalWaves === 1 ? '' : 's'} ·{' '}
                    {schedulePreview.totalLobbies} match{schedulePreview.totalLobbies === 1 ? '' : 'es'} · ~{schedulePreview.estimatedDurationMinutes} min est.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {schedulePreview.waves.map((wave) => (
                      <div key={wave.wave} className="rounded-lg border border-white/5 px-3 py-2 text-xs text-zinc-400">
                        <span className="text-zinc-300 font-medium">{formatRoundLabel(wave.wave)}</span>
                        <ul className="mt-1 space-y-0.5">
                          {wave.lobbies.map((pairing, idx) => (
                            <li key={idx}>
                              Match {idx + 1}: {formatMatchPairing(pairing)}
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
              ) : (
                <p className="text-sm text-amber-300/90">
                  Need at least 2 even groups for round scheduling.
                </p>
              )}
            </section>
          )}

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-rose-400" />
                Stage window
              </h4>
              <p className="text-xs text-zinc-500 mt-1">Overall start and end for this stage — used to auto-spread lobby times.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Start</Label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="[color-scheme:dark] bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">End</Label>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  min={startsAt || undefined}
                  className="[color-scheme:dark] bg-white/5 border-white/10"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-500"
              disabled={savingStage || !startsAt || !endsAt}
              onClick={handleSaveStageWindow}
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingStage ? 'Saving...' : 'Save stage window'}
            </Button>
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                Match start times
              </h4>
              <p className="text-xs text-zinc-500 mt-1">
                {isRotation
                  ? 'Set when each round’s matches go live. Create matches first.'
                  : 'Set scheduled starts per match. Create matches below or in the Games tab if none exist yet.'}
              </p>
            </div>

            {startsAt && endsAt && (
              <p className="text-xs text-zinc-500">
                Window: {formatShort(new Date(startsAt).toISOString())} → {formatShort(new Date(endsAt).toISOString())}
              </p>
            )}

            {loadingLobbies ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : lobbies.length === 0 ? (
              <div className="py-4 text-center space-y-3">
                <p className="text-sm text-zinc-500">
                  {isRotation && !hasLobbies
                    ? 'Create matches from the round schedule above first.'
                    : 'No matches yet. Create group matches, then set start times here.'}
                </p>
                {!isRotation && groups.length > 0 && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    disabled={generateLobbies.isPending || !seedingComplete}
                    onClick={() => generateLobbies.mutate(undefined, { onSuccess: () => onUpdate() })}
                  >
                    {generateLobbies.isPending ? 'Creating matches...' : 'Create matches'}
                  </Button>
                )}
                {!isRotation && groups.length > 0 && !seedingComplete && (
                  <p className="text-xs text-amber-300/90">
                    Seed all participants in the Stages tab first ({totalAssigned}/{expectedUnits || '—'} assigned).
                  </p>
                )}
              </div>
            ) : (
              <>
                {startsAt && endsAt && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoDistribute}
                    className="border-white/10 text-zinc-300"
                  >
                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                    Auto-distribute across {lobbies.length} matches
                  </Button>
                )}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {[...lobbiesByWave.entries()].map(([waveNumber, waveLobbies]) => (
                    <div key={waveNumber} className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        {formatRoundLabel(waveNumber)} · {waveLobbies.length} match{waveLobbies.length === 1 ? '' : 'es'}
                      </p>
                      {waveLobbies.map((lobby) => {
                        const rawMatchup = isRotation
                          ? resolveLobbyMatchupLabel(
                              waveNumber,
                              lobby.lobby_index ?? 0,
                              committedFormation ?? brConfig?.lobbyFormation,
                              groups.length,
                            )
                          : null;
                        const matchup = isRotation && rawMatchup
                          ? formatMatchPairingFromLabel(rawMatchup)
                          : `Match ${(lobby.lobby_index ?? 0) + 1}`;
                        return (
                          <div
                            key={lobby.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border border-white/5 rounded-lg bg-black/20"
                          >
                            <div className="sm:w-48 shrink-0">
                              <span className="text-xs font-medium text-zinc-300">{matchup}</span>
                              {isRotation && (
                                <span className="block text-[10px] text-zinc-600">{formatRoundLabel(waveNumber)}</span>
                              )}
                            </div>
                            <Input
                              type="datetime-local"
                              value={lobbySchedules[lobby.id] || ''}
                              onChange={(e) =>
                                setLobbySchedules((prev) => ({ ...prev, [lobby.id]: e.target.value }))
                              }
                              min={startsAt || undefined}
                              max={endsAt || undefined}
                              className="h-8 text-xs flex-1 [color-scheme:dark] bg-white/5 border-white/10"
                            />
                            {(gamesByLobby[lobby.id] ?? []).length > 0 && (
                              <div className="sm:col-span-2 mt-2 space-y-1.5 pl-2 border-l border-white/10">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Per-game starts</p>
                                {(gamesByLobby[lobby.id] ?? []).map((game) => (
                                  <div key={game.id} className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-400 w-16 shrink-0">Game {game.game_number}</span>
                                    <Input
                                      type="datetime-local"
                                      value={gameSchedules[game.id] || ''}
                                      onChange={(e) =>
                                        setGameSchedules((prev) => ({ ...prev, [game.id]: e.target.value }))
                                      }
                                      min={startsAt || undefined}
                                      max={endsAt || undefined}
                                      className="h-7 text-[10px] flex-1 [color-scheme:dark] bg-white/5 border-white/10"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
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
                    onClick={handleSaveLobbyTimes}
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {savingLobbies ? 'Saving...' : 'Save lobby times'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    disabled={savingGames}
                    onClick={handleSaveGameTimes}
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {savingGames ? 'Saving...' : 'Save game times'}
                  </Button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default BRStageScheduleSection;
