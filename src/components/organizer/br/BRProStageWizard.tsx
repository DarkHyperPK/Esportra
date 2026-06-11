import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import {
  deriveGroupCount,
  deriveLobbySize,
  validateIntermediateStage,
} from '@/utils/brStageFlow';
import { buildProStageConfig } from '@/utils/brStageConfigBuilder';
import { recommendBRStageFormat } from '@/utils/brGameContext';
import { generateBrSchedule } from '@/utils/brScheduleGenerator';
import type { BRStageFormat } from '@/types/battleRoyale';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';

type WizardMode = 'initial' | 'add';

export interface BrStageDtoInput {
  id?: string | null;
  name: string;
  format: 'battle_royale';
  stageOrder: number;
  bestOf: 1;
  capacity: number | null;
  advancementCount: number | null;
  startsAt: null;
  endsAt: null;
  config?: Record<string, unknown>;
}

interface BRProStageWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: WizardMode;
  tournamentId: string;
  existingStages: Array<{ id: string; name: string; stage_order: number; capacity: number | null; advancement_count: number | null; format?: string | null; config?: unknown }>;
  registeredUnitCount: number;
  incomingTeams: number;
  fromStageName: string | null;
  maxLobbySize: number | null;
  defaultLobbySize: number;
  unitLabel: string;
  unitsLabel: string;
  onComplete: () => void;
}

const FORMAT_OPTIONS: Array<{
  id: BRStageFormat;
  title: string;
  desc: string;
  requiresPro?: boolean;
}> = [
  {
    id: 'single_lobby',
    title: 'One lobby',
    desc: 'Everyone plays in a single match room. Best for finals and small fields.',
  },
  {
    id: 'group_rotation',
    title: 'Group rotation',
    desc: 'Seed groups rotate through shared lobbies each wave — fairness and integrity standard.',
    requiresPro: true,
  },
  {
    id: 'multi_lobby_cut',
    title: 'Multi-lobby cut',
    desc: 'Parallel lobbies with a per-lobby cut — fast funnel for large opens.',
    requiresPro: true,
  },
];

const BRProStageWizard: React.FC<BRProStageWizardProps> = ({
  open,
  onOpenChange,
  mode,
  tournamentId,
  existingStages,
  registeredUnitCount,
  incomingTeams,
  fromStageName,
  maxLobbySize,
  unitLabel,
  unitsLabel,
  onComplete,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [isFinal, setIsFinal] = useState(false);
  const [stageName, setStageName] = useState('');
  const [stageFormat, setStageFormat] = useState<BRStageFormat>('single_lobby');
  const [groupCount, setGroupCount] = useState(4);
  const [advancementCount, setAdvancementCount] = useState(10);

  const effectiveIncoming = mode === 'add' ? incomingTeams : registeredUnitCount;

  const resetForm = () => {
    setStep(0);
    setIsFinal(mode === 'add' && existingStages.length > 0);
    setStageName('');
    const recommended = recommendBRStageFormat(
      mode === 'add' ? incomingTeams : registeredUnitCount,
      maxLobbySize ?? 100,
    );
    setStageFormat(recommended);
    const groups =
      recommended === 'group_rotation'
        ? Math.max(4, deriveGroupCount(effectiveIncoming, maxLobbySize))
        : deriveGroupCount(effectiveIncoming, maxLobbySize);
    const evenGroups = groups % 2 === 0 ? groups : groups + 1;
    setGroupCount(recommended === 'group_rotation' ? evenGroups : groups);
    const lobby = deriveLobbySize(effectiveIncoming, evenGroups);
    setAdvancementCount(
      recommended === 'group_rotation'
        ? Math.max(1, Math.floor(effectiveIncoming / 2))
        : Math.max(1, Math.floor(lobby / 2)),
    );
  };

  useEffect(() => {
    if (open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const effectiveGroups =
    stageFormat === 'single_lobby' ? 1 : groupCount;
  const lobbySize =
    isFinal && stageFormat === 'single_lobby'
      ? null
      : deriveLobbySize(effectiveIncoming, effectiveGroups);

  const schedulePreview = useMemo(() => {
    if (stageFormat !== 'group_rotation' || effectiveGroups < 2) return null;
    try {
      return generateBrSchedule({ seedGroupCount: effectiveGroups });
    } catch {
      return null;
    }
  }, [stageFormat, effectiveGroups]);

  const validationErrors = useMemo(() => {
    if (isFinal) return [];
    if (stageFormat === 'single_lobby') {
      if (maxLobbySize && effectiveIncoming > maxLobbySize) {
        return [`${effectiveIncoming} ${unitsLabel} exceed one lobby (max ${maxLobbySize}). Choose group rotation or multi-lobby cut.`];
      }
      return [];
    }
    if (stageFormat === 'group_rotation') {
      const errors: string[] = [];
      if (effectiveGroups % 2 !== 0) errors.push('Group rotation requires an even number of seed groups.');
      if (effectiveGroups < 2) errors.push('Need at least 2 seed groups for rotation.');
      const perGroup = deriveLobbySize(effectiveIncoming, effectiveGroups);
      if (maxLobbySize && perGroup * 2 > maxLobbySize) {
        errors.push(`Pairwise lobbies would hold ${perGroup * 2} ${unitsLabel} (max ${maxLobbySize}). Add more groups.`);
      }
      if (!schedulePreview) errors.push('Could not generate rotation schedule for this group count.');
      return errors;
    }
    return validateIntermediateStage({
      incomingTeams: effectiveIncoming,
      groupCount: effectiveGroups,
      advancementPerGroup: advancementCount,
      maxLobbySize,
      unitLabel,
    });
  }, [
    isFinal,
    stageFormat,
    effectiveIncoming,
    effectiveGroups,
    advancementCount,
    maxLobbySize,
    unitLabel,
    unitsLabel,
    schedulePreview,
  ]);

  const visibleFormats = FORMAT_OPTIONS.filter(
    (opt) => !opt.requiresPro || BR_FEATURE_FLAGS.proStructureEnabled,
  );

  const skipAdvancement =
    isFinal || (stageFormat === 'single_lobby' && mode === 'initial' && existingStages.length === 0);

  const stepLabels = useMemo(() => {
    if (mode === 'add') {
      const base = ['Stage role', 'Format', 'Structure'];
      if (!skipAdvancement) base.push('Advancement');
      base.push('Review');
      return base;
    }
    const base = ['Format', 'Structure'];
    if (!skipAdvancement) base.push('Advancement');
    base.push('Review');
    return base;
  }, [mode, skipAdvancement]);

  const maxStep = stepLabels.length - 1;
  const structureStepIndex = mode === 'add' ? 2 : 1;
  const advancementStepIndex = structureStepIndex + 1;
  const reviewStepIndex = skipAdvancement ? structureStepIndex + 1 : advancementStepIndex + 1;

  const attachProConfig = (dto: BrStageDtoInput): BrStageDtoInput => ({
    ...dto,
    config: buildProStageConfig({
      format: stageFormat,
      groupCount: effectiveGroups,
      lobbySize: dto.capacity,
      advancementPerGroup: dto.advancementCount,
      isFinal: skipAdvancement,
    }),
  });

  const buildStageDtos = (): BrStageDtoInput[] => {
    const baseOrder = existingStages.length;
    const defaultName =
      stageName.trim() ||
      (stageFormat === 'single_lobby'
        ? isFinal || skipAdvancement
          ? 'Grand Finals'
          : 'Main Event'
        : stageFormat === 'group_rotation'
          ? 'League Stage'
          : 'Qualifiers');

    const advancementForDto = skipAdvancement
      ? null
      : stageFormat === 'group_rotation'
        ? advancementCount
        : stageFormat === 'multi_lobby_cut'
          ? advancementCount
          : advancementCount;

    return [
      attachProConfig({
        id: null,
        name: defaultName,
        format: 'battle_royale',
        stageOrder: baseOrder + 1,
        bestOf: 1,
        capacity: lobbySize,
        advancementCount: advancementForDto,
        startsAt: null,
        endsAt: null,
      }),
    ];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newDtos = buildStageDtos();
      const existingDtos = existingStages.map((s) => {
        const dto: BrStageDtoInput = {
          id: s.id,
          name: s.name,
          format: 'battle_royale',
          stageOrder: s.stage_order,
          bestOf: 1,
          capacity: s.capacity,
          advancementCount: s.advancement_count,
          startsAt: null,
          endsAt: null,
        };
        if (s.config && typeof s.config === 'object') {
          dto.config = s.config as Record<string, unknown>;
        }
        return dto;
      });

      await apiClient.put(`/api/tournaments/${tournamentId}/stages`, {
        stages: [...existingDtos, ...newDtos],
      });

      const freshStages = await apiClient.get<Array<{ id: string; stage_order: number }>>(
        `/api/tournaments/${tournamentId}/stages`,
      );

      for (const dto of newDtos) {
        const stage = freshStages.find((s) => s.stage_order === dto.stageOrder);
        if (!stage) continue;
        try {
          await apiClient.post(`/api/stages/${stage.id}/br/bootstrap`, {});
        } catch {
          // Bootstrap can be retried from Stages tab
        }
      }

      toast({
        title: 'Stage saved',
        description: `"${newDtos[0].name}" created (${stageFormat.replace(/_/g, ' ')}). Configure schedules in the Schedule tab.`,
      });
      handleOpenChange(false);
      onComplete();
    } catch (error: unknown) {
      toast({
        title: 'Could not save stage',
        description: getApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (step === structureStepIndex && skipAdvancement) {
      setStep(reviewStepIndex);
      return;
    }
    setStep((s) => Math.min(s + 1, maxStep));
  };

  const goBack = () => {
    if (step === reviewStepIndex && skipAdvancement) {
      setStep(structureStepIndex);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const canProceed = validationErrors.length === 0 && effectiveIncoming > 0;

  const renderStep = () => {
    if (mode === 'add' && step === 0) {
      return (
        <div className="space-y-4">
          {fromStageName && (
            <p className="text-sm text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              ~{incomingTeams} {unitsLabel} expected from <strong>{fromStageName}</strong>
            </p>
          )}
          <p className="text-sm text-zinc-400">
            An <strong className="text-white">intermediate</strong> stage cuts the field.
            A <strong className="text-white">final</strong> stage crowns the winner.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFinal(false)}
              className={`flex-1 py-3 px-3 rounded-lg border text-sm font-medium ${
                !isFinal ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-white/10 text-zinc-400'
              }`}
            >
              Intermediate
            </button>
            <button
              type="button"
              onClick={() => setIsFinal(true)}
              className={`flex-1 py-3 px-3 rounded-lg border text-sm font-medium ${
                isFinal ? 'border-amber-500/40 bg-amber-500/15 text-amber-200' : 'border-white/10 text-zinc-400'
              }`}
            >
              Final
            </button>
          </div>
          <div className="space-y-1.5">
            <Label>Stage name</Label>
            <Input
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder={isFinal ? 'Grand Finals' : 'Qualifiers'}
              className="[color-scheme:dark]"
            />
          </div>
        </div>
      );
    }

    const formatStep = mode === 'add' ? 1 : 0;
    if (step === formatStep) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Choose how this stage forms lobbies. Hybrid tournaments use multiple stages — add another stage later for a different format.
          </p>
          <p className="text-xs text-zinc-500">
            {effectiveIncoming} {unitsLabel} entering · max {maxLobbySize ?? '—'} per game lobby
          </p>
          <div className="space-y-2">
            {visibleFormats.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setStageFormat(opt.id);
                  if (opt.id === 'group_rotation' && groupCount % 2 !== 0) {
                    setGroupCount(groupCount + 1);
                  }
                  if (opt.id === 'single_lobby') setGroupCount(1);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  stageFormat === opt.id
                    ? 'border-rose-500/50 bg-rose-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="font-medium text-white text-sm">{opt.title}</div>
                <div className="text-xs text-zinc-500 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === structureStepIndex) {
      return (
        <div className="space-y-4">
          {stageFormat === 'single_lobby' && (
            <p className="text-sm text-zinc-400">
              All <strong className="text-white">{effectiveIncoming}</strong> {unitsLabel} in one lobby
              {maxLobbySize ? ` (max ${maxLobbySize})` : ''}.
            </p>
          )}
          {stageFormat === 'group_rotation' && (
            <>
              <div className="space-y-1.5">
                <Label>Seed groups (even)</Label>
                <Select
                  value={String(groupCount)}
                  onValueChange={(v) => setGroupCount(parseInt(v, 10))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, k) => (k + 2) * 2).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} groups — ~{deriveLobbySize(effectiveIncoming, n)} {unitsLabel}/group
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {schedulePreview && (
                <div className="rounded-lg border border-white/10 p-3 text-xs text-zinc-400 space-y-2">
                  <p className="text-zinc-300 font-medium">
                    {schedulePreview.totalWaves} waves · {schedulePreview.totalLobbies} lobbies
                  </p>
                  {schedulePreview.waves.slice(0, 3).map((wave) => (
                    <div key={wave.wave}>
                      Wave {wave.wave}: {wave.lobbies.map((l) => l.join('+')).join(' · ')}
                    </div>
                  ))}
                  {schedulePreview.waves.length > 3 && (
                    <p className="text-zinc-600">+{schedulePreview.waves.length - 3} more waves</p>
                  )}
                  <p className="text-zinc-600">Commit the schedule in the Schedule tab after seeding.</p>
                </div>
              )}
            </>
          )}
          {stageFormat === 'multi_lobby_cut' && (
            <>
              <div className="space-y-1.5">
                <Label>Parallel lobbies</Label>
                <Select value={String(groupCount)} onValueChange={(v) => setGroupCount(parseInt(v, 10))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(32, Math.max(2, effectiveIncoming)) }, (_, k) => k + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} lobbies — ~{deriveLobbySize(effectiveIncoming, n)} {unitsLabel}/lobby
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {lobbySize != null && (
                <p className="text-xs text-zinc-500">
                  Derived lobby size: <span className="text-white">{lobbySize}</span> {unitsLabel}
                </p>
              )}
            </>
          )}
        </div>
      );
    }

    if (!skipAdvancement && step === advancementStepIndex) {
      const maxAdv =
        stageFormat === 'group_rotation'
          ? Math.max(1, effectiveIncoming - 1)
          : lobbySize && lobbySize > 1
            ? lobbySize - 1
            : 1;
      const advLabel =
        stageFormat === 'group_rotation'
          ? 'Top N overall (stage-global standings)'
          : stageFormat === 'multi_lobby_cut'
            ? 'Top N per lobby'
            : 'Top N per group';

      return (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">{advLabel}</p>
          <Select
            value={String(Math.min(advancementCount, maxAdv))}
            onValueChange={(v) => setAdvancementCount(parseInt(v, 10))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: Math.min(maxAdv, 64) }, (_, k) => k + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {stageFormat === 'multi_lobby_cut' && (
            <p className="text-sm text-amber-400/90">
              → <strong>{advancementCount * effectiveGroups}</strong> {unitsLabel} advance total
            </p>
          )}
        </div>
      );
    }

    const review = buildStageDtos()[0];
    const reviewBr = review.config?.br as { format?: string } | undefined;
    return (
      <div className="space-y-4">
        {validationErrors.map((err) => (
          <p key={err} className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {err}
          </p>
        ))}
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2 text-sm">
          <div className="font-medium text-white">{review.name}</div>
          <div className="text-xs text-zinc-500 space-y-1">
            <div>Format: {(reviewBr?.format ?? stageFormat).replace(/_/g, ' ')}</div>
            {review.capacity != null && <div>Lobby size: {review.capacity} {unitsLabel}</div>}
            {review.advancementCount != null && (
              <div>
                Advance:{' '}
                {stageFormat === 'group_rotation'
                  ? `top ${review.advancementCount} overall`
                  : stageFormat === 'multi_lobby_cut'
                    ? `top ${review.advancementCount} per lobby`
                    : `top ${review.advancementCount} per group`}
              </div>
            )}
            {!skipAdvancement && review.advancementCount == null && <div>No advancement (final)</div>}
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Next: seed participants in Stages → set matchup and lobby times in Schedule → run games in Games.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === 'initial' ? 'Add first stage' : 'Add stage'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Step {step + 1} of {stepLabels.length}: {stepLabels[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-2">
          {stepLabels.map((label, i) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-rose-500' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {renderStep()}

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={goBack} disabled={saving}>
              Back
            </Button>
          )}
          {step < maxStep ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canProceed && step >= structureStepIndex}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !canProceed || validationErrors.length > 0}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {saving ? 'Saving...' : 'Save stage'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BRProStageWizard;
