import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { formatLabel, stageFacts, type StageConfig } from './stageSetupRules';

interface StageListProps {
    stages: StageConfig[];
    editingIndex: number | null;
    onEdit: (index: number) => void;
    onRemove: (index: number) => void;
}

/** The stages so far, in order, each with edit and remove. */
export function StageList({ stages, editingIndex, onEdit, onRemove }: StageListProps) {
    if (stages.length === 0) return null;
    return (
        <section aria-label="Your stages">
            <p className={cn(EYEBROW_CLASS, 'mb-3')}>Your stages</p>
            <ol className="grid gap-px bg-white/[0.06]">
                {stages.map((stage, i) => (
                    <li
                        key={stage.id ?? `${stage.name}-${i}`}
                        className={cn(
                            'flex items-center gap-4 bg-card px-4 py-3 transition-colors',
                            editingIndex === i && 'bg-rose-500/[0.06] shadow-[inset_2px_0_0_0_rgb(244,63,94)]',
                        )}
                    >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-white/[0.06] font-mono text-xs font-bold text-zinc-300">
                            {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{stage.name}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                {formatLabel(stage.format)} · {stageFacts(stage)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onEdit(i)}
                            aria-label={`Edit ${stage.name}`}
                            className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        >
                            <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(i)}
                            aria-label={`Remove ${stage.name}`}
                            className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        >
                            <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                    </li>
                ))}
            </ol>
        </section>
    );
}
