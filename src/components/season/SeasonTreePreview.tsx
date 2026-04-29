import { cn } from '@/lib/utils';
import type { SeasonTreeNode } from '@/types/season';
import { Brackets, Flag, Layers3, Trophy, Workflow } from 'lucide-react';

interface SeasonTreePreviewProps {
  tree: SeasonTreeNode[];
  className?: string;
  compact?: boolean;
}

const nodeIcon = (nodeType: SeasonTreeNode['nodeType']) => {
  switch (nodeType) {
    case 'root':
      return Layers3;
    case 'qualifier':
      return Flag;
    case 'final':
      return Trophy;
    case 'stage':
      return Brackets;
    default:
      return Workflow;
  }
};

const renderTreeNode = (node: SeasonTreeNode, depth: number, compact: boolean) => {
  const Icon = nodeIcon(node.nodeType);

  return (
    <div key={node.id} className="space-y-3">
      <div
        className={cn(
          'rounded-2xl border border-white/10 bg-black/30 p-4 text-white backdrop-blur-xl',
          compact ? 'py-3' : 'py-4',
        )}
        style={{ marginLeft: depth * (compact ? 12 : 20) }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{node.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {node.nodeType} · {node.status}
                </p>
              </div>
            </div>

            {(node.linkedTournamentName || node.linkedStageName) && (
              <p className="text-xs text-zinc-400">
                Linked to{' '}
                <span className="font-medium text-zinc-200">
                  {node.linkedStageName ?? node.linkedTournamentName}
                </span>
                {node.linkedStageName && node.linkedTournamentName ? ` · ${node.linkedTournamentName}` : ''}
              </p>
            )}
          </div>

          <div className="space-y-1 text-right text-xs text-zinc-400">
            {node.region && <p>{node.region}</p>}
            {node.city && <p>{node.city}</p>}
            {node.country && <p>{node.country}</p>}
          </div>
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="space-y-3">
          {node.children.map((child) => renderTreeNode(child, depth + 1, compact))}
        </div>
      )}
    </div>
  );
};

const SeasonTreePreview = ({ tree, className, compact = false }: SeasonTreePreviewProps) => {
  if (tree.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-400', className)}>
        No season structure has been configured yet.
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {tree.map((node) => renderTreeNode(node, 0, compact))}
    </div>
  );
};

export default SeasonTreePreview;

