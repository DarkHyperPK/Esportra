import { InlineNotice } from '@/components/ui/kit';
import { formatLabel, getBestOfLabel, stageFacts, type SeriesGameData, type StageConfig } from './stageSetupRules';

interface StageReviewProps {
    stages: StageConfig[];
    removedCount: number;
    isEdit: boolean;
    gameData: SeriesGameData;
}

function seriesSummary(stage: StageConfig, gameData: SeriesGameData): string {
    const base = getBestOfLabel(stage.best_of, gameData);
    return stage.bo_mode === 'per_round' && Object.keys(stage.round_bo_overrides).length > 0
        ? `${base}, some rounds differ`
        : base;
}

/** Last look before saving: the event as one path from first match to final. */
export function StageReview({ stages, removedCount, isEdit, gameData }: StageReviewProps) {
    const count = `${stages.length} ${stages.length === 1 ? 'stage' : 'stages'}`;
    return (
        <div className="space-y-6 py-2">
            <InlineNotice tone={removedCount > 0 && stages.length === 0 ? 'warning' : 'neutral'}>
                {stages.length === 0
                    ? 'Saving will remove every stage. Brackets for this tournament will be empty until you add new ones.'
                    : isEdit
                        ? `Saving updates this tournament to ${count}.${removedCount > 0 ? ` ${removedCount} removed ${removedCount === 1 ? 'stage' : 'stages'} will be deleted.` : ''}`
                        : `Your tournament will run in ${count}, in this order. You can change them later from Format and stages.`}
            </InlineNotice>

            {stages.length > 0 && (
                <ol className="relative space-y-3 border-l border-white/10 pl-6">
                    {stages.map((stage, i) => (
                        <li key={stage.id ?? `${stage.name}-${i}`} className="relative">
                            <span
                                aria-hidden
                                className="absolute -left-[37px] top-3 flex h-6 w-6 items-center justify-center bg-card font-mono text-[11px] font-bold text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
                            >
                                {i + 1}
                            </span>
                            <div className="bg-white/[0.02] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="font-heading text-base font-bold text-white">{stage.name}</p>
                                    <p className="text-xs text-zinc-400">{formatLabel(stage.format)}</p>
                                </div>
                                <p className="mt-1 text-sm text-zinc-400">
                                    {stageFacts(stage)} · {seriesSummary(stage, gameData)}
                                </p>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
