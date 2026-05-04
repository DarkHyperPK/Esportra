import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, BookOpen, ChevronDown, Flag, HelpCircle, Layers3, Map, PlayCircle, Plus, Save, Trophy, Workflow, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { OrganizerTournamentOption, SeasonBuilderNode, SeasonNodeType } from '@/types/season';
import SeasonBuilderCanvas from './SeasonBuilderCanvas';
import SeasonBuilderGuide from './SeasonBuilderGuide';
import SeasonBuilderInspector from './SeasonBuilderInspector';
import SeasonBuilderTour from './SeasonBuilderTour';
import {
  buildRegionalCircuit,
  buildSimpleCircuit,
  countConfiguredStages,
  createSeasonBuilderNode,
  normalizeSeasonBuilderNodes,
} from './seasonBuilderUtils';

const TUTORIAL_KEY = 'ssb-v2';
const DEFAULT_REGIONS = ['Region 1', 'Region 2', 'Region 3', 'Region 4'];

const QUICK_ADD: { type: Exclude<SeasonNodeType, 'root' | 'stage'>; label: string; icon: typeof Flag }[] = [
  { type: 'qualifier', label: 'Qualifier', icon: Flag },
  { type: 'event', label: 'Event', icon: Workflow },
  { type: 'final', label: 'Finals', icon: Trophy },
];

// ─────────────────────────────────────────────────────────────────────────────
// Visual flow preview — shows what the generated structure looks like
// ─────────────────────────────────────────────────────────────────────────────

const FlowPreview = ({ phases }: { phases: { label: string; count: number; rule: string }[] }) => (
  <div className="mt-5 rounded-2xl border border-white/[0.04] bg-black/30 p-4">
    <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-zinc-600">Preview</p>
    <div className="space-y-0">
      {phases.map((phase, i) => (
        <div key={i}>
          <div className="flex items-center gap-3">
            <div className="flex h-6 min-w-6 items-center justify-center rounded-md bg-white/[0.04] text-[10px] font-bold text-zinc-500">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-zinc-300">{phase.label}</p>
              <p className="text-[10px] text-zinc-600">{phase.count} stage{phase.count > 1 ? 's' : ''}</p>
            </div>
          </div>
          {i < phases.length - 1 && (
            <div className="ml-3 flex items-center gap-3 py-1.5">
              <div className="flex flex-col items-center">
                <div className="h-3 w-px bg-white/[0.08]" />
                <ArrowDown className="h-2.5 w-2.5 text-white/[0.12]" />
                <div className="h-3 w-px bg-white/[0.08]" />
              </div>
              <p className="text-[10px] italic text-zinc-600">{phase.rule}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

interface SeasonStructureBuilderProps {
  title: string;
  description: string;
  nodes: SeasonBuilderNode[];
  onChange: (nodes: SeasonBuilderNode[]) => void;
  tournamentOptions?: OrganizerTournamentOption[];
  onSave?: () => void;
  saveLabel?: string;
  isSaving?: boolean;
  helperText?: string;
}

const SeasonStructureBuilder = ({
  title, description, nodes, onChange, tournamentOptions = [],
  onSave, saveLabel = 'Save structure', isSaving = false, helperText,
}: SeasonStructureBuilderProps) => {
  const normalizedNodes = useMemo(() => normalizeSeasonBuilderNodes(nodes), [nodes]);
  const [selectedNodeId, setSelectedNodeId] = useState(normalizedNodes[0]?.id ?? '');
  const [showTutorial, setShowTutorial] = useState(() => {
    try { return localStorage.getItem(TUTORIAL_KEY) !== '1'; } catch { return false; }
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<'regional' | 'simple' | null>('regional');

  const [regionCount, setRegionCount] = useState(4);
  const [regionNames, setRegionNames] = useState<string[]>(DEFAULT_REGIONS);
  const [templateOpts, setTemplateOpts] = useState({ includeQualifiers: true, includeRegionalFinals: true, includeGrandFinal: true });

  useEffect(() => {
    if (!normalizedNodes.some((n) => n.id === selectedNodeId)) {
      setSelectedNodeId(normalizedNodes[0]?.id ?? '');
    }
  }, [normalizedNodes, selectedNodeId]);

  const selectedNode = normalizedNodes.find((n) => n.id === selectedNodeId);
  const configuredSummary = countConfiguredStages(normalizedNodes);

  const updateNodes = (next: SeasonBuilderNode[]) => onChange(normalizeSeasonBuilderNodes(next));

  const addNode = (parentNodeId: string | null, nodeType: 'qualifier' | 'event' | 'final' | 'custom') => {
    const newNode = createSeasonBuilderNode(parentNodeId, normalizedNodes.length, nodeType);
    const normalized = normalizeSeasonBuilderNodes([...normalizedNodes, newNode]);
    updateNodes(normalized);
    setSelectedNodeId(normalized.find((n) => n.id === newNode.id)?.id ?? selectedNodeId);
  };

  const addStageToPhase = (nodeType: Exclude<SeasonNodeType, 'root'>) => {
    addNode(normalizedNodes[0]?.id ?? null, nodeType as 'qualifier' | 'event' | 'final' | 'custom');
  };

  const handleNodeChange = (nodeId: string, patch: Partial<SeasonBuilderNode>) =>
    updateNodes(normalizedNodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)));

  const handleRemoveNode = (nodeId: string) => {
    const toRemove = normalizedNodes.find((n) => n.id === nodeId);
    if (!toRemove || toRemove.nodeType === 'root') return;
    updateNodes(
      normalizedNodes.filter((n) => n.id !== nodeId)
        .map((n) => (n.parentNodeId === nodeId ? { ...n, parentNodeId: toRemove.parentNodeId } : n)),
    );
    setSelectedNodeId(toRemove.parentNodeId ?? normalizedNodes[0]?.id ?? '');
  };

  const handleRegionCountChange = (count: number) => {
    const clamped = Math.max(1, Math.min(12, count));
    setRegionCount(clamped);
    setRegionNames((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push(`Region ${next.length + 1}`);
      return next.slice(0, clamped);
    });
  };

  const applyRegionalCircuit = () => {
    const rootId = normalizedNodes[0]?.id;
    if (!rootId) return;
    const extra = buildRegionalCircuit(rootId, regionNames.slice(0, regionCount), templateOpts);
    onChange(normalizeSeasonBuilderNodes([normalizedNodes[0], ...extra]));
    dismissTutorial();
  };

  const applySimpleCircuit = (stopCount: number) => {
    const rootId = normalizedNodes[0]?.id;
    if (!rootId) return;
    onChange(normalizeSeasonBuilderNodes([normalizedNodes[0], ...buildSimpleCircuit(rootId, stopCount)]));
    dismissTutorial();
  };

  const dismissTutorial = () => {
    try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ }
    setShowTutorial(false);
  };

  // Build flow preview for regional circuit
  const regionalPreviewPhases = [
    ...(templateOpts.includeQualifiers ? [{ label: 'Qualifiers', count: regionCount, rule: `Top finishers from each qualifier advance` }] : []),
    ...(templateOpts.includeRegionalFinals ? [{ label: 'Regional Finals', count: regionCount, rule: 'Winners from each region converge' }] : []),
    ...(templateOpts.includeGrandFinal ? [{ label: 'Grand Finals', count: 1, rule: '' }] : []),
  ];

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">
        {showTutorial ? (
          <motion.div
            key="tutorial"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28 }}
            className="rounded-[32px] border border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="border-b border-white/[0.04] px-8 py-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-body text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-600">
                    Step 2 · Structure
                  </p>
                  <h3 className="font-heading mt-2 text-2xl font-bold tracking-tight text-white">
                    How does your season flow?
                  </h3>
                  <p className="font-body mt-3 max-w-lg text-[13px] leading-relaxed text-zinc-500">
                    A season is a connected tournament circuit. Pick a template, generate the flow, then configure each tournament and its advancement path inline.
                  </p>
                </div>
                <button type="button" onClick={dismissTutorial}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-zinc-600 transition hover:border-white/10 hover:text-zinc-400" aria-label="Skip">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Template selector tabs */}
            <div className="border-b border-white/[0.04] px-8">
              <div className="flex gap-0">
                {[
                  { id: 'regional' as const, icon: Map, label: 'Regional Circuit', desc: 'Multi-region pathway' },
                  { id: 'simple' as const, icon: Workflow, label: 'Event Series', desc: 'Flat event stops' },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTemplate === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTemplate(tab.id)}
                      className={cn(
                        'flex items-center gap-3 border-b-2 px-6 py-4 transition',
                        isActive
                          ? 'border-white text-white'
                          : 'border-transparent text-zinc-600 hover:text-zinc-400',
                      )}
                    >
                      <TabIcon className="h-4 w-4" />
                      <div className="text-left">
                        <p className="text-[13px] font-semibold">{tab.label}</p>
                        <p className="text-[10px] text-zinc-600">{tab.desc}</p>
                      </div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={dismissTutorial}
                  className="ml-auto flex items-center gap-2 border-b-2 border-transparent px-6 py-4 text-zinc-600 transition hover:text-zinc-400"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-[13px]">Start empty</span>
                </button>
              </div>
            </div>

            {/* Template content */}
            <div className="px-8 py-8">
              <AnimatePresence mode="wait">
                {activeTemplate === 'regional' && (
                  <motion.div key="regional" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
                      {/* Config panel */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-heading text-[18px] font-bold text-white">Regional Circuit</h4>
                          <p className="font-body mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                            Players compete in regional qualifiers. Top finishers advance to regional finals. Winners from each region converge at a grand championship. This is the standard format used by ESL, FACEIT, and most national esports circuits.
                          </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-zinc-500">Number of regions</Label>
                            <Input type="number" min={1} max={12} value={regionCount}
                              onChange={(e) => handleRegionCountChange(Number(e.target.value))}
                              className="h-10 rounded-xl border-white/[0.06] bg-white/[0.02] text-white" />
                          </div>
                          <div />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-zinc-500">Name each region</Label>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                            {regionNames.slice(0, regionCount).map((name, i) => (
                              <Input key={i} value={name}
                                onChange={(e) => { const next = [...regionNames]; next[i] = e.target.value; setRegionNames(next); }}
                                className="h-9 rounded-xl border-white/[0.06] bg-white/[0.02] text-white text-[12px]"
                                placeholder={`Region ${i + 1}`} />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 border-t border-white/[0.04] pt-5">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">Include in structure</p>
                          {([
                            { key: 'includeQualifiers' as const, label: 'Qualifier round per region', desc: 'Open entry stage where players compete to advance' },
                            { key: 'includeRegionalFinals' as const, label: 'Regional final per region', desc: 'Top qualifiers battle for the regional title' },
                            { key: 'includeGrandFinal' as const, label: 'Grand championship final', desc: 'All regional winners compete for the overall title' },
                          ]).map((opt) => (
                            <div key={opt.key} className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3.5">
                              <div>
                                <p className="text-[12px] font-medium text-zinc-300">{opt.label}</p>
                                <p className="mt-0.5 text-[11px] text-zinc-600">{opt.desc}</p>
                              </div>
                              <Switch checked={templateOpts[opt.key]}
                                onCheckedChange={(v) => setTemplateOpts((prev) => ({ ...prev, [opt.key]: v }))} />
                            </div>
                          ))}
                        </div>

                        <Button type="button" className="w-full bg-white text-black font-semibold hover:bg-zinc-200 h-11" onClick={applyRegionalCircuit}>
                          Generate {regionCount}-region structure
                        </Button>
                      </div>

                      {/* Live flow preview */}
                      <div>
                        <FlowPreview phases={regionalPreviewPhases} />

                        <div className="mt-4 rounded-2xl border border-white/[0.04] bg-black/30 p-4">
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-zinc-600">How it works</p>
                          <ol className="space-y-2 text-[11px] leading-relaxed text-zinc-500">
                            <li className="flex gap-2"><span className="shrink-0 text-zinc-600">1.</span>Each region gets its own planned tournaments in the flow.</li>
                            <li className="flex gap-2"><span className="shrink-0 text-zinc-600">2.</span>Configure every tournament inline in the Inspector.</li>
                            <li className="flex gap-2"><span className="shrink-0 text-zinc-600">3.</span>Set advancement targets so qualified teams move into the next tournament.</li>
                            <li className="flex gap-2"><span className="shrink-0 text-zinc-600">4.</span>Publishing creates the connected tournament circuit from this plan.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTemplate === 'simple' && (
                  <motion.div key="simple" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-heading text-[18px] font-bold text-white">Event Series</h4>
                          <p className="font-body mt-1.5 text-[13px] leading-relaxed text-zinc-500">
                            A flat series of tournament stops where players accumulate points across the season. The top-ranked players at the end qualify for a championship final. Used by formats like DreamHack circuits and Pro Tour events.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">How many event stops?</p>
                          {[
                            { n: 3, label: '3 events + finals', desc: 'Short season — quick to set up' },
                            { n: 5, label: '5 events + finals', desc: 'Standard season length' },
                            { n: 8, label: '8 events + finals', desc: 'Full-length competitive circuit' },
                          ].map(({ n, label, desc }) => (
                            <button key={n} type="button" onClick={() => applySimpleCircuit(n)}
                              className="flex w-full items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 text-left transition hover:border-white/10 hover:bg-white/[0.03]">
                              <div>
                                <p className="text-[13px] font-semibold text-zinc-200">{label}</p>
                                <p className="mt-0.5 text-[11px] text-zinc-600">{desc}</p>
                              </div>
                              <ChevronDown className="h-4 w-4 -rotate-90 text-zinc-600" />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <FlowPreview phases={[
                          { label: 'Event Stops', count: 5, rule: 'Points accumulate across all events' },
                          { label: 'Grand Finals', count: 1, rule: '' },
                        ]} />
                        <div className="mt-4 rounded-2xl border border-white/[0.04] bg-black/30 p-4">
                          <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-zinc-600">How it works</p>
                          <ol className="space-y-2 text-[11px] leading-relaxed text-zinc-500">
                            <li className="flex gap-2"><span className="shrink-0 text-zinc-600">1.</span>Each event stop is an independent tournament.</li>
                            <li className="flex gap-2"><span className="shrink-0 text-zinc-600">2.</span>Players earn points based on placement at each stop.</li>
                            <li className="flex gap-2"><span className="shrink-0 text-zinc-600">3.</span>Standings accumulate across the full season.</li>
                            <li className="flex gap-2"><span className="shrink-0 text-zinc-600">4.</span>Top-ranked players qualify for the Grand Finals.</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          /* ─── Builder workspace ──────────────────────────────────────── */
          <motion.div key="builder" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }} className="space-y-5">

            {/* Header */}
            <div className="rounded-[28px] border border-white/[0.06] bg-[#0a0a0c]/95 px-6 py-5 backdrop-blur-2xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-lg font-bold text-white">{title}</p>
                  <p className="font-body mt-1 text-[13px] text-zinc-500">{description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center">
                      <p className="font-body text-[9px] uppercase tracking-[0.14em] text-zinc-600">Stages</p>
                      <p className="font-heading mt-0.5 text-lg font-bold text-white">{normalizedNodes.filter((n) => n.nodeType !== 'root').length}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center">
                      <p className="font-body text-[9px] uppercase tracking-[0.14em] text-zinc-600">Ready</p>
                      <p className="font-heading mt-0.5 text-lg font-bold text-white">{configuredSummary.configured}</p>
                    </div>
                  </div>
                  {[
                    { key: 'tour', active: showTour, icon: PlayCircle, toggle: () => { setShowGuide(false); setShowTour((v) => !v); }, tip: 'Tour' },
                    { key: 'guide', active: showGuide, icon: BookOpen, toggle: () => { setShowTour(false); setShowGuide((v) => !v); }, tip: 'Guide' },
                    { key: 'help', active: showHelp, icon: HelpCircle, toggle: () => setShowHelp((v) => !v), tip: 'Reference' },
                  ].map(({ key, active, icon: Ic, toggle, tip }) => (
                    <button key={key} type="button" onClick={toggle} title={tip}
                      className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition',
                        active ? 'border-white/20 bg-white/[0.08] text-white' : 'border-white/[0.06] bg-white/[0.02] text-zinc-600 hover:text-zinc-400')}>
                      <Ic className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick add */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="font-body text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Add tournament</span>
                {QUICK_ADD.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button key={opt.type} type="button" onClick={() => addNode(normalizedNodes[0]?.id ?? null, opt.type)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3.5 py-1.5 text-[12px] font-medium text-zinc-400 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-zinc-200">
                      <Icon className="h-3 w-3" /> {opt.label}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setShowTutorial(true)}
                  className="ml-auto text-[11px] font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-400 hover:underline">
                  Templates
                </button>
              </div>
            </div>

            <AnimatePresence>{showTour && <SeasonBuilderTour onClose={() => setShowTour(false)} />}</AnimatePresence>

            {/* Canvas + Inspector */}
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
              <SeasonBuilderCanvas nodes={normalizedNodes} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId}
                onAddChild={(nodeId) => addNode(nodeId, 'qualifier')} onAddStageToPhase={addStageToPhase} onReorder={updateNodes} />
              <AnimatePresence mode="wait">
                {showGuide ? (
                  <SeasonBuilderGuide key="guide" onClose={() => setShowGuide(false)} onStartTour={() => { setShowGuide(false); setShowTour(true); }} />
                ) : (
                  <SeasonBuilderInspector key="inspector" node={selectedNode} allNodes={normalizedNodes}
                    tournamentOptions={tournamentOptions} onChange={handleNodeChange} onRemove={handleRemoveNode} />
                )}
              </AnimatePresence>
            </div>

            {(helperText ?? onSave) && (
              <div className={cn('flex flex-col gap-4 rounded-[24px] border border-white/[0.06] bg-[#0a0a0c]/80 px-5 py-4 backdrop-blur-xl', onSave && 'md:flex-row md:items-center md:justify-between')}>
                {helperText && <p className="font-body text-[13px] text-zinc-500">{helperText}</p>}
                {onSave && (
                  <Button type="button" className="bg-white text-black font-semibold hover:bg-zinc-200" onClick={onSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />{isSaving ? 'Saving...' : saveLabel}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SeasonStructureBuilder;
