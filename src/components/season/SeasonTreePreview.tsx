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

const nodeAccent = (nodeType: SeasonTreeNode['nodeType']) => {
  switch (nodeType) {
    case 'root':
      return { icon: 'bg-white/10 text-white', line: 'border-white/20' };
    case 'qualifier':
      return { icon: 'bg-amber-500/15 text-amber-400', line: 'border-amber-500/30' };
    case 'event':
      return { icon: 'bg-violet-500/15 text-violet-400', line: 'border-violet-500/30' };
    case 'stage':
      return { icon: 'bg-blue-500/15 text-blue-400', line: 'border-blue-500/30' };
    case 'final':
      return { icon: 'bg-rose-500/15 text-rose-300', line: 'border-rose-500/30' };
    default:
      return { icon: 'bg-zinc-500/15 text-zinc-400', line: 'border-zinc-500/30' };
  }
};

const TreeNode = ({
  node,
  depth,
  compact,
  isLast,
  parentLineColor,
}: {
  node: SeasonTreeNode;
  depth: number;
  compact: boolean;
  isLast: boolean;
  parentLineColor: string;
}) => {
  const Icon = nodeIcon(node.nodeType);
  const accent = nodeAccent(node.nodeType);
  const hasChildren = node.children.length > 0;
  const isRoot = depth === 0;

  return (
    <div className="relative">
      {/* Connector lines */}
      {!isRoot && (
        <>
          {/* Vertical line from parent */}
          <div
            className={cn('absolute left-0 top-0 border-l-2', parentLineColor)}
            style={{
              left: (depth - 1) * 28 + 11,
              height: isLast ? 20 : '100%',
            }}
          />
          {/* Horizontal branch */}
          <div
            className={cn('absolute border-t-2', parentLineColor)}
            style={{
              left: (depth - 1) * 28 + 11,
              top: 20,
              width: 16,
            }}
          />
        </>
      )}

      {/* Node card */}
      <div
        className={cn(
          'relative flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm',
          compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
        )}
        style={{ marginLeft: depth * 28 }}
      >
        <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', accent.icon)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{node.name}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            {node.nodeType} · {node.status}
          </p>
        </div>
        {node.region && (
          <span className="shrink-0 text-[10px] text-zinc-500">{node.region}</span>
        )}
      </div>

      {/* Children */}
      {hasChildren && (
        <div className="relative">
          {/* Vertical trunk line through children */}
          <div
            className={cn('absolute border-l-2', accent.line)}
            style={{
              left: depth * 28 + 11,
              top: 0,
              bottom: 0,
            }}
          />
          <div className={cn(compact ? 'space-y-1.5 py-1.5' : 'space-y-2 py-2')}>
            {node.children.map((child, index) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                compact={compact}
                isLast={index === node.children.length - 1}
                parentLineColor={accent.line}
              />
            ))}
          </div>
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
    <div className={cn(compact ? 'space-y-2' : 'space-y-3', className)}>
      {tree.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          compact={compact}
          isLast
          parentLineColor="border-white/20"
        />
      ))}
    </div>
  );
};

export default SeasonTreePreview;
