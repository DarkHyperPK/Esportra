import { ArrowRight, ArrowRightCircle, CalendarRange, CheckCircle2, CircleDashed, Flag, Layers3, Plus, Trophy, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SeasonBuilderNode, SeasonNodeType } from '@/types/season';
import {
  getConnectionLabel,
  groupNodesIntoPhases,
  isTournamentConfigComplete,
  readOutgoingConnections,
  readTournamentConfig,
  type PhaseGroup,
} from './seasonBuilderUtils';

interface SeasonBuilderCanvasProps {
  nodes: SeasonBuilderNode[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onAddChild: (nodeId: string) => void;
  onAddStageToPhase: (nodeType: Exclude<SeasonNodeType, 'root'>) => void;
  onReorder: (nodes: SeasonBuilderNode[]) => void;
}

const iconByNodeType = {
  root: Layers3, qualifier: Flag, event: Workflow, stage: Workflow, final: Trophy, custom: Workflow,
} as const;

// ── Stage card ──────────────────────────────────────────────────────────────

const StageCard = ({
  node,
  allNodes,
  isSelected,
  onSelect,
}: {
  node: SeasonBuilderNode;
  allNodes: SeasonBuilderNode[];
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const Icon = iconByNodeType[node.nodeType];
  const connectionFrom = getConnectionLabel(node, allNodes);
  const config = readTournamentConfig(node);
  const configured = isTournamentConfigComplete(config);
  const outgoing = readOutgoingConnections(node);
  const firstOutgoingTargetName = outgoing.length > 0
    ? (allNodes.find((n) => n.id === outgoing[0].toNodeId)?.name || 'another stage')
    : null;
  const advancementLabel = outgoing.length === 0
    ? null
    : outgoing.length === 1
      ? `Top ${outgoing[0].ruleValue}${outgoing[0].ruleType === 'top_percentage' ? '%' : ''} → ${firstOutgoingTargetName}`
      : `${outgoing.length} advancement paths`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      data-tour-id={isSelected ? 'canvas-card' : undefined}
      data-tour-card="stage"
      className={cn(
        'w-full rounded-2xl border p-3.5 text-left transition-all cursor-pointer',
        isSelected
          ? 'border-white/20 bg-white/[0.06] shadow-[0_8px_32px_rgba(255,255,255,0.04)] ring-1 ring-white/10'
          : 'border-white/[0.05] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-body truncate text-[13px] font-semibold text-white">
            {node.name || 'Untitled tournament'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge className="border border-white/[0.06] bg-white/[0.03] text-[9px] uppercase tracking-[0.16em] text-zinc-500 hover:bg-white/[0.03]">
              {node.status}
            </Badge>
            {node.region && (
              <Badge className="border border-white/[0.06] bg-white/[0.03] text-[9px] uppercase tracking-[0.16em] text-zinc-600 hover:bg-white/[0.03]">
                {node.region}
              </Badge>
            )}
            <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]',
              configured ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300')}>
              {configured ? <CheckCircle2 className="h-2.5 w-2.5" /> : <CircleDashed className="h-2.5 w-2.5" />}
              {configured ? 'Ready' : 'Setup'}
            </span>
          </div>
          {connectionFrom && (
            <p className="mt-2 flex items-center gap-1 text-[10px] text-zinc-600">
              <ArrowRight className="h-2.5 w-2.5 rotate-180" />
              from {connectionFrom}
            </p>
          )}
          {advancementLabel && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400/70">
              <ArrowRightCircle className="h-2.5 w-2.5" />
              {advancementLabel}
            </p>
          )}
          {(node.startsAt || node.endsAt) && (
            <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-700">
              <CalendarRange className="h-2.5 w-2.5" />
              {node.startsAt || '—'} → {node.endsAt || '—'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Phase column ────────────────────────────────────────────────────────────

const PhaseColumn = ({
  phase,
  allNodes,
  selectedNodeId,
  onSelectNode,
  onAddStage,
  isLast,
}: {
  phase: PhaseGroup;
  allNodes: SeasonBuilderNode[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onAddStage: () => void;
  isLast: boolean;
}) => {
  return (
    <div className="flex items-stretch gap-0">
      <div className="flex w-[220px] shrink-0 flex-col rounded-2xl border border-white/[0.05] bg-white/[0.01] xl:w-[240px]">
        {/* Phase header */}
        <div className="flex items-center gap-2 rounded-t-2xl border-b border-white/[0.04] bg-white/[0.02] px-4 py-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
            {phase.label}
          </span>
          <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-white/[0.04] px-1.5 text-[10px] font-semibold text-zinc-500">
            {phase.nodes.length}
          </span>
        </div>

        {/* Cards */}
        <div className="flex-1 space-y-2 p-3">
          {phase.nodes.map((node) => (
            <StageCard
              key={node.id}
              node={node}
              allNodes={allNodes}
              isSelected={node.id === selectedNodeId}
              onSelect={() => onSelectNode(node.id)}
            />
          ))}
        </div>

        {/* Add stage */}
        <div className="border-t border-white/[0.04] p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed border-white/[0.06] text-[11px] text-zinc-500 bg-transparent hover:bg-white/[0.03] hover:text-zinc-300"
            onClick={onAddStage}
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Add stage
          </Button>
        </div>
      </div>

      {/* Flow indicator */}
      {!isLast && (
        <div className="flex w-8 shrink-0 items-center justify-center">
          <ArrowRight className="h-3.5 w-3.5 text-white/[0.08]" />
        </div>
      )}
    </div>
  );
};

// ── Canvas ──────────────────────────────────────────────────────────────────

const SeasonBuilderCanvas = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddStageToPhase,
}: SeasonBuilderCanvasProps) => {
  const nonRootNodes = nodes.filter((n) => n.nodeType !== 'root');
  const phases = groupNodesIntoPhases(nodes);

  if (nonRootNodes.length === 0) {
    return (
      <div data-tour-id="canvas" className="rounded-[28px] border border-white/[0.06] bg-[#0d0d10]">
        <div className="flex h-72 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <Plus className="h-5 w-5 text-zinc-600" />
          </div>
          <div>
              <p className="font-body text-[13px] font-semibold text-zinc-400">No tournaments yet</p>
              <p className="font-body mt-1 max-w-xs text-[12px] text-zinc-600">
                Use a template or the quick-add buttons above to start planning tournaments for your season.
              </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-tour-id="canvas" className="rounded-[28px] border border-white/[0.06] bg-[#0d0d10]">
      <div className="border-b border-white/[0.04] px-5 py-4">
        <p className="font-heading text-[15px] font-semibold text-white">Season flow</p>
        <p className="font-body mt-1 text-[12px] text-zinc-600">
          Click any tournament to configure it. Tournaments are grouped by role.
        </p>
      </div>

      <ScrollArea className="max-h-[600px]" type="always">
        <div className="p-5">
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {phases.map((phase, idx) => (
              <PhaseColumn
                key={phase.nodeType}
                phase={phase}
                allNodes={nodes}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onAddStage={() => onAddStageToPhase(phase.nodeType)}
                isLast={idx === phases.length - 1}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SeasonBuilderCanvas;
