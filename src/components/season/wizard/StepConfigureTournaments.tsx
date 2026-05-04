import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  countConfiguredStages,
  getPhaseMetaForType,
  isTournamentConfigComplete,
  readTournamentConfig,
  writeTournamentConfig,
} from '@/components/season/builder/seasonBuilderUtils';
import type {
  SeasonBuilderNode,
  SeasonNodeType,
  SeasonStageTournamentConfig,
  SeasonStageTournamentFormat,
  SeasonStageRegistrationType,
} from '@/types/season';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepConfigureTournamentsProps {
  nodes: SeasonBuilderNode[];
  onNodeChange: (nodeId: string, patch: Partial<SeasonBuilderNode>) => void;
}

// ---------------------------------------------------------------------------
// Static option maps
// ---------------------------------------------------------------------------

const FORMAT_OPTIONS: { value: SeasonStageTournamentFormat; label: string }[] = [
  { value: 'single_elimination', label: 'Single Elimination' },
  { value: 'double_elimination', label: 'Double Elimination' },
  { value: 'round_robin', label: 'Round Robin' },
  { value: 'swiss', label: 'Swiss System' },
  { value: 'groups_playoffs', label: 'Groups → Playoffs' },
];

const REGISTRATION_OPTIONS: { value: SeasonStageRegistrationType; label: string }[] = [
  { value: 'open', label: 'Open Registration' },
  { value: 'invite', label: 'Invite-only' },
  { value: 'qualifier_feed', label: 'Qualifier-fed only' },
];

const BEST_OF_OPTIONS = [1, 3, 5, 7] as const;

const NODE_TYPE_SINGULAR: Record<Exclude<SeasonNodeType, 'root'>, string> = {
  qualifier: 'Qualifier',
  event: 'Event',
  stage: 'Stage',
  final: 'Final',
  custom: 'Custom',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface NodeBadgeProps {
  nodeType: Exclude<SeasonNodeType, 'root'>;
  size?: 'sm' | 'xs';
}

const NodeBadge = ({ nodeType, size = 'xs' }: NodeBadgeProps) => {
  const meta = getPhaseMetaForType(nodeType);
  const label = NODE_TYPE_SINGULAR[nodeType];
  return (
    <span
      className={cn(
        'rounded border font-bold uppercase tracking-wider',
        meta.accent,
        meta.accentBg,
        meta.accentBorder,
        size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
      )}
    >
      {label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const StepConfigureTournaments = ({ nodes, onNodeChange }: StepConfigureTournamentsProps) => {
  const nonRootNodes = nodes.filter((n) => n.nodeType !== 'root');
  const { configured, total } = countConfiguredStages(nodes);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copyFromId, setCopyFromId] = useState<string>('');

  // Auto-select first unconfigured node on mount
  useEffect(() => {
    const firstUnconfigured = nonRootNodes.find(
      (n) => !isTournamentConfigComplete(readTournamentConfig(n)),
    );
    setSelectedId(firstUnconfigured?.id ?? nonRootNodes[0]?.id ?? null);
    // Only run on mount — nonRootNodes intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedNode = selectedId
    ? (nonRootNodes.find((n) => n.id === selectedId) ?? null)
    : null;
  const config = selectedNode ? readTournamentConfig(selectedNode) : null;

  // ── Mutation helpers ────────────────────────────────────────────────────

  const handleConfigChange = (patch: Partial<SeasonStageTournamentConfig>) => {
    if (!selectedNode) return;
    const updated = writeTournamentConfig(selectedNode, patch);
    onNodeChange(selectedNode.id, updated);
  };

  const handleDateChange = (
    field: 'registrationDeadline' | 'startsAt' | 'endsAt',
    value: string,
  ) => {
    if (!selectedNode) return;
    onNodeChange(selectedNode.id, { [field]: value || null });
  };

  // ── Efficiency actions ───────────────────────────────────────────────────

  const applyFormatToQualifiers = () => {
    if (!selectedNode || !config?.format) return;
    const fmt = config.format;
    nodes
      .filter((n) => n.nodeType === 'qualifier')
      .forEach((n) => {
        const updated = writeTournamentConfig(n, { format: fmt });
        onNodeChange(n.id, updated);
      });
  };

  const copyConfigFromNode = () => {
    if (!selectedNode || !copyFromId) return;
    const source = nonRootNodes.find((n) => n.id === copyFromId);
    if (!source) return;
    const sourceConfig = readTournamentConfig(source);
    const updated = writeTournamentConfig(selectedNode, sourceConfig);
    onNodeChange(selectedNode.id, {
      ...updated,
      registrationDeadline: source.registrationDeadline,
      startsAt: source.startsAt,
      endsAt: source.endsAt,
    });
    setCopyFromId('');
  };

  // ── Empty state ──────────────────────────────────────────────────────────

  if (nonRootNodes.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="font-body text-[13px] text-zinc-500">
          No tournaments to configure. Add tournaments in the Flow step first.
        </p>
      </div>
    );
  }

  const progressPct = total > 0 ? Math.round((configured / total) * 100) : 0;

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-[520px]">
      {/* ── Left panel: tournament list ────────────────────────────────── */}
      <div className="flex w-[252px] shrink-0 flex-col border-r border-white/[0.05]">
        {/* Progress */}
        <div className="border-b border-white/[0.05] px-5 py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-body text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Progress
            </span>
            <span className="font-body text-[12px] font-semibold text-white">
              {configured} of {total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="font-body mt-1.5 text-[11px] text-zinc-600">
            {configured === total ? 'All configured ✓' : `${total - configured} remaining`}
          </p>
        </div>

        {/* Node list */}
        <div className="flex-1 overflow-y-auto py-1">
          {nonRootNodes.map((node) => {
            const typeKey = node.nodeType as Exclude<SeasonNodeType, 'root'>;
            const ready = isTournamentConfigComplete(readTournamentConfig(node));
            const isSelected = node.id === selectedId;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedId(node.id)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors',
                  isSelected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5">
                      <NodeBadge nodeType={typeKey} size="xs" />
                    </div>
                    <p
                      className={cn(
                        'font-body truncate text-[12px] font-medium leading-tight',
                        isSelected ? 'text-white' : 'text-zinc-300',
                      )}
                    >
                      {node.name || 'Unnamed'}
                    </p>
                    <p
                      className={cn(
                        'font-body mt-1 text-[10px]',
                        ready ? 'text-emerald-500' : 'text-amber-500',
                      )}
                    >
                      {ready ? 'Ready ✓' : 'Setup required'}
                    </p>
                  </div>
                  {ready ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right panel: config form ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-7 py-5">
        {!selectedNode || !config ? (
          <div className="flex h-full items-center justify-center">
            <p className="font-body text-[13px] text-zinc-500">
              Select a tournament from the list.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Node header */}
            <div className="flex items-center gap-2.5">
              <NodeBadge
                nodeType={selectedNode.nodeType as Exclude<SeasonNodeType, 'root'>}
                size="sm"
              />
              <h3 className="font-heading text-[16px] font-bold text-white">
                {selectedNode.name}
              </h3>
              {isTournamentConfigComplete(config) && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
            </div>

            {/* Efficiency actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!config.format}
                onClick={applyFormatToQualifiers}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[12px] font-medium text-zinc-300 transition-all hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-30"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Apply format to all qualifiers
              </button>

              <div className="flex items-center gap-1.5">
                <Select value={copyFromId} onValueChange={setCopyFromId}>
                  <SelectTrigger className="h-9 w-[160px] rounded-xl border-white/10 bg-white/[0.03] text-[12px] text-zinc-300">
                    <SelectValue placeholder="Copy from…" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonRootNodes
                      .filter((n) => n.id !== selectedNode.id)
                      .map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name || 'Unnamed'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  disabled={!copyFromId}
                  onClick={copyConfigFromNode}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-zinc-300 transition-all hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-30"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Apply
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.05]" />

            {/* Form fields */}
            <div className="grid gap-5">
              {/* Format + Registration type */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-zinc-400">
                    Format <span className="text-rose-400">*</span>
                  </Label>
                  <Select
                    value={config.format ?? ''}
                    onValueChange={(v) =>
                      handleConfigChange({ format: v as SeasonStageTournamentFormat })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] text-zinc-400">
                    Registration type <span className="text-rose-400">*</span>
                  </Label>
                  <Select
                    value={config.registrationType ?? ''}
                    onValueChange={(v) =>
                      handleConfigChange({ registrationType: v as SeasonStageRegistrationType })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGISTRATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Team size + Max teams */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-zinc-400">
                    Team size <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={config.teamSize ?? ''}
                    onChange={(e) =>
                      handleConfigChange({
                        teamSize: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="e.g. 5"
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] text-zinc-400">
                    Max teams <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={4}
                    max={256}
                    value={config.maxTeams ?? ''}
                    onChange={(e) =>
                      handleConfigChange({
                        maxTeams: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder="e.g. 16"
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Best-of */}
              <div className="space-y-1.5">
                <Label className="text-[13px] text-zinc-400">Best-of</Label>
                <div className="flex gap-2">
                  {BEST_OF_OPTIONS.map((bo) => (
                    <button
                      key={bo}
                      type="button"
                      onClick={() => handleConfigChange({ bestOf: bo })}
                      className={cn(
                        'h-10 w-14 rounded-xl border text-[13px] font-semibold transition-all',
                        config.bestOf === bo
                          ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                          : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20',
                      )}
                    >
                      BO{bo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entry fee + Prize pool */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-zinc-400">Entry fee (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={config.entryFee ?? ''}
                    onChange={(e) =>
                      handleConfigChange({ entryFee: e.target.value ? Number(e.target.value) : 0 })
                    }
                    placeholder="0"
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] text-zinc-400">Prize pool (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={config.prizePool ?? ''}
                    onChange={(e) =>
                      handleConfigChange({
                        prizePool: e.target.value ? Number(e.target.value) : 0,
                      })
                    }
                    placeholder="0"
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-3">
                <p className="font-body text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Schedule (optional)
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-zinc-400">Reg. deadline</Label>
                    <Input
                      type="date"
                      value={selectedNode.registrationDeadline?.slice(0, 10) ?? ''}
                      onChange={(e) =>
                        handleDateChange('registrationDeadline', e.target.value)
                      }
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-zinc-400">Starts</Label>
                    <Input
                      type="date"
                      value={selectedNode.startsAt?.slice(0, 10) ?? ''}
                      onChange={(e) => handleDateChange('startsAt', e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-zinc-400">Ends</Label>
                    <Input
                      type="date"
                      value={selectedNode.endsAt?.slice(0, 10) ?? ''}
                      onChange={(e) => handleDateChange('endsAt', e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StepConfigureTournaments;
