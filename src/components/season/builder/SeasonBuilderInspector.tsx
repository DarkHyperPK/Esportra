import { useEffect, useMemo, useRef } from 'react';
import { ArrowRightCircle, CalendarRange, Flag, Layers3, MapPin, Settings2, Trash2, Trophy, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type {
  AdvancementConnection,
  AdvancementRuleType,
  AdvancementSeedMode,
  OrganizerTournamentOption,
  SeasonBuilderNode,
  SeasonNodeStatus,
  SeasonNodeType,
  SeasonStageTournamentConfig,
  SeasonStageTournamentFormat,
  SeasonStageRegistrationType,
} from '@/types/season';
import {
  isTournamentConfigComplete,
  readOutgoingConnections,
  readTournamentConfig,
  writeOutgoingConnections,
  writeTournamentConfig,
} from './seasonBuilderUtils';

interface SeasonBuilderInspectorProps {
  node?: SeasonBuilderNode;
  allNodes: SeasonBuilderNode[];
  /** Kept for backward compatibility with existing callers; no longer rendered. */
  tournamentOptions?: OrganizerTournamentOption[];
  onChange: (nodeId: string, patch: Partial<SeasonBuilderNode>) => void;
  onRemove: (nodeId: string) => void;
}

const NODE_STATUSES: SeasonNodeStatus[] = ['draft', 'scheduled', 'live', 'completed', 'archived'];

const typeLabels: Record<SeasonNodeType, { title: string; description: string; icon: typeof Layers3 }> = {
  root: { title: 'Season Root', description: 'Top-level season container', icon: Layers3 },
  qualifier: { title: 'Qualifier', description: 'Open-entry tournament teams join first', icon: Flag },
  event: { title: 'Event', description: 'Regional or circuit tournament', icon: Workflow },
  stage: { title: 'Stage', description: 'Phase within a larger event', icon: Workflow },
  final: { title: 'Final', description: 'Terminal championship tournament', icon: Trophy },
  custom: { title: 'Custom', description: 'Custom-role tournament', icon: Workflow },
};

const FORMAT_OPTIONS: { value: SeasonStageTournamentFormat; label: string }[] = [
  { value: 'single_elimination', label: 'Single elimination' },
  { value: 'double_elimination', label: 'Double elimination' },
  { value: 'round_robin', label: 'Round robin' },
  { value: 'swiss', label: 'Swiss' },
  { value: 'groups_playoffs', label: 'Groups → Playoffs' },
];

const REGISTRATION_OPTIONS: { value: SeasonStageRegistrationType; label: string; hint: string }[] = [
  { value: 'open', label: 'Open registration', hint: 'Any eligible team can sign up' },
  { value: 'invite', label: 'Invite-only', hint: 'Only teams you invite can join' },
  { value: 'qualifier_feed', label: 'Qualifier-fed only', hint: 'Teams enter by advancing from another stage' },
];

const RULE_TYPE_OPTIONS: { value: AdvancementRuleType; label: string; hint: string }[] = [
  { value: 'top_n', label: 'Top N teams', hint: 'Top finishers by placement advance' },
  { value: 'top_percentage', label: 'Top percentage', hint: 'e.g. top 25% of finishers' },
  { value: 'points_threshold', label: 'Points threshold', hint: 'Teams at or above a points total' },
  { value: 'manual_selection', label: 'Manual selection', hint: 'You pick advancing teams after the tournament ends' },
];

const SEED_MODE_OPTIONS: { value: AdvancementSeedMode; label: string }[] = [
  { value: 'preserve_seed', label: 'Preserve finishing order' },
  { value: 'reseed_by_points', label: 'Reseed by season points' },
  { value: 'randomize', label: 'Randomise' },
  { value: 'manual', label: 'Manual seeding' },
];

const createConnectionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `conn-${Math.random().toString(36).slice(2, 11)}`;
};

const SeasonBuilderInspector = ({ node, allNodes, onChange, onRemove }: SeasonBuilderInspectorProps) => {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (node && !node.name) nameRef.current?.focus();
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const tournamentConfig = useMemo(() => node ? readTournamentConfig(node) : null, [node]);
  const outgoing = useMemo(() => node ? readOutgoingConnections(node) : [], [node]);

  if (!node || !tournamentConfig) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-[28px] border border-white/[0.06] bg-[#0a0a0c]/80 p-6 text-center backdrop-blur-2xl">
        <div>
          <p className="font-body text-[13px] font-semibold text-zinc-400">No stage selected</p>
          <p className="font-body mt-1 text-[12px] text-zinc-600">Click a stage in the flow view to configure it.</p>
        </div>
      </div>
    );
  }

  const info = typeLabels[node.nodeType];
  const Icon = info.icon;
  const isRoot = node.nodeType === 'root';
  const connectableStages = allNodes.filter((n) => n.id !== node.id && n.nodeType !== 'root');
  const isConfigured = isTournamentConfigComplete(tournamentConfig);

  const patchTournament = (patch: Partial<SeasonStageTournamentConfig>) => {
    const updated = writeTournamentConfig(node, patch);
    onChange(node.id, updated);
  };

  const patchConnections = (connections: AdvancementConnection[]) => {
    const updated = writeOutgoingConnections(node, connections);
    onChange(node.id, updated);
  };

  const addConnection = () => {
    const firstTarget = connectableStages.find((n) => n.id !== node.id);
    if (!firstTarget) return;
    const next: AdvancementConnection = {
      id: createConnectionId(),
      fromNodeId: node.id,
      toNodeId: firstTarget.id,
      ruleType: 'top_n',
      ruleValue: 4,
      seedMode: 'preserve_seed',
      label: null,
    };
    patchConnections([...outgoing, next]);
  };

  const updateConnection = (id: string, patch: Partial<AdvancementConnection>) => {
    patchConnections(outgoing.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeConnection = (id: string) => {
    patchConnections(outgoing.filter((c) => c.id !== id));
  };

  return (
    <div data-tour-id="inspector" className="rounded-[28px] border border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-2xl">
      {/* Header */}
      <div className="border-b border-white/[0.04] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-zinc-400">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-heading text-[16px] font-semibold text-white">{node.name || info.title}</p>
              <p className="font-body mt-0.5 text-[12px] text-zinc-600">{info.description}</p>
            </div>
          </div>
          {!isRoot && (
            <Button type="button" variant="outline" size="sm" className="border-white/[0.06] text-zinc-500 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300" onClick={() => onRemove(node.id)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[640px]">
        <div className="space-y-5 p-5">
          {/* Name */}
          <div data-tour-id="inspector-name" className="space-y-1.5">
            <Label className="text-[11px] text-zinc-500">Tournament name</Label>
            <Input ref={nameRef} value={node.name} onChange={(e) => onChange(node.id, { name: e.target.value })} placeholder="e.g. North America Qualifier" className="border-white/[0.06] bg-white/[0.02] text-white" />
            <p className="text-[10px] leading-relaxed text-zinc-600">This is the real tournament name players will see.</p>
          </div>

          {/* Status */}
          <div data-tour-id="inspector-status" className="space-y-1.5">
            <Label className="text-[11px] text-zinc-500">Status</Label>
            <Select value={node.status} onValueChange={(v: SeasonNodeStatus) => onChange(node.id, { status: v })}>
              <SelectTrigger className="border-white/[0.06] bg-white/[0.02] text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{NODE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {!isRoot && (
            <>
              <Separator className="bg-white/[0.04]" />

              {/* Tournament configuration */}
              <div data-tour-id="inspector-tournament" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Tournament setup</p>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] ${isConfigured ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/25 bg-amber-500/10 text-amber-300'}`}>
                    <Settings2 className="h-3 w-3" />
                    {isConfigured ? 'Configured' : 'Needs details'}
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
                  <p className="text-[11px] leading-relaxed text-zinc-600">
                    This stage <strong className="text-zinc-400">is</strong> a real tournament. Configure the format, team size, and registration here. When you publish the season, these details are used to create the tournament.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500">Format</Label>
                    <Select value={tournamentConfig.format ?? ''} onValueChange={(v) => patchTournament({ format: v as SeasonStageTournamentFormat })}>
                      <SelectTrigger className="border-white/[0.06] bg-white/[0.02] text-white text-[12px]"><SelectValue placeholder="Choose format" /></SelectTrigger>
                      <SelectContent>
                        {FORMAT_OPTIONS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500">Registration</Label>
                    <Select value={tournamentConfig.registrationType ?? ''} onValueChange={(v) => patchTournament({ registrationType: v as SeasonStageRegistrationType })}>
                      <SelectTrigger className="border-white/[0.06] bg-white/[0.02] text-white text-[12px]"><SelectValue placeholder="How teams enter" /></SelectTrigger>
                      <SelectContent>
                        {REGISTRATION_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <span className="font-medium">{r.label}</span>
                            <span className="ml-2 text-[10px] text-zinc-500">{r.hint}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500">Team size</Label>
                    <Input type="number" min={1} max={20} value={tournamentConfig.teamSize ?? ''} onChange={(e) => patchTournament({ teamSize: e.target.value ? Number(e.target.value) : null })} placeholder="5" className="border-white/[0.06] bg-white/[0.02] text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500">Max teams</Label>
                    <Input type="number" min={2} max={1024} value={tournamentConfig.maxTeams ?? ''} onChange={(e) => patchTournament({ maxTeams: e.target.value ? Number(e.target.value) : null })} placeholder="64" className="border-white/[0.06] bg-white/[0.02] text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500">Best of</Label>
                    <Input type="number" min={1} max={9} value={tournamentConfig.bestOf ?? ''} onChange={(e) => patchTournament({ bestOf: e.target.value ? Number(e.target.value) : null })} placeholder="1" className="border-white/[0.06] bg-white/[0.02] text-white" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500">Entry fee</Label>
                    <Input type="number" min={0} step={0.01} value={tournamentConfig.entryFee ?? 0} onChange={(e) => patchTournament({ entryFee: Number(e.target.value) })} className="border-white/[0.06] bg-white/[0.02] text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-zinc-500">Prize pool</Label>
                    <Input type="number" min={0} step={0.01} value={tournamentConfig.prizePool ?? 0} onChange={(e) => patchTournament({ prizePool: Number(e.target.value) })} className="border-white/[0.06] bg-white/[0.02] text-white" />
                  </div>
                </div>
              </div>

              <Separator className="bg-white/[0.04]" />

              {/* Advancement */}
              <div data-tour-id="inspector-advancement" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Advancement out</p>
                  {node.nodeType !== 'final' && (
                    <Button type="button" variant="outline" size="sm" className="h-7 border-white/10 bg-white/[0.02] text-[11px] text-zinc-400 hover:bg-white/[0.06] hover:text-white" onClick={addConnection} disabled={connectableStages.length === 0}>
                      <ArrowRightCircle className="mr-1.5 h-3 w-3" />
                      Add target
                    </Button>
                  )}
                </div>

                {node.nodeType === 'final' ? (
                  <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-3">
                    <p className="text-[11px] leading-relaxed text-rose-200/80">
                      Finals are terminal tournaments. No further advancement is configured; a season winner is crowned here.
                    </p>
                  </div>
                ) : outgoing.length === 0 ? (
                  <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-3">
                    <p className="text-[11px] leading-relaxed text-amber-200/80">
                      No advancement target set. Teams finishing here will not progress. Add a target or keep this stage terminal.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {outgoing.map((conn) => {
                      const targetName = allNodes.find((n) => n.id === conn.toNodeId)?.name || 'Removed stage';
                      return (
                        <div key={conn.id} className="space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-zinc-300">Advances to {targetName}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-500 hover:bg-red-500/10 hover:text-red-300" onClick={() => removeConnection(conn.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Select value={conn.toNodeId} onValueChange={(v) => updateConnection(conn.id, { toNodeId: v })}>
                              <SelectTrigger className="h-8 border-white/[0.06] bg-white/[0.02] text-[11px] text-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {connectableStages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name || s.nodeType}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={conn.ruleType} onValueChange={(v) => updateConnection(conn.id, { ruleType: v as AdvancementRuleType })}>
                              <SelectTrigger className="h-8 border-white/[0.06] bg-white/[0.02] text-[11px] text-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {RULE_TYPE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input type="number" min={1} value={conn.ruleValue} onChange={(e) => updateConnection(conn.id, { ruleValue: Number(e.target.value) || 0 })} placeholder={conn.ruleType === 'top_percentage' ? '25' : '4'} className="h-8 border-white/[0.06] bg-white/[0.02] text-[11px] text-white" />
                            <Select value={conn.seedMode} onValueChange={(v) => updateConnection(conn.id, { seedMode: v as AdvancementSeedMode })}>
                              <SelectTrigger className="h-8 border-white/[0.06] bg-white/[0.02] text-[11px] text-white"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {SEED_MODE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-[10px] leading-relaxed text-zinc-600">
                            {conn.ruleType === 'top_n' && `Top ${conn.ruleValue} team${conn.ruleValue === 1 ? '' : 's'} advance to ${targetName}.`}
                            {conn.ruleType === 'top_percentage' && `Top ${conn.ruleValue}% of teams advance to ${targetName}.`}
                            {conn.ruleType === 'points_threshold' && `Teams with ≥ ${conn.ruleValue} points advance to ${targetName}.`}
                            {conn.ruleType === 'manual_selection' && `You will pick up to ${conn.ruleValue} advancing teams after this tournament ends.`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator className="bg-white/[0.04]" />

          {/* Location */}
          <div data-tour-id="inspector-location" className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500"><MapPin className="h-3 w-3" />Region</Label>
              <Input value={node.region ?? ''} onChange={(e) => onChange(node.id, { region: e.target.value })} className="border-white/[0.06] bg-white/[0.02] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-500">City</Label>
              <Input value={node.city ?? ''} onChange={(e) => onChange(node.id, { city: e.target.value })} className="border-white/[0.06] bg-white/[0.02] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-500">Country</Label>
              <Input value={node.country ?? ''} onChange={(e) => onChange(node.id, { country: e.target.value })} className="border-white/[0.06] bg-white/[0.02] text-white" />
            </div>
          </div>

          {/* Schedule */}
          <div data-tour-id="inspector-schedule" className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500"><CalendarRange className="h-3 w-3" />Registration</Label>
              <Input type="date" value={node.registrationDeadline ?? ''} onChange={(e) => onChange(node.id, { registrationDeadline: e.target.value })} className="border-white/[0.06] bg-white/[0.02] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-500">Starts</Label>
              <Input type="date" value={node.startsAt ?? ''} onChange={(e) => onChange(node.id, { startsAt: e.target.value })} className="border-white/[0.06] bg-white/[0.02] text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-zinc-500">Ends</Label>
              <Input type="date" value={node.endsAt ?? ''} onChange={(e) => onChange(node.id, { endsAt: e.target.value })} className="border-white/[0.06] bg-white/[0.02] text-white" />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SeasonBuilderInspector;
