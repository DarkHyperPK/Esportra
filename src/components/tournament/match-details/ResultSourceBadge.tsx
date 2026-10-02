import { Camera, PenLine, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResultSource } from '@/services/matchStats/matchEvidence';

const SOURCE: Record<ResultSource, { label: string; Icon: typeof ShieldCheck; tone: string }> = {
    riot: { label: 'From Riot', Icon: ShieldCheck, tone: 'text-emerald-300' },
    screenshot: { label: 'Screenshot', Icon: Camera, tone: 'text-zinc-200' },
    reported: { label: 'Reported', Icon: PenLine, tone: 'text-zinc-400' },
};

/** How a result was reported: pulled from Riot, proved with a screenshot, or a typed score. */
export const ResultSourceBadge = ({ source, className, iconOnly = false }: { source: ResultSource; className?: string; iconOnly?: boolean }) => {
    const { label, tone } = SOURCE[source];
    const Icon = SOURCE[source].Icon;
    return (
        <span
            className={cn('inline-flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em]', tone, className)}
            title={iconOnly ? label : undefined}
        >
            <Icon aria-hidden className="h-3.5 w-3.5" />
            {iconOnly ? <span className="sr-only">{label}</span> : label}
        </span>
    );
};

export default ResultSourceBadge;
