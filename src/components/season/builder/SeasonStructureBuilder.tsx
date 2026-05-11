import type { SeasonBuilderNode } from '@/types/season';

interface Props {
  title: string;
  description: string;
  nodes: SeasonBuilderNode[];
  onChange: (nodes: SeasonBuilderNode[]) => void;
  onSave: () => void;
  isSaving: boolean;
  surface?: string;
}

const SeasonStructureBuilder = ({
  title,
  description,
  nodes,
  onChange: _onChange,
  onSave,
  isSaving,
}: Props) => {
  return (
    <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-zinc-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="shrink-0 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save structure'}
        </button>
      </div>

      <div className="mt-6">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] py-16 text-center">
            <p className="text-sm font-medium text-zinc-400">No nodes yet</p>
            <p className="text-xs text-zinc-600">
              Add tournaments and stages to build the season circuit.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {nodes.map((node, i) => (
              <div
                key={node.id || i}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0a0c] px-4 py-3"
              >
                <span className="rounded border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                  {node.nodeType}
                </span>
                <span className="font-semibold text-white">{node.name || 'Unnamed'}</span>
                <span className="ml-auto text-xs text-zinc-600">{node.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeasonStructureBuilder;
