import React, { useState, useMemo, useCallback } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
import { getBRConfig, getDefaultGameMode, getDefaultTeamSize } from '@/utils/gameFeatures';
import { useGameCatalogGame } from '@/hooks/useGameCatalogGame';
import { computeStageFlows } from '@/utils/brStageFlow';

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
  maxParticipants?: number | null;
  teamSize?: number | null;
  game?: string;
  tournamentSettings?: Record<string, unknown> | null;
  scoringPreset: unknown;
  onUpdate: () => void;
}

export const BRStageManagementTab: React.FC<BRStageManagementTabProps> = ({
  tournamentId,
  stages: stagesProp,
  maxParticipants,
  teamSize,
  game,
  tournamentSettings,
  onUpdate,
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

  const effectiveTeamSize = useMemo(() => {
    if (teamSize != null && teamSize > 0) return teamSize;
    if (!game) return 1;
    const defaultMode = getDefaultGameMode(game);
    return defaultMode?.teamSize ?? getDefaultTeamSize(game) ?? 1;
  }, [teamSize, game]);

  const unitLabel = effectiveTeamSize === 1 ? 'player' : effectiveTeamSize === 2 ? 'duo' : effectiveTeamSize === 3 ? 'trio' : 'team';
  const unitsLabel = effectiveTeamSize === 1 ? 'players' : effectiveTeamSize === 2 ? 'duos' : effectiveTeamSize === 3 ? 'trios' : 'teams';
  const UnitsLabel = unitsLabel.charAt(0).toUpperCase() + unitsLabel.slice(1);

  const maxLobbySize = brConfig
    ? Math.floor(brConfig.playersPerLobby / Math.max(1, effectiveTeamSize))
    : null;

  const registeredUnitCount = maxParticipants || 0;
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
      return { fromStageName: null as string | null, incomingTeams: registeredUnitCount };
    }
    const lastStage = sortedStages[sortedStages.length - 1];
    const lastFlow = stageFlows.get(lastStage.id);
    return {
      fromStageName: lastStage.name,
      incomingTeams: lastFlow?.teamsAdvancing ?? 0,
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
        description: getApiErrorMessage(error, 'Please try again.'),
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
        description: getApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  };

  const handleResetAllStages = async () => {
    setIsResetting(true);
    try {
      await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, {
        deleteIds: stages.map((s) => s.id),
      });
      toast({ title: 'All stages cleared', description: 'Use the setup wizard to configure again.' });
      setResetConfirmOpen(false);
      setExpandedStageId(null);
      onUpdate();
    } catch (error: unknown) {
      toast({
        title: 'Could not reset stages',
        description: getApiErrorMessage(error, 'Please try again.'),
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
        description: getApiErrorMessage(error, 'Complete all group rounds first.'),
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
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Configure how {unitsLabel} are split across lobbies and who advances between stages.
              Scoring is set in the tournament wizard.
            </p>
          </div>
          {sortedStages.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetConfirmOpen(true)}
                className="border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
              >
                Reset all
              </Button>
              <Button
                size="sm"
                onClick={() => openWizard('add')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Add stage
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {sortedStages.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl px-6">
              <p className="text-white font-medium mb-2">No stages configured yet</p>
              <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                Use the step-by-step wizard to decide whether everyone plays in one lobby or
                whether you need qualifiers and a grand finals.
              </p>
              <Button
                onClick={() => openWizard('initial')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Set up stages
              </Button>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => editNameValue.trim() && saveStageName(stage.id, editNameValue)}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingNameId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="text-left mt-1"
                            onClick={() => {
                              setEditingNameId(stage.id);
                              setEditNameValue(stage.name);
                            }}
                          >
                            <h4 className="font-bold text-white text-base hover:text-rose-300 transition-colors">
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
                              {(flow?.groupsFormed ?? 1) > 1 ? `${flow?.groupsFormed} groups` : '1 lobby'}
                            </div>
                          </div>
                          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Advance</div>
                            <div className="text-white font-semibold mt-1">
                              {isLast ? 'Winner' : flow?.teamsAdvancing ?? 'Not set'}
                            </div>
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10"
                          onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                        >
                          {isExpanded ? 'Hide lobbies' : 'Manage lobbies'}
                        </Button>
                        {canAdvance && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500"
                            onClick={() => setAdvanceConfirmStageId(stage.id)}
                          >
                            Advance {UnitsLabel}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400/70 hover:text-red-400"
                          onClick={() => setDeleteConfirmId(stage.id)}
                        >
                          Delete
                        </Button>
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
        maxLobbySize={maxLobbySize}
        defaultLobbySize={defaultLobbySize}
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
