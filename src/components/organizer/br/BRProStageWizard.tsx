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
  formatBRStageFormatLabel,
  formatBRAdvancementLabel,
  formatBRAdvancementPrompt,
  formatUnitsPerGroup,
  recommendBRStageFormat,
} from '@/utils/brGameContext';
import { formatMatchPairing, formatRotationMatchdayLabel, summarizeGroupRotationSchedule } from '@/utils/brWaveScheduleDisplay';
import { generateBrSchedule } from '@/utils/brScheduleGenerator';
import type { BRStageFormat } from '@/types/battleRoyale';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

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
    desc: 'Split into seed groups (A, B, C…). Each group plays in its own lobby. Top N teams or players per group advance.',
  },
  {
    id: 'group_rotation',
    title: 'Single Round-Robin',
    desc: 'Groups rotate pairings each matchday — two groups per lobby. Stage-global standings.',
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

function selectionOptionClass(selected: boolean, disabled = false): string {
  return cn(
    'rounded-xl border text-left transition-colors',
    disabled && 'cursor-not-allowed opacity-40',
    selected
      ? 'border-rose-500/60 bg-rose-500/10 ring-1 ring-rose-500/30'
      : 'border-white/10 bg-transparent hover:border-white/25 hover:bg-white/[0.03]',
  );
}

function segmentClass(selected: boolean, tone: 'emerald' | 'amber'): string {
  return cn(
    'flex-1 rounded-xl border px-5 py-3.5 text-sm font-medium transition-colors',
    selected
      ? tone === 'emerald'
        ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/30'
        : 'border-amber-500/60 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/30'
      : 'border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300',
  );
}

function WizardField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium text-zinc-200">{label}</Label>
      {children}
      {hint ? <p className="text-sm text-zinc-500 leading-relaxed max-w-prose">{hint}</p> : null}
    </div>
  );
}

function WizardSummaryPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 sm:p-8 space-y-4">
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white leading-snug">{title}</p>
        {subtitle ? <p className="text-sm text-zinc-400 leading-relaxed">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
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

  const rotationSummary = useMemo(() => {
    if (stageFormat !== 'group_rotation') return null;
    return summarizeGroupRotationSchedule(groupCount, gamesPerLobby);
  }, [stageFormat, groupCount, gamesPerLobby]);

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
        return [`${effectiveIncoming} ${unitsLabel} exceed one lobby (max ${maxLobbySize}). Choose Group qualifiers or Single Round-Robin.`];
      }
      return [];
    }
    if (stageFormat === 'group_rotation') {
      const errors: string[] = [];
      if (effectiveGroups % 2 !== 0) errors.push('Single Round-Robin requires an even number of groups.');
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
        description: getApiErrorMessage(error, { context: 'brStageSetup' }),
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
        `Set advancement on ${fromStageName} first (e.g. top 10 ${unitsLabel} per group), then add finals.`,
      );
    } else if ((isFinal ? planningCount : effectiveIncoming) <= 0) {
      messages.push(
        'Set tournament capacity (max teams) in tournament settings, or register participants.',
      );
    }
    messages.push(...validationErrors);
    if (messages.length === 0) return null;
    return (
      <div className="space-y-1">
        {messages.map((err) => (
          <p key={err} className="text-sm text-red-400">
            {err}
          </p>
        ))}
      </div>
    );
  };

  const renderStep = () => {
    if (mode === 'add' && step === 0) {
      return (
        <div className="max-w-2xl space-y-10">
          {fromStageName && (
            <p className="text-sm text-zinc-400">
              ~{incomingTeams} {unitsLabel} expected from <span className="text-white">{fromStageName}</span>
            </p>
          )}
          <p className="text-sm text-zinc-400 leading-relaxed">
            An intermediate stage cuts the field. A final stage crowns the winner.
          </p>
          <WizardField label="Stage role">
            <div className="flex gap-4 max-w-lg">
              <button type="button" onClick={() => setIsFinal(false)} className={segmentClass(!isFinal, 'emerald')}>
                Intermediate
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFinal(true);
                  setStageFormat('single_lobby');
                  setGroupCount(1);
                }}
                className={segmentClass(isFinal, 'amber')}
              >
                Final
              </button>
            </div>
          </WizardField>
          <WizardField label="Stage name">
            <Input
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder={isFinal ? 'Grand Finals' : 'Qualifiers'}
              className="max-w-lg [color-scheme:dark] h-12 text-base"
            />
          </WizardField>
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
        <div className="space-y-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4 text-sm">
            <p className="text-zinc-400 leading-relaxed max-w-3xl text-base">
              Add one stage at a time. Build qualifiers → league → finals across multiple saves.
            </p>
            <p className="text-zinc-500 shrink-0 text-sm">
              Lobby cap: {maxLobbySize ?? '—'} {unitsLabel}
              {existingStages.length > 0 && (
                <> · Stage {existingStages.length + 1} · {effectiveIncoming} entering</>
              )}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleFormats.map((opt) => {
              const blocked = formatBlockReason(opt.id);
              const selected = stageFormat === opt.id;
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
                  className={cn(
                    selectionOptionClass(selected, Boolean(blocked)),
                    'flex h-full min-h-[9.5rem] flex-col justify-between gap-4 p-6',
                  )}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className={cn('font-medium text-base leading-snug', selected ? 'text-white' : 'text-zinc-300')}>
                        {opt.title}
                      </div>
                      {selected && !blocked && (
                        <Check className="w-4 h-4 text-rose-400 shrink-0" aria-hidden />
                      )}
                    </div>
                    <div className="text-sm text-zinc-500 leading-relaxed">{opt.desc}</div>
                    {blocked && <div className="text-xs text-amber-400/90">{blocked}</div>}
                  </div>
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
        lobbyCapacity: maxLobbySize,
        fieldSize: structureIncoming > 0 ? structureIncoming : null,
        isFinal,
        unitsLabel,
      });

      return (
        <div className="space-y-10">
          <div className="grid gap-10 xl:gap-14 xl:grid-cols-2 xl:items-start">
            <div className="space-y-8">
              <WizardSummaryPanel title={structurePreview.title} subtitle={structurePreview.subtitle}>
                {stageFormat === 'single_lobby' && (
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {isFinal ? (
                      <>
                        All qualified <span className="text-white">{structureIncoming}</span> {unitsLabel} share one in-game room for every scored game.
                      </>
                    ) : (
                      <>
                        All <span className="text-white">{structureIncoming}</span> {unitsLabel} play together in one room.
                        {maxLobbySize && structureIncoming > maxLobbySize
                          ? ` Exceeds the ${maxLobbySize}-team lobby cap — use groups instead.`
                          : ''}
                      </>
                    )}
                  </p>
                )}
                {isFinal && mode === 'add' && (
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Teams reach this stage after you complete the prior stage and click Advance on the Stages tab.
                  </p>
                )}
              </WizardSummaryPanel>

              {stageFormat === 'group_rotation' && (
                <WizardField
                  label="Seed groups"
                  hint="Even count required. Each matchday pairs two groups in one lobby."
                >
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
                    <SelectTrigger className="h-12 max-w-lg text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, k) => (k + 2) * 2).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} groups — {formatUnitsPerGroup(deriveLobbySize(effectiveIncoming, n), unitsLabel)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </WizardField>
              )}

              {stageFormat === 'static_groups' && (
                <WizardField
                  label="Seed groups"
                  hint={`Each group gets its own lobby. Top N ${unitsLabel} per group advance.`}
                >
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
                    <SelectTrigger className="h-12 max-w-lg text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: Math.min(32, Math.max(2, effectiveIncoming)) }, (_, k) => k + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} groups — {formatUnitsPerGroup(deriveLobbySize(effectiveIncoming, n), unitsLabel)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </WizardField>
              )}

              <WizardField
                label="Scored games per match"
                hint={
                  stageFormat === 'group_rotation'
                    ? 'Same roster plays this many games in each cross-group match lobby.'
                    : `Games that count toward standings in each lobby (catalog default: ${defaultGameCount}).`
                }
              >
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={gamesPerLobby}
                  onChange={(e) => setGamesPerLobby(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="max-w-[9rem] [color-scheme:dark] h-12 text-base"
                />
              </WizardField>

              {renderValidationBanner()}
            </div>

            {stageFormat === 'group_rotation' && schedulePreview && rotationSummary && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 sm:p-8 space-y-6">
                <div className="space-y-2">
                  <p className="text-base font-medium text-white">Matchday preview</p>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {rotationSummary.notDoubleRoundRobinNote}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {schedulePreview.waves.map((wave) => (
                    <div
                      key={wave.wave}
                      className="rounded-xl border border-white/8 bg-black/20 px-5 py-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {formatRotationMatchdayLabel(wave.wave)}
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                        {wave.lobbies.map((pairing, idx) => (
                          <li key={idx}>{formatMatchPairing(pairing)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-zinc-600">
                  Create matches in Schedule after seeding teams into groups.
                </p>
              </div>
            )}
          </div>

          <p className="text-sm text-zinc-600 border-t border-white/5 pt-6">
            After saving: Stages → seed {unitsLabel} → Schedule → Games
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
      const advScope: 'overall' | 'per_group' =
        stageFormat === 'group_rotation' ? 'overall' : 'per_group';

      return (
        <div className="grid gap-10 xl:gap-14 xl:grid-cols-2 xl:items-start max-w-4xl">
          <WizardSummaryPanel
            title="Who advances?"
            subtitle={formatBRAdvancementPrompt(advScope, unitsLabel)}
          />
          <WizardField
            label={
              advScope === 'overall'
                ? `${unitsLabel.charAt(0).toUpperCase()}${unitsLabel.slice(1)} advancing overall`
                : `${unitsLabel.charAt(0).toUpperCase()}${unitsLabel.slice(1)} per group`}
          >
            <Select
              value={String(Math.min(advancementCount, maxAdv))}
              onValueChange={(v) => setAdvancementCount(parseInt(v, 10))}
            >
              <SelectTrigger className="h-12 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: Math.min(maxAdv, 64) }, (_, k) => k + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {formatBRAdvancementLabel({ count: n, scope: advScope, unitsLabel })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </WizardField>
          {renderValidationBanner()}
        </div>
      );
    }

    const review = buildStageDtos()[0];
    const reviewBr = review.config?.br as { format?: string } | undefined;
    return (
      <div className="space-y-10">
        {renderValidationBanner()}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: 'Name', value: review.name },
            { label: 'Format', value: formatBRStageFormatLabel(reviewBr?.format ?? stageFormat) },
            review.capacity != null
              ? { label: isFinal ? 'Finalists' : 'Lobby size', value: `${review.capacity} ${unitsLabel}` }
              : null,
            { label: 'Scored games per match', value: String(gamesPerLobby) },
            review.advancementCount != null
              ? {
                  label: 'Advancement',
                  value: formatBRAdvancementLabel({
                    count: review.advancementCount,
                    scope: stageFormat === 'group_rotation' ? 'overall' : 'per_group',
                    unitsLabel,
                  }),
                }
              : skipAdvancement
                ? { label: 'Advancement', value: 'None — final stage' }
                : null,
          ]
            .filter((row): row is { label: string; value: string } => row != null)
            .map((row) => (
              <div key={row.label} className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
                <dt className="text-xs text-zinc-500 uppercase tracking-wide">{row.label}</dt>
                <dd className="text-base text-white font-medium mt-2">{row.value}</dd>
              </div>
            ))}
        </div>
        <p className="text-sm text-zinc-500">
          Next: seed participants → create matches → run games.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 !max-w-[min(100vw-3rem,72rem)] w-full min-h-[min(88vh,44rem)] max-h-[min(94vh,56rem)] flex flex-col gap-0 p-0 overflow-hidden sm:rounded-2xl">
        <div className="shrink-0 px-10 sm:px-12 pt-10 pb-7 border-b border-white/5">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-white text-2xl tracking-tight">
              {mode === 'initial' ? 'Add first stage' : 'Add stage'}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-base">
              Step {step + 1} of {stepLabels.length} — {stepLabels[step]}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 flex gap-3">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex-1 min-w-0">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-colors',
                    i <= step ? 'bg-rose-500' : 'bg-white/10',
                  )}
                />
                <p
                  className={cn(
                    'mt-3 text-[11px] uppercase tracking-wider truncate',
                    i === step ? 'text-zinc-300 font-medium' : 'text-zinc-600',
                  )}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-10 sm:px-12 py-10 min-h-[20rem]">
          {renderStep()}
        </div>

        <DialogFooter className="shrink-0 gap-4 px-10 sm:px-12 py-7 border-t border-white/5">
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={goBack} disabled={saving} className="mr-auto">
              Back
            </Button>
          )}
          {step < maxStep ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canProceed && step >= structureStepIndex}
              className="bg-emerald-600 hover:bg-emerald-500 min-w-[8.5rem] h-11"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !canProceed || validationErrors.length > 0}
              className="bg-emerald-600 hover:bg-emerald-500 min-w-[8.5rem] h-11"
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
