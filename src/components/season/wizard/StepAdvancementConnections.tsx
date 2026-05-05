import { useMemo, useState } from 'react';
import { ArrowRight, Info, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SeasonBuilderNode, AdvancementConnection } from '@/types/season';
import { getAllowedTargetTypes, readOutgoingConnections, writeOutgoingConnections } from '@/components/season/builder/seasonBuilderUtils';

interface Props {
  nodes: SeasonBuilderNode[];
  onNodeChange: (nodeId: string, patch: Partial<SeasonBuilderNode>) => void;
}

const RULE_TYPES: { value: AdvancementConnection['ruleType']; label: string }[] = [
  { value: 'top_n', label: 'Top N' },
  { value: 'top_percentage', label: 'Top %' },
  { value: 'points_threshold', label: 'Points threshold' },
  { value: 'manual_selection', label: 'Manual' },
];

const SEED_MODES: { value: AdvancementConnection['seedMode']; label: string }[] = [
  { value: 'preserve_seed', label: 'Preserve seed' },
  { value: 'reseed_by_points', label: 'Reseed by points' },
  { value: 'randomize', label: 'Randomize' },
  { value: 'manual', label: 'Manual' },
];

export default function StepAdvancementConnections({ nodes, onNodeChange }: Props) {
  const nonRoot = useMemo(() => nodes.filter((n) => n.nodeType !== 'root').sort((a, b) => a.displayOrder - b.displayOrder), [nodes]);
  const nodeMap = useMemo(() => new Map(nonRoot.map((n) => [n.id, n])), [nonRoot]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getConns = (id: string) => {
    const node = nodeMap.get(id) ?? nodes.find((n) => n.id === id);
    return node ? readOutgoingConnections(node) : [];
  };

  const setConns = (id: string, conns: AdvancementConnection[]) => {
    const node = nodeMap.get(id) ?? nodes.find((n) => n.id === id);
    if (!node) return;
    onNodeChange(id, writeOutgoingConnections(node, conns));
  };

  const add = (fromId: string) => {
    const conns = getConns(fromId);
    setConns(fromId, [
      ...conns,
      { id: crypto.randomUUID(), fromNodeId: fromId, toNodeId: '', ruleType: 'top_n', ruleValue: 1, seedMode: 'preserve_seed', label: null },
    ]);
  };

  const update = (fromId: string, cid: string, patch: Partial<Omit<AdvancementConnection, 'id'>>) => {
    const conns = getConns(fromId).map((c) => (c.id === cid ? { ...c, ...patch } : c));
    setConns(fromId, conns);
    const c = conns.find((x) => x.id === cid);
    const fromNode = nodeMap.get(fromId) ?? nodes.find((n) => n.id === fromId);
    const toNode = c?.toNodeId ? (nodeMap.get(c.toNodeId) ?? nodes.find((n) => n.id === c.toNodeId)) : undefined;
    const key = `${fromId}-${cid}`;
    const err: string[] = [];
    if (!c?.toNodeId) err.push('Select a destination.');
    if (c?.toNodeId === fromId) err.push('Cannot advance into itself.');
    if (fromNode && toNode && !getAllowedTargetTypes(fromNode.nodeType).includes(toNode.nodeType as ReturnType<typeof getAllowedTargetTypes>[number])) {
      err.push(`A ${fromNode.nodeType} cannot advance into a ${toNode.nodeType}.`);
    }
    if ((c?.ruleValue ?? 0) <= 0) err.push('Value must be > 0.');
    setErrors((p) => ({ ...p, [key]: err.join(' ') }));
  };

  const remove = (fromId: string, cid: string) => {
    setConns(fromId, getConns(fromId).filter((c) => c.id !== cid));
    setErrors((p) => { const n = { ...p }; delete n[`${fromId}-${cid}`]; return n; });
  };

  const total = nonRoot.reduce((a, n) => a + getConns(n.id).length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-zinc-500">Advancement Connections</p>
          <p className="font-body mt-1 text-[13px] text-zinc-400">Wire how teams or players advance from one tournament to the next.</p>
        </div>
        {total > 0 && <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-400">{total} wired</span>}
      </div>

      {nonRoot.length === 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-8 text-center text-zinc-500">
          Add tournaments in Step 2 to create advancement connections.
        </div>
      )}

      {nonRoot.map((node) => {
        const conns = getConns(node.id);
        const allowedTargetTypes = getAllowedTargetTypes(node.nodeType);
        const isTerminal = node.nodeType === 'final';
        const allowedTargets = nonRoot.filter(
          (t) => t.id !== node.id && allowedTargetTypes.includes(t.nodeType as typeof allowedTargetTypes[number]),
        );
        return (
          <div key={node.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">{node.nodeType}</span>
                <span className="font-body text-[13px] font-semibold text-white">{node.name || 'Unnamed'}</span>
              </div>
              {isTerminal ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.07] px-3 py-1.5 text-[11px] font-medium text-rose-400">
                  <Info className="h-3.5 w-3.5" />
                  Terminal
                </div>
              ) : (
                <button type="button" onClick={() => add(node.id)} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.08]">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              )}
            </div>

            {isTerminal ? (
              <p className="text-[12px] text-zinc-600">Finals are terminal — teams cannot advance further from here.</p>
            ) : conns.length === 0 ? (
              <p className="text-[12px] text-zinc-600">No outgoing connections.</p>
            ) : (
              <div className="space-y-3">
                {conns.map((c) => {
                  const key = `${node.id}-${c.id}`;
                  const err = errors[key];
                  return (
                    <div key={c.id} className={cn('grid gap-3 rounded-xl border bg-white/[0.02] p-3 sm:grid-cols-[1fr_1fr_120px_120px_1fr_40px]', err ? 'border-red-500/30' : 'border-white/[0.06]')}>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="truncate text-[12px]">{node.name || 'Unnamed'}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      </div>

                      <div>
                        <Label className="text-[10px] text-zinc-500">To</Label>
                        <Select value={c.toNodeId} onValueChange={(v) => update(node.id, c.id, { toNodeId: v })}>
                          <SelectTrigger className="h-8 rounded-lg border-white/10 bg-white/[0.04] text-[12px] text-white">
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedTargets.length === 0 ? (
                              <div className="px-3 py-2 text-[12px] text-zinc-500">No valid targets for a {node.nodeType}</div>
                            ) : allowedTargets.map((t) => (
                              <SelectItem key={t.id} value={t.id} className="text-[12px]">{t.name || 'Unnamed'}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[10px] text-zinc-500">Rule</Label>
                        <Select value={c.ruleType} onValueChange={(v) => update(node.id, c.id, { ruleType: v as AdvancementConnection['ruleType'] })}>
                          <SelectTrigger className="h-8 rounded-lg border-white/10 bg-white/[0.04] text-[12px] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RULE_TYPES.map((rt) => (
                              <SelectItem key={rt.value} value={rt.value} className="text-[12px]">{rt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[10px] text-zinc-500">Value</Label>
                        <Input
                          type="number"
                          min={1}
                          value={c.ruleValue}
                          onChange={(e) => update(node.id, c.id, { ruleValue: parseInt(e.target.value, 10) || 0 })}
                          className="h-8 rounded-lg border-white/10 bg-white/[0.04] text-[12px] text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] text-zinc-500">Seed</Label>
                        <Select value={c.seedMode} onValueChange={(v) => update(node.id, c.id, { seedMode: v as AdvancementConnection['seedMode'] })}>
                          <SelectTrigger className="h-8 rounded-lg border-white/10 bg-white/[0.04] text-[12px] text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SEED_MODES.map((sm) => (
                              <SelectItem key={sm.value} value={sm.value} className="text-[12px]">{sm.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end justify-end">
                        <button type="button" onClick={() => remove(node.id, c.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-500 transition-colors hover:border-red-500/30 hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {err && (
                        <div className="col-span-full flex items-center gap-1.5 text-[11px] text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {err}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
