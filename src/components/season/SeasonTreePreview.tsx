interface SeasonTreeNode {
  id: string;
  name: string;
  type: string;
  status: string;
  children?: SeasonTreeNode[];
}

interface SeasonTreePreviewProps {
  tree: SeasonTreeNode[] | null | undefined;
  className?: string;
  compact?: boolean;
}

const SeasonTreePreview = ({ tree, className = '' }: SeasonTreePreviewProps) => {
  if (!tree || tree.length === 0) return null;
  return (
    <div className={`rounded-2xl border border-white/5 bg-white/[0.02] p-4 ${className}`}>
      <p className="text-xs text-zinc-500">
        {tree.length} node{tree.length !== 1 ? 's' : ''} configured
      </p>
    </div>
  );
};

export default SeasonTreePreview;
