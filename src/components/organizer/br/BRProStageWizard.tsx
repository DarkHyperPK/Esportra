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
import {
  formatBRStageStructureSummary,
  formatUnitsPerGroup,
  recommendBRStageFormat,
} from '@/utils/brGameContext';
import { formatMatchPairing, formatRotationMatchdayLabel, summarizeGroupRotationSchedule } from '@/utils/brWaveScheduleDisplay';
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
  priorStageHasAdvancement?: boolean;
  maxLobbySize: number | null;
  defaultLobbySize: number;
  defaultGameCount?: number;
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
    title: 'Single lobby',
    desc: 'One physical lobby, multiple scored games (Cash Cup). Stage-global leaderboard.',
  },
  {
    id: 'static_groups',
    title: 'Group qualifiers',
    desc: 'Split into seed groups (A, B, C…). Each group plays in its own lobby. Top N per group advance.',
  },
  {
    id: 'group_rotation',
    title: 'Round-robin groups',
    desc: 'Groups rotate pairings each round — two groups per lobby. Stage-global standings.',
    requiresPro: true,
  },
];

function defaultAdvancementForLobby(
  lobbySize: number,
  isRotation: boolean,
  incoming: number,
): number {
  if (isRotation) return Math.max(1, Math.floor(incoming / 2));
  if (lobbySize <= 1) return 1;
  return Math.max(1, Math.min(Math.floor(lobbySize / 2), lobbySize - 1));
}

function resolveGroupsForFormat(
  format: BRStageFormat,
  incoming: number,
  maxLobbySize: number | null,
): number {
  const baseGroups = deriveGroupCount(incoming, maxLobbySize);
  if (format === 'single_lobby') return 1;
  if (format === 'group_rotation') {
    const groups = Math.max(4, baseGroups);
    return groups % 2 === 0 ? groups : groups + 1;
  }
  return Math.max(1, baseGroups);
}

const BRProStageWizard: React.FC<BRProStageWizardProps> = ({
  open,
  onOpenChange,
  mode,
  tournamentId,
  existingStages,
  registeredUnitCount,
  incomingTeams,
  fromStageName,
  priorStageHasAdvancement = false,
  maxLobbySize,
  defaultGameCount = 6,
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
  const [gamesPerLobby, setGamesPerLobby] = useState(defaultGameCount);

  const effectiveIncoming = mode === 'add' ? incomingTeams : registeredUnitCount;

  const structureIncoming = useMemo(() => {
    if (mode === 'add' && isFinal) {
      return incomingTeams > 0 ? incomingTeams : registeredUnitCount;
    }
    return effectiveIncoming;
  }, [mode, isFinal, incomingTeams, registeredUnitCount, effectiveIncoming]);

  const planningCount =
    mode === 'add' ? Math.max(incomingTeams, registeredUnitCount) : registeredUnitCount;

  const resetForm = () => {
    const defaultFinal = mode === 'add' && existingStages.length > 0;
    setStep(0);
    setIsFinal(defaultFinal);
    setStageName('');
    setGamesPerLobby(defaultGameCount);

    if (defaultFinal) {
      setStageFormat('single_lobby');
      setGroupCount(1);
      setAdvancementCount(1);
      return;
    }

    const countForRecommend =
      mode === 'add' ? incomingTeams : registeredUnitCount;
    const recommended = recommendBRStageFormat(
      countForRecommend,
      maxLobbySize ?? 100,
    );
    setStageFormat(recommended);
    const resolvedGroups = resolveGroupsForFormat(
      recommended,
      countForRecommend,
      maxLobbySize,
    );
    setGroupCount(resolvedGroups);
    const lobby = deriveLobbySize(countForRecommend, resolvedGroups);
    setAdvancementCount(
      defaultAdvancementForLobby(
        lobby,
        recommended === 'group_rotation',
        countForRecommend,
      ),
    );
  };

  const applyFormatDefaults = (format: BRStageFormat) => {
    const resolvedGroups = resolveGroupsForFormat(
      format,
      effectiveIncoming,
      maxLobbySize,
    );
    setGroupCount(resolvedGroups);
    const lobby = deriveLobbySize(effectiveIncoming, resolvedGroups);
    setAdvancementCount(
      defaultAdvancementForLobby(
        lobby,
        format === 'group_rotation',
        effectiveIncoming,
      ),
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
      ? structureIncoming > 0 ? structureIncoming : null
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
    if (isFinal) {
      if (stageFormat === 'single_lobby' && maxLobbySize && structureIncoming > maxLobbySize) {
        return [
          `${structureIncoming} ${unitsLabel} exceed one lobby (max ${maxLobbySize}). Use Group qualifiers to split the field.`,
        ];
      }
      return [];
    }
    if (stageFormat === 'single_lobby') {
      if (maxLobbySize && effectiveIncoming > maxLobbySize) {
        return [`${effectiveIncoming} ${unitsLabel} exceed one lobby (max ${maxLobbySize}). Choose Group qualifiers or Round-robin groups.`];
      }
      return [];
    }
    if (stageFormat === 'group_rotation') {
      const errors: string[] = [];
      if (effectiveGroups % 2 !== 0) errors.push('Round-robin requires an even number of groups.');
      if (effectiveGroups < 2) errors.push('Need at least 2 groups for round-robin scheduling.');
      const perGroup = deriveLobbySize(effectiveIncoming, effectiveGroups);
      if (maxLobbySize && perGroup * 2 > maxLobbySize) {
        errors.push(`Pairwise lobbies would hold ${perGroup * 2} ${unitsLabel} (max ${maxLobbySize}). Add more groups.`);
      }
      if (!schedulePreview) errors.push('Could not generate round schedule for this group count.');
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
    structureIncoming,
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
      gameCount: gamesPerLobby,
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

    const advancementForDto = skipAdvancement ? null : advancementCount;

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

      toast({
        title: 'Stage saved',
        description: `"${newDtos[0].name}" created. Open Manage lobbies to initialize groups, seed participants, and create matches.`,
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

  const canProceed =
    validationErrors.length === 0 &&
    (isFinal ? planningCount > 0 : effectiveIncoming > 0);

  const renderValidationBanner = () => {
    const messages: string[] = [];
    if (
      mode === 'add' &&
      isFinal &&
      incomingTeams <= 0 &&
      !priorStageHasAdvancement &&
      fromStageName
    ) {
      messages.push(
        `Set advancement on ${fromStageName} first (e.g. top 10 per group), then add finals.`,
      );
    } else if ((isFinal ? planningCount : effectiveIncoming) <= 0) {
      messages.push(
        'Set tournament capacity (max teams) in tournament settings, or register participants.',
      );
    }
    messages.push(...validationErrors);
    if (messages.length === 0) return null;
    return (
      <div className="space-y-2">
        {messages.map((err) => (
          <p
            key={err}
            className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3"
          >
            {err}
          </p>
        ))}
      </div>
    );
  };

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
              onClick={() => {
                setIsFinal(true);
                setStageFormat('single_lobby');
                setGroupCount(1);
              }}
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
    const singleLobbyBlocked =
      maxLobbySize != null && effectiveIncoming > maxLobbySize;

    const formatBlockReason = (id: BRStageFormat): string | null => {
      if (id === 'single_lobby' && singleLobbyBlocked) {
        return `Need ≤ ${maxLobbySize} ${unitsLabel} for one lobby (you have ${effectiveIncoming}).`;
      }
      return null;
    };

    if (step === formatStep) {
      return (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-zinc-400 space-y-1">
            <p>
              <strong className="text-zinc-200">One stage per save.</strong>{' '}
              Multi-stage events (e.g. qualifiers → league → finals) are built by adding stages one at a time — not in a single wizard pass.
            </p>
            {existingStages.length > 0 && (
              <p>Stage {existingStages.length + 1} · {effectiveIncoming} {unitsLabel} entering this stage.</p>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            Max {maxLobbySize ?? '—'} {unitsLabel} per lobby (from game catalog).
          </p>
          <div className="space-y-2">
            {visibleFormats.map((opt) => {
              const blocked = formatBlockReason(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={Boolean(blocked)}
                  onClick={() => {
                    if (blocked) return;
                    setStageFormat(opt.id);
                    applyFormatDefaults(opt.id);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    blocked
                      ? 'border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed'
                      : stageFormat === opt.id
                        ? 'border-rose-500/50 bg-rose-500/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="font-medium text-white text-sm">{opt.title}</div>
                  <div className="text-xs text-zinc-500 mt-1">{opt.desc}</div>
                  {blocked && <div className="text-xs text-amber-400/90 mt-2">{blocked}</div>}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === structureStepIndex) {
      const structurePreview = formatBRStageStructureSummary({
        format: stageFormat,
        seedGroups: stageFormat === 'single_lobby' ? 1 : effectiveGroups,
        gamesPerLobby,
        lobbyCapacity: lobbySize,
        unitsLabel,
      });

      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-sm">
            <p className="font-medium text-white">{structurePreview.title}</p>
            <p className="text-xs text-zinc-400 mt-1">{structurePreview.subtitle}</p>
          </div>

          {stageFormat === 'single_lobby' && (
            <p className="text-sm text-zinc-400">
              All <strong className="text-white">{structureIncoming}</strong> {unitsLabel} play together in one room.
              {maxLobbySize ? ` The lobby fits up to ${maxLobbySize} ${unitsLabel}.` : ''}
            </p>
          )}
          {stageFormat === 'group_rotation' && (
            <>
              <p className="text-xs text-zinc-500 leading-relaxed">
                <strong className="text-zinc-300">Single round-robin</strong> across seed groups (A, B, C…).
                Each <strong className="text-zinc-300">matchday</strong> runs parallel{' '}
                <strong className="text-zinc-300">cross-group matches</strong> (e.g. Group A + Group B in one lobby).
                Each match has multiple <strong className="text-zinc-300">scored games</strong> with the same combined roster.
                This is not double round-robin.
              </p>
              <div className="space-y-1.5">
                <Label>Seed groups (even)</Label>
                <Select
                  value={String(groupCount)}
                  onValueChange={(v) => {
                    const next = parseInt(v, 10);
                    setGroupCount(next);
                    const nextLobby = deriveLobbySize(effectiveIncoming, next);
                    setAdvancementCount(
                      defaultAdvancementForLobby(nextLobby, true, effectiveIncoming),
                    );
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, k) => (k + 2) * 2).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} groups — {formatUnitsPerGroup(deriveLobbySize(effectiveIncoming, n), unitsLabel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {schedulePreview && (
                <div className="rounded-lg border border-white/10 p-3 text-xs text-zinc-400 space-y-2">
                  <p className="text-zinc-300 font-medium">
                    {summarizeGroupRotationSchedule(groupCount, gamesPerLobby).title}
                  </p>
                  <p>{summarizeGroupRotationSchedule(groupCount, gamesPerLobby).subtitle}</p>
                  {schedulePreview.waves.slice(0, 3).map((wave) => (
                    <div key={wave.wave}>
                      {formatRotationMatchdayLabel(wave.wave)}: {wave.lobbies.map((l) => formatMatchPairing(l)).join(' · ')}
                    </div>
                  ))}
                  {schedulePreview.waves.length > 3 && (
                    <p className="text-zinc-600">+{schedulePreview.waves.length - 3} more matchdays</p>
                  )}
                  <p className="text-zinc-600">Create matches in the Schedule tab after seeding.</p>
                </div>
              )}
            </>
          )}
          {stageFormat === 'static_groups' && (
            <>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Split the field into seed groups. Each group plays in its own lobby for all scored
                matches. Top N per group advance using per-group standings.
              </p>
              <div className="space-y-1.5">
                <Label>Seed groups</Label>
                <Select
                  value={String(groupCount)}
                  onValueChange={(v) => {
                    const next = parseInt(v, 10);
                    setGroupCount(next);
                    const nextLobby = deriveLobbySize(effectiveIncoming, next);
                    setAdvancementCount(
                      defaultAdvancementForLobby(nextLobby, false, effectiveIncoming),
                    );
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(32, Math.max(2, effectiveIncoming)) }, (_, k) => k + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} groups — {formatUnitsPerGroup(deriveLobbySize(effectiveIncoming, n), unitsLabel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>Scored games per match</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={gamesPerLobby}
              onChange={(e) => setGamesPerLobby(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="[color-scheme:dark]"
            />
            <p className="text-xs text-zinc-500">
              {stageFormat === 'group_rotation'
                ? 'How many scored games teams play in each cross-group match lobby (same roster each game).'
                : `How many games count toward standings in each lobby for this stage (catalog default: ${defaultGameCount}).`}
            </p>
          </div>

          {renderValidationBanner()}

          <p className="text-xs text-zinc-600 border-t border-white/5 pt-3">
            After saving: <span className="text-zinc-400">Stages → seed {unitsLabel}</span> →{' '}
            <span className="text-zinc-400">Schedule → set match times</span> →{' '}
            <span className="text-zinc-400">Games → start matches</span>
          </p>
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
          {renderValidationBanner()}
        </div>
      );
    }

    const review = buildStageDtos()[0];
    const reviewBr = review.config?.br as { format?: string } | undefined;
    return (
      <div className="space-y-4">
        {renderValidationBanner()}
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-2 text-sm">
          <div className="font-medium text-white">{review.name}</div>
          <div className="text-xs text-zinc-500 space-y-1">
            <div>Format: {(reviewBr?.format ?? stageFormat).replace(/_/g, ' ')}</div>
            {review.capacity != null && <div>Lobby size: {review.capacity} {unitsLabel}</div>}
            <div>Matches per lobby: {gamesPerLobby}</div>
            {review.advancementCount != null && (
              <div>
                Advance:{' '}
                {stageFormat === 'group_rotation'
                  ? `top ${review.advancementCount} overall`
                  : `top ${review.advancementCount} per group`}
              </div>
            )}
            {!skipAdvancement && review.advancementCount == null && <div>No advancement (final)</div>}
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Next: seed participants in Stages → create matches and set times in Schedule → run games in Games.
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
