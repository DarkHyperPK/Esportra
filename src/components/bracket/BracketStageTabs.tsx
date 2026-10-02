import { cn } from '@/lib/utils';

type Stage = { id: string; name: string };

type Props = {
    stages: Stage[];
    selectedStageId: string | null;
    versionsMap: Record<string, string>;
    onSelect: (stageId: string) => void;
};

/** Stage switcher as underlined tabs; a stage without a published bracket says so quietly. */
export const BracketStageTabs = ({ stages, selectedStageId, versionsMap, onSelect }: Props) => (
    <div role="tablist" aria-label="Stages" className="flex gap-6 overflow-x-auto border-b border-white/[0.07] px-4 sm:px-5">
        {stages.map((stage, index) => {
            const active = stage.id === selectedStageId;
            const published = Boolean(versionsMap[stage.id]);
            return (
                <button
                    key={stage.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onSelect(stage.id)}
                    className={cn(
                        'relative flex shrink-0 items-baseline gap-2 py-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                        active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200',
                    )}
                >
                    <span className="font-mono text-[10px] tabular-nums text-zinc-600">{String(index + 1).padStart(2, '0')}</span>
                    {stage.name}
                    {!published ? <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">Not published</span> : null}
                    {active ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-white" /> : null}
                </button>
            );
        })}
    </div>
);

export default BracketStageTabs;
