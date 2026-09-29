import { Lock } from 'lucide-react';
import { HINT_CLASS, LABEL_CLASS } from '@/components/ui/kit';

/** Stage 1 always takes the whole field, so its size is read-only here. */
export function FirstStageCapacityNote({ max }: { max: number | null }) {
    return (
        <div className="flex items-start gap-3 bg-white/[0.02] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            <div>
                <p className={LABEL_CLASS}>
                    Teams in stage 1: <span className="font-heading font-bold text-white">{max ?? 'No limit'}</span>
                </p>
                <p className={HINT_CLASS}>
                    The first stage takes everyone who registers. To change the limit, edit the team cap in Basic info.
                </p>
            </div>
        </div>
    );
}
