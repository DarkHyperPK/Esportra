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

type WizardMode = 'initial' | 'add';

type StructureChoice = 'single' | 'qualifier_finals';

type LobbyLayout = 'single_lobby' | 'split_groups';

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
}

interface BRStageSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: WizardMode;
  tournamentId: string;
  existingStages: Array<{ id: string; name: string; stage_order: number; capacity: number | null; advancement_count: number | null; format?: string | null }>;
  registeredUnitCount: number;
  incomingTeams: number;
  fromStageName: string | null;
  maxLobbySize: number | null;
  defaultLobbySize: number;
  unitLabel: string;
  unitsLabel: string;
  onComplete: () => void;
}

const STEP_LABELS_INITIAL = ['Structure', 'Lobbies', 'Advancement', 'Review'] as const;
const STEP_LABELS_ADD = ['Stage type', 'Lobbies', 'Advancement', 'Review'] as const;

export const BRStageSetupWizard: React.FC<BRStageSetupWizardProps> = ({
  open,
  onOpenChange,
  mode,
  tournamentId,
  existingStages,
  registeredUnitCount,
  incomingTeams,
  fromStageName,
  maxLobbySize,
  defaultLobbySize,
  unitLabel,
  unitsLabel,
  onComplete,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Initial setup
  const [structure, setStructure] = useState<StructureChoice>('single');

  // Add mode / shared
  const [isFinal, setIsFinal] = useState(false);
  const [stageName, setStageName] = useState('');

  // Lobby & advancement
  const [lobbyLayout, setLobbyLayout] = useState<LobbyLayout>('single_lobby');
  const [groupCount, setGroupCount] = useState(1);
  const [advancementPerGroup, setAdvancementPerGroup] = useState(1);

  const resetForm = () => {
    setStep(0);
    setStructure('single');
    setIsFinal(mode === 'add' && existingStages.length > 0);
    setStageName('');
    setLobbyLayout('single_lobby');
    const incoming = mode === 'add' ? incomingTeams : registeredUnitCount;
    const groups = deriveGroupCount(incoming, maxLobbySize);
    setGroupCount(groups);
    const lobby = deriveLobbySize(incoming, groups);
    setAdvancementPerGroup(Math.max(1, Math.floor(lobby / 2)) || 1);
  };

  useEffect(() => {
    if (open) resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const effectiveIncoming = mode === 'add' ? incomingTeams : registeredUnitCount;
  const effectiveGroups = lobbyLayout === 'single_lobby' ? 1 : groupCount;
  const lobbySize = isFinal ? null : deriveLobbySize(effectiveIncoming, effectiveGroups);
  const totalAdvancing = !isFinal && lobbySize ? advancementPerGroup * effectiveGroups : null;

  const validationErrors = useMemo(() => {
    if (mode === 'initial' && structure === 'single') return [];
    if (isFinal || (structure === 'single' && mode === 'initial')) return [];
    if (mode === 'add' && isFinal) return [];
    if (structure === 'qualifier_finals' && mode === 'initial') {
      const qualGroups = deriveGroupCount(registeredUnitCount, maxLobbySize);
      const qualLobby = deriveLobbySize(registeredUnitCount, qualGroups);
      const adv = Math.max(1, Math.floor(qualLobby / 2));
      return validateIntermediateStage({
        incomingTeams: registeredUnitCount,
        groupCount: qualGroups,
        advancementPerGroup: adv,
        maxLobbySize,
        unitLabel,
      });
    }
    return validateIntermediateStage({
      incomingTeams: effectiveIncoming,
      groupCount: effectiveGroups,
      advancementPerGroup: advancementPerGroup,
      maxLobbySize,
      unitLabel,
    });
  }, [
    isFinal,
    structure,
    mode,
    step,
    effectiveIncoming,
    effectiveGroups,
    advancementPerGroup,
    maxLobbySize,
    unitLabel,
    registeredUnitCount,
  ]);

  const stepLabels = mode === 'initial' ? STEP_LABELS_INITIAL : STEP_LABELS_ADD;
  const maxStep = stepLabels.length - 1;

  const buildStageDtos = (): BrStageDtoInput[] => {
    const baseOrder = existingStages.length;

    if (mode === 'initial' && structure === 'qualifier_finals') {
      const qualGroups = deriveGroupCount(registeredUnitCount, maxLobbySize);
      const qualLobby = deriveLobbySize(registeredUnitCount, qualGroups);
      const adv = Math.max(1, Math.floor(qualLobby / 2));
      return [
        {
          id: null,
          name: 'Qualifiers',
          format: 'battle_royale',
          stageOrder: 1,
          bestOf: 1,
          capacity: qualLobby,
          advancementCount: adv,
          startsAt: null,
          endsAt: null,
        },
        {
          id: null,
          name: 'Grand Finals',
          format: 'battle_royale',
          stageOrder: 2,
          bestOf: 1,
          capacity: null,
          advancementCount: null,
          startsAt: null,
          endsAt: null,
        },
      ];
    }

    const isSingleStageEvent = mode === 'initial' && structure === 'single';
    const name =
      stageName.trim() ||
      (isFinal || isSingleStageEvent ? 'Main Event' : existingStages.length === 0 ? 'Main Event' : 'Group Stage');

    return [
      {
        id: null,
        name,
        format: 'battle_royale',
        stageOrder: baseOrder + 1,
        bestOf: 1,
        capacity: isSingleStageEvent
          ? (lobbyLayout === 'split_groups' ? lobbySize : null)
          : isFinal
            ? null
            : lobbySize,
        advancementCount: isFinal || isSingleStageEvent ? null : advancementPerGroup,
        startsAt: null,
        endsAt: null,
      },
    ];
  };

  const postCreateGroups = async (createdStages: BrStageDtoInput[]) => {
    const freshStages = await apiClient.get<Array<{ id: string; stage_order: number; advancement_count: number | null }>>(
      `/api/tournaments/${tournamentId}/stages`,
    );

    for (const dto of createdStages) {
      if (dto.advancementCount != null && dto.capacity == null) continue;
      const needsManualGroups =
        dto.advancementCount != null ||
        (mode === 'initial' && structure === 'single' && lobbyLayout === 'split_groups');
      if (!needsManualGroups && dto.advancementCount == null) continue;
      const stage = freshStages.find((s) => s.stage_order === dto.stageOrder);
      if (!stage) continue;
      const groups =
        mode === 'initial' && structure === 'qualifier_finals' && dto.stageOrder === 1
          ? deriveGroupCount(registeredUnitCount, maxLobbySize)
          : effectiveGroups;
      try {
        await apiClient.post(`/api/stages/${stage.id}/br/groups`, {
          groupCount: groups,
          lobbySize: dto.capacity,
        });
      } catch {
        // Groups can be created manually later
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newDtos = buildStageDtos();
      const existingDtos = existingStages.map((s) => ({
        id: s.id,
        name: s.name,
        format: 'battle_royale' as const,
        stageOrder: s.stage_order,
        bestOf: 1 as const,
        capacity: s.capacity,
        advancementCount: s.advancement_count,
        startsAt: null,
        endsAt: null,
      }));

      await apiClient.put(`/api/tournaments/${tournamentId}/stages`, {
        stages: [...existingDtos, ...newDtos],
      });

      await postCreateGroups(newDtos);

      toast({
        title: 'Stages saved',
        description:
          newDtos.length > 1
            ? `${newDtos.length} stages created with groups.`
            : `"${newDtos[0].name}" is ready.`,
      });
      handleOpenChange(false);
      onComplete();
    } catch (error: unknown) {
      toast({
        title: 'Could not save stages',
        description: getApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (mode === 'initial' && step === 0 && structure === 'qualifier_finals') {
      setStep(maxStep);
      return;
    }
    if (mode === 'initial' && step === 1 && structure === 'single') {
      setStep(maxStep);
      return;
    }
    if (isFinal && step === 0 && mode === 'add') {
      setStep(maxStep);
      return;
    }
    setStep((s) => Math.min(s + 1, maxStep));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const canProceed = validationErrors.length === 0 && registeredUnitCount > 0;

  const renderStep = () => {
    if (step === 0) {
      if (mode === 'initial') {
        return (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              A <strong className="text-white">stage</strong> is a phase of your tournament — for example qualifiers or grand finals.
              You can always add more stages later.
            </p>
            <div className="space-y-2">
              {(
                [
                  {
                    id: 'single' as const,
                    title: 'One stage',
                    desc: `All ${unitsLabel} play together in a single phase. Best for smaller events.`,
                  },
                  {
                    id: 'qualifier_finals' as const,
                    title: 'Qualifiers + Grand Finals',
                    desc: `${unitsLabel} split into groups for qualifiers, then top performers meet in one finals lobby.`,
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStructure(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    structure === opt.id
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

      return (
        <div className="space-y-4">
          {fromStageName && (
            <p className="text-sm text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              ~{incomingTeams} {unitsLabel} expected from <strong>{fromStageName}</strong>
            </p>
          )}
          <p className="text-sm text-zinc-400">
            An <strong className="text-white">intermediate</strong> stage eliminates some {unitsLabel}.
            A <strong className="text-white">final</strong> stage decides the winner — no one advances out.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFinal(false)}
              className={`flex-1 py-3 px-3 rounded-lg border text-sm font-medium ${
                !isFinal
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/10 text-zinc-400'
              }`}
            >
              Intermediate
            </button>
            <button
              type="button"
              onClick={() => setIsFinal(true)}
              className={`flex-1 py-3 px-3 rounded-lg border text-sm font-medium ${
                isFinal
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                  : 'border-white/10 text-zinc-400'
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
              placeholder={isFinal ? 'Grand Finals' : 'Group Stage'}
              className="[color-scheme:dark]"
            />
          </div>
        </div>
      );
    }

    if (step === 1 && !(mode === 'initial' && structure === 'qualifier_finals')) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            A <strong className="text-white">lobby</strong> (group) is a separate match room.
            Splitting into groups lets more {unitsLabel} play at once when you have a large field.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setLobbyLayout('single_lobby');
                setGroupCount(1);
              }}
              className={`w-full text-left p-4 rounded-xl border ${
                lobbyLayout === 'single_lobby'
                  ? 'border-rose-500/50 bg-rose-500/10'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="font-medium text-white text-sm">Single lobby</div>
              <div className="text-xs text-zinc-500 mt-1">
                All {effectiveIncoming} {unitsLabel} in one room
                {maxLobbySize ? ` (max ${maxLobbySize} per lobby for this game)` : ''}.
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setLobbyLayout('split_groups');
                setGroupCount(deriveGroupCount(effectiveIncoming, maxLobbySize));
              }}
              className={`w-full text-left p-4 rounded-xl border ${
                lobbyLayout === 'split_groups'
                  ? 'border-rose-500/50 bg-rose-500/10'
                  : 'border-white/10 bg-white/[0.02]'
              }`}
            >
              <div className="font-medium text-white text-sm">Split into groups</div>
              <div className="text-xs text-zinc-500 mt-1">
                Run parallel lobbies when you have more {unitsLabel} than one room can hold.
              </div>
            </button>
          </div>
          {lobbyLayout === 'split_groups' && (
            <div className="space-y-1.5">
              <Label>Number of groups</Label>
              <Select
                value={String(groupCount)}
                onValueChange={(v) => {
                  const g = parseInt(v);
                  setGroupCount(g);
                  const ls = deriveLobbySize(effectiveIncoming, g);
                  setAdvancementPerGroup(Math.min(advancementPerGroup, Math.max(1, ls - 1)));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: Math.max(1, Math.min(effectiveIncoming, 64)) },
                    (_, k) => k + 1,
                  ).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? 'group' : 'groups'} — ~{deriveLobbySize(effectiveIncoming, n)} {unitsLabel}/group
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {lobbySize != null && lobbySize > 0 && (
            <p className="text-xs text-zinc-500">
              Derived lobby size: <span className="text-white font-medium">{lobbySize}</span> {unitsLabel} per group
            </p>
          )}
        </div>
      );
    }

    if (step === 2 && !isFinal && structure !== 'qualifier_finals' && !(mode === 'initial' && structure === 'single')) {
      const maxAdv = lobbySize && lobbySize > 1 ? lobbySize - 1 : 1;
      return (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            <strong className="text-white">Advancement</strong> is how many {unitsLabel} move on from each group
            based on total points. Scoring is set in the tournament wizard and applies to every stage.
          </p>
          <div className="space-y-1.5">
            <Label>Top N per group</Label>
            <Select
              value={String(Math.min(advancementPerGroup, maxAdv))}
              onValueChange={(v) => setAdvancementPerGroup(parseInt(v))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxAdv }, (_, k) => k + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {totalAdvancing != null && (
            <p className="text-sm text-amber-400/90">
              → <strong>{totalAdvancing}</strong> {unitsLabel} total will advance to the next stage
            </p>
          )}
        </div>
      );
    }

    // Review
    const reviewDtos = buildStageDtos();
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">Review your stage setup before saving.</p>
        {registeredUnitCount === 0 && (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            Set a max {unitsLabel} count in tournament settings first.
          </p>
        )}
        {validationErrors.map((err, i) => (
          <p key={i} className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            {err}
          </p>
        ))}
        <div className="space-y-2">
          {reviewDtos.map((dto, i) => (
            <div key={i} className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <div className="font-medium text-white">{dto.name}</div>
              <div className="text-xs text-zinc-500 mt-2 space-y-1">
                <div>Stage {dto.stageOrder}</div>
                {dto.capacity != null ? (
                  <div>Lobby size: {dto.capacity} {unitsLabel}</div>
                ) : (
                  <div>Single merged finals lobby</div>
                )}
                {dto.advancementCount != null ? (
                  <div>Advance: top {dto.advancementCount} per group</div>
                ) : (
                  <div>No advancement (final stage)</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#0a0a0c] border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">
            {mode === 'initial' ? 'Set up stages' : 'Add stage'}
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
              disabled={!canProceed && step > 0}
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
              {saving ? 'Saving...' : 'Save stages'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BRStageSetupWizard;
