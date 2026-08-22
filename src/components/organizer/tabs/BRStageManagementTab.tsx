import React, { useState, useMemo, useCallback } from 'react';
import { useQueries } from '@tanstack/react-query';
import { CtaButton, DangerButton, GhostButton, OutlineButton, SuccessButton } from '@/components/ui/app-buttons';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import BRStageSeedingPanel from '@/components/organizer/br/BRStageSeedingPanel';
import BRProStageWizard from '@/components/organizer/br/BRProStageWizard';
import { StageProgressChip } from '@/components/tournament/StageProgressChip';
import type { StageCompletionStatus } from '@/types/stageCompletion';
import { normalizeStageProgressLabel } from '@/types/stageCompletion';
import { getBRConfig, getDefaultTeamSize, getGameMode, getParticipantMode } from '@/utils/gameFeatures';
import { getBRStageUnitLabels, formatBRStageFormatLabel, formatBRAdvancementLabel } from '@/utils/brGameContext';
import { useGameCatalogGame } from '@/hooks/useGameCatalogGame';
import { computeOutgoingFromStage, computeStageFlows, resolveBRRegisteredUnitCount } from '@/utils/brStageFlow';
import { countPendingCheckInParticipants, countCheckedInParticipants } from '@/utils/brCheckIn';
import { getStageBRConfig } from '@/utils/brConfigResolve';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

type StageDtoPatch = Partial<{
    id: string | null;
    name: string;
    stageOrder: number;
    capacity: number | null;
    advancementCount: number | null;
}>;

function buildBrStageDto(stage: TournamentStage, patch?: StageDtoPatch) {
    const dto: Record<string, unknown> = {
        id: patch?.id !== undefined ? patch.id : stage.id,
        name: patch?.name ?? stage.name,
        format: stage.format || 'battle_royale',
        stageOrder: patch?.stageOrder ?? stage.stage_order,
        bestOf: 1,
        capacity: patch?.capacity !== undefined ? patch.capacity : stage.capacity,
        advancementCount: patch?.advancementCount !== undefined ? patch.advancementCount : stage.advancement_count,
    startsAt: stage.starts_at || null,
    endsAt: stage.ends_at || null,
    };
  if (stage.config && typeof stage.config === 'object') {
    dto.config = stage.config;
    }
    return dto;
}

interface Participant {
    team_id?: string | null;
  participant_type?: string | null;
    status?: string;
}

interface BRStageManagementTabProps {
    tournamentId: string;
    stages: TournamentStage[];
  participants?: Participant[];
    maxTeams?: number | null;
    maxParticipants?: number | null;
    teamSize?: number | null;
    gameMode?: string | null;
    participantMode?: 'solo' | 'team' | null;
    game?: string;
    tournamentSettings?: Record<string, unknown> | null;
  scoringPreset: unknown;
    checkInRequired?: boolean;
    onUpdate: () => void;
    locked?: boolean;
}

export const BRStageManagementTab: React.FC<BRStageManagementTabProps> = ({
  tournamentId,
  stages: stagesProp,
  participants,
  maxTeams,
  maxParticipants,
  teamSize,
  gameMode,
  participantMode: participantModeProp,
  game,
  tournamentSettings,
  checkInRequired = false,
  onUpdate,
  locked = false,
}) => {
    const stages = useMemo(() => stagesProp ?? [], [stagesProp]);
    const { toast } = useToast();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'initial' | 'add'>('initial');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [advanceConfirmStageId, setAdvanceConfirmStageId] = useState<string | null>(null);
    const [isAdvancing, setIsAdvancing] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.stage_order - b.stage_order),
    [stages],
  );

  const { data: catalogGame } = useGameCatalogGame(game);
  const catalogBrConfig = catalogGame?.brConfig;
  const brConfig = useMemo(
    () => catalogBrConfig ?? getBRConfig(game || ''),
    [catalogBrConfig, game],
  );
  const catalogDefaultGameCount = brConfig?.defaultGameCount ?? 6;
  const brGameCount =
    (typeof tournamentSettings?.brGameCount === 'number' ? tournamentSettings.brGameCount : null)
    ?? (typeof tournamentSettings?.brDefaultGameCount === 'number' ? tournamentSettings.brDefaultGameCount : null)
    ?? catalogDefaultGameCount;

  const participantMode = useMemo(() => {
    if (participantModeProp) return participantModeProp;
    if (!game) return 'solo' as const;
    return getParticipantMode(game, gameMode);
  }, [participantModeProp, game, gameMode]);

  const effectiveTeamSize = useMemo(() => {
    if (participantMode === 'solo') return 1;
    if (teamSize != null && teamSize > 1) return teamSize;
    if (game) {
      const modeTeamSize = getGameMode(game, gameMode)?.teamSize;
      if (modeTeamSize != null && modeTeamSize > 1) return modeTeamSize;
      const fallback = getDefaultTeamSize(game, gameMode);
      if (fallback > 1) return fallback;
    }
    if (teamSize != null && teamSize > 0) return teamSize;
    return 1;
  }, [participantMode, teamSize, game, gameMode]);

  const { unitLabel, unitsLabel } = useMemo(
    () => getBRStageUnitLabels(effectiveTeamSize, participantMode),
    [effectiveTeamSize, participantMode],
  );
  const UnitsLabel = unitsLabel.charAt(0).toUpperCase() + unitsLabel.slice(1);

  const maxLobbySize = brConfig
    ? Math.floor(brConfig.playersPerLobby / Math.max(1, effectiveTeamSize))
    : null;

  const tournamentMaxUnits = maxTeams ?? maxParticipants ?? 0;
  const registeredUnitCount = resolveBRRegisteredUnitCount(participants, tournamentMaxUnits, checkInRequired);
  const pendingCheckInCount = countPendingCheckInParticipants(participants);
  const checkedInCount = countCheckedInParticipants(participants);

  const defaultLobbySize =
    typeof tournamentSettings?.brDefaultLobbySize === 'number'
      ? tournamentSettings.brDefaultLobbySize
      : maxLobbySize ?? 20;

  const stageFlows = useMemo(
    () => computeStageFlows(sortedStages, registeredUnitCount),
    [sortedStages, registeredUnitCount],
  );

    const stageCompletionQueries = useQueries({
        queries: sortedStages.map((stage) => ({
            queryKey: ['stage-completion', stage.id],
            queryFn: async (): Promise<StageCompletionStatus> => {
        const raw = await apiClient.get<{
          isComplete: boolean;
          alreadyAdvanced: boolean;
          progressLabel: string;
        }>(`/api/stages/${stage.id}/completion-status`);
                return {
                    isComplete: Boolean(raw.isComplete),
                    alreadyAdvanced: Boolean(raw.alreadyAdvanced),
                    progressLabel: normalizeStageProgressLabel(raw.progressLabel),
                };
            },
            enabled: Boolean(stage.id),
            staleTime: 15_000,
        })),
    });

    const completionByStageId = useMemo(() => {
        const map = new Map<string, StageCompletionStatus>();
        sortedStages.forEach((stage, index) => {
            const result = stageCompletionQueries[index]?.data;
            if (result) map.set(stage.id, result);
        });
        return map;
    }, [sortedStages, stageCompletionQueries]);

  const addStageContext = useMemo(() => {
    if (sortedStages.length === 0) {
      return {
        fromStageName: null as string | null,
        incomingTeams: registeredUnitCount,
        priorStageHasAdvancement: false,
      };
    }
    const lastStage = sortedStages[sortedStages.length - 1];
    const lastFlow = stageFlows.get(lastStage.id);
    const teamsEntering = lastFlow?.teamsEntering ?? registeredUnitCount;
    return {
      fromStageName: lastStage.name,
      incomingTeams: computeOutgoingFromStage(lastStage, teamsEntering) ?? 0,
      priorStageHasAdvancement:
        lastStage.advancement_count != null && lastStage.advancement_count > 0,
    };
  }, [sortedStages, stageFlows, registeredUnitCount]);

  const openWizard = (mode: 'initial' | 'add') => {
    setWizardMode(mode);
    setWizardOpen(true);
  };

  const saveStageName = useCallback(async (stageId: string, name: string) => {
    try {
      const stageDtos = stages.map((s) =>
        buildBrStageDto(s, s.id === stageId ? { name: name.trim() } : undefined),
      );
            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
      toast({ title: 'Stage renamed' });
      setEditingNameId(null);
            onUpdate();
        } catch (error: unknown) {
            toast({
        title: 'Could not rename stage',
        description: getApiErrorMessage(error, { context: 'brStageSchedule' }),
                variant: 'destructive',
            });
        }
    }, [stages, tournamentId, toast, onUpdate]);

    const handleDeleteStage = async (stageId: string) => {
        try {
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: [stageId] });
            const remaining = stages
        .filter((s) => s.id !== stageId)
                .sort((a, b) => a.stage_order - b.stage_order);
            if (remaining.length > 0) {
                const resequenced = remaining.map((s, i) => buildBrStageDto(s, { stageOrder: i + 1 }));
                await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: resequenced });
            }
            toast({ title: 'Stage deleted' });
            setDeleteConfirmId(null);
            if (expandedStageId === stageId) setExpandedStageId(null);
            onUpdate();
        } catch (error: unknown) {
            toast({
                title: 'Could not delete stage',
        description: getApiErrorMessage(error, { context: 'brStageSchedule' }),
                variant: 'destructive',
            });
        }
    };

    const handleResetAllStages = async () => {
        setIsResetting(true);
        try {
            const stageIds = stages.map((s) => s.id);
            if (stageIds.length === 0) {
                toast({ title: 'No stages to reset', description: 'There are no stages configured.' });
                setResetConfirmOpen(false);
                return;
            }
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, {
                deleteIds: stageIds,
            });
            toast({ title: 'All stages cleared', description: 'Use the setup wizard to configure again.' });
            setResetConfirmOpen(false);
            setExpandedStageId(null);
            onUpdate();
        } catch (error: unknown) {
            toast({
                title: 'Could not reset stages',
        description: getApiErrorMessage(error, { context: 'brStageSchedule' }),
                variant: 'destructive',
            });
        } finally {
            setIsResetting(false);
        }
    };

    const handleAdvanceTeams = async (stageId: string, advancementCount: number) => {
        setIsAdvancing(true);
        try {
            const data = await apiClient.post<{ advanced: number; to_stage: string }>(
                `/api/stages/${stageId}/br/advance?preview=false`,
        { teamsPerGroup: advancementCount },
            );
      toast({ title: `${data.advanced} ${unitsLabel} advanced to ${data.to_stage}` });
            setAdvanceConfirmStageId(null);
            onUpdate();
        } catch (error: unknown) {
            toast({
                title: 'Advancement failed',
        description: getApiErrorMessage(error, {
          context: 'brStageSchedule',
          fallback: 'Complete all group rounds first.',
        }),
                variant: 'destructive',
            });
        } finally {
            setIsAdvancing(false);
        }
    };

  const formatLabel =
    effectiveTeamSize === 1 ? 'Solo' : effectiveTeamSize === 2 ? 'Duo' : effectiveTeamSize === 3 ? 'Trio' : 'Squad';

    return (
        <>
            <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6">
                <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle>Battle Royale Stages</CardTitle>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                {formatLabel}
                                </span>
                            {checkInRequired && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                                Check-in {checkedInCount}/{checkedInCount + pendingCheckInCount}
                              </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
              Configure how {unitsLabel} are split across lobbies and who advances between stages.
              Scoring is set in the tournament wizard.
                        </p>
                    </div>
                    {sortedStages.length > 0 && (
                        <div className="flex items-center gap-2">
                            {locked ? (
                                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                                    <Lock className="w-3.5 h-3.5" />
                                    Stages locked
                                </span>
                            ) : (
                                <>
                                    <DangerButton
                                        size="sm"
                                        onClick={() => setResetConfirmOpen(true)}
                                    >
                                        Reset all
                                    </DangerButton>
                                    <SuccessButton
                                        size="sm"
                                        onClick={() => openWizard('add')}
                                    >
                                        Add stage
                                    </SuccessButton>
                                </>
                            )}
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-0">
                    {sortedStages.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-white/10 rounded-xl px-6 text-center">
              <p className="text-white font-medium mb-2">No stages configured yet</p>
              <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                Add stages one at a time — choose format, lobby size, advancement, and matches per lobby for each.
              </p>
              <CtaButton
                onClick={() => openWizard('initial')}
                disabled={locked}
              >
                Set up stages
              </CtaButton>
                        </div>
                    ) : (
            <div className="space-y-3">
                            {sortedStages.map((stage, index) => {
                                const flow = stageFlows.get(stage.id);
                                const isLast = index === sortedStages.length - 1;
                const isExpanded = expandedStageId === stage.id;
                                const completion = completionByStageId.get(stage.id);
                const canAdvance =
                  !isLast &&
                  stage.advancement_count != null &&
                  (flow?.teamsAdvancing ?? 0) > 0 &&
                  completion?.isComplete;

                                return (
                  <div
                    key={stage.id}
                    className={`p-5 border rounded-xl ${
                      isExpanded ? 'border-emerald-500/25 bg-emerald-500/[0.03]' : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-zinc-500 font-mono">Stage {index + 1}</span>
                          {(() => {
                            const br = (stage.config as { br?: { format?: string } } | null)?.br;
                            const format = br?.format;
                            if (!format) return null;
                            return (
                              <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold">
                                {formatBRStageFormatLabel(format)}
                              </span>
                            );
                          })()}
                          {isLast && (
                            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">
                              Finals
                            </span>
                          )}
                          <StageProgressChip progressLabel={completion?.progressLabel} />
                                                        </div>

                        {editingNameId === stage.id ? (
                          <div className="flex items-center gap-2 mt-2">
                                                                    <Input
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="h-8 max-w-xs [color-scheme:dark]"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                if (e.key === 'Enter' && editNameValue.trim()) {
                                  saveStageName(stage.id, editNameValue);
                                }
                                if (e.key === 'Escape') setEditingNameId(null);
                              }}
                            />
                            <GhostButton
                              size="sm"
                              onClick={() => editNameValue.trim() && saveStageName(stage.id, editNameValue)}
                            >
                              Save
                                                                    </GhostButton>
                            <GhostButton size="sm" onClick={() => setEditingNameId(null)}>
                              Cancel
                                                                    </GhostButton>
                                                                </div>
                                                            ) : (
                                                                <button
                            type="button"
                            className="text-left mt-1"
                            disabled={locked}
                            onClick={() => {
                              if (locked) return;
                              setEditingNameId(stage.id);
                              setEditNameValue(stage.name);
                            }}
                          >
                            <h4 className={cn("font-bold text-white text-base transition-colors", !locked && "hover:text-rose-300")}>
                                                                        {stage.name}
                                                                    </h4>
                                                                </button>
                                                            )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
                          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{UnitsLabel} in</div>
                            <div className="text-white font-semibold mt-1">{flow?.teamsEntering ?? '—'}</div>
                                                        </div>
                          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Lobby size</div>
                            <div className="text-white font-semibold mt-1">
                              {stage.capacity ?? 'Merged'}
                                                    </div>
                            <div className="text-[10px] text-zinc-600 mt-0.5">
                              {(() => {
                                const br = getStageBRConfig(stage);
                                const games = br?.gamesPerLobby ?? br?.gameCount ?? brGameCount;
                                const groups = flow?.groupsFormed ?? 1;
                                const lobbies = br?.format === 'single_lobby' ? 1 : groups;
                                return `${groups} group${groups === 1 ? '' : 's'} × ${lobbies} lobby${lobbies === 1 ? '' : 'ies'} × ${games} game${games === 1 ? '' : 's'}`;
                              })()}
                            </div>
                                                        </div>
                          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Advance</div>
                            <div className="text-white font-semibold mt-1 text-sm leading-snug">
                              {isLast
                                ? 'Winner'
                                : stage.advancement_count != null
                                  ? formatBRAdvancementLabel({
                                      count: stage.advancement_count,
                                      scope: (() => {
                                        const br = getStageBRConfig(stage);
                                        const mode = br?.advancement?.mode
                                          ?? (br?.format === 'group_rotation' ? 'top_n_overall' : 'top_n_per_group');
                                        return mode === 'top_n_overall' ? 'overall' : 'per_group';
                                      })(),
                                      unitsLabel,
                                    })
                                  : 'Not set'}
                            </div>
                            {!isLast && stage.advancement_count != null && (flow?.teamsAdvancing ?? 0) > 0 && (
                              <div className="text-[10px] text-zinc-600 mt-0.5">
                                {flow?.teamsAdvancing} {unitsLabel} total to next stage
                              </div>
                            )}
                            {!isLast && !stage.advancement_count && (
                              <div className="text-[10px] text-amber-400/80 mt-0.5">Use setup wizard</div>
                                                        )}
                                                    </div>
                          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status</div>
                            <div className="text-white font-semibold mt-1 text-xs">
                              {completion?.progressLabel ?? 'Pending'}
                                                </div>
                                                    </div>
                                                        </div>
                                                    </div>

                      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                                                    <OutlineButton
                                                        size="sm"
                                                        onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                                                    >
                          {isExpanded ? 'Hide lobbies' : 'Manage lobbies'}
                                                    </OutlineButton>
                        {canAdvance && !locked && (
                                                    <SuccessButton
                                                        size="sm"
                            onClick={() => setAdvanceConfirmStageId(stage.id)}
                          >
                            Advance {UnitsLabel}
                          </SuccessButton>
                        )}
                        {!locked && (
                        <button
                          type="button"
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'sm' }),
                            'text-red-400/70 hover:text-red-400',
                          )}
                          onClick={() => setDeleteConfirmId(stage.id)}
                        >
                          Delete
                                                    </button>
                        )}
                                                </div>
                                            </div>

                    {isExpanded && game && (
                                                <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                        <BRStageSeedingPanel
                                                        stageId={stage.id}
                                                        stageCapacity={stage.capacity}
                          stageConfig={stage.config}
                          registeredTeamCount={flow?.teamsEntering ?? registeredUnitCount}
                                                        hasNextStage={!isLast}
                                                        advancementCount={stage.advancement_count}
                                                        checkInRequired={checkInRequired}
                                                        pendingCheckInCount={pendingCheckInCount}
                                                        onUpdate={onUpdate}
                                                    />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

      <BRProStageWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        mode={wizardMode}
        tournamentId={tournamentId}
        existingStages={sortedStages}
        registeredUnitCount={registeredUnitCount}
        incomingTeams={addStageContext.incomingTeams}
        fromStageName={addStageContext.fromStageName}
        priorStageHasAdvancement={addStageContext.priorStageHasAdvancement}
        maxLobbySize={maxLobbySize}
        defaultLobbySize={defaultLobbySize}
        defaultGameCount={catalogDefaultGameCount}
        unitLabel={unitLabel}
        unitsLabel={unitsLabel}
        onComplete={onUpdate}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete stage?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This removes the stage and all its groups, rounds, and results. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteConfirmId && handleDeleteStage(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

            <AlertDialog open={!!advanceConfirmStageId} onOpenChange={() => setAdvanceConfirmStageId(null)}>
                <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                    <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Advance {UnitsLabel}</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            {(() => {
                const stage = sortedStages.find((s) => s.id === advanceConfirmStageId);
                                const flow = stage ? stageFlows.get(stage.id) : null;
                                if (!stage) return '';
                return `Advance the top ${flow?.teamsAdvancing ?? '?'} ${unitsLabel} from "${stage.name}" to the next stage.`;
                            })()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            disabled={isAdvancing}
                            onClick={() => {
                const stage = sortedStages.find((s) => s.id === advanceConfirmStageId);
                                if (stage?.advancement_count && advanceConfirmStageId) {
                                    handleAdvanceTeams(advanceConfirmStageId, stage.advancement_count);
                                }
                            }}
                        >
                            {isAdvancing ? 'Advancing...' : `Advance ${UnitsLabel}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
                <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                    <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Reset all stages?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
              This permanently deletes all {sortedStages.length} stages, including groups, rounds, and results.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isResetting}
                            onClick={handleResetAllStages}
                        >
              {isResetting ? 'Resetting...' : 'Reset all'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
