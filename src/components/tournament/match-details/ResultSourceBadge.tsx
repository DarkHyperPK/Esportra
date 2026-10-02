import { Camera, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResultSource } from '@/services/matchStats/matchEvidence';

// A typed score has no proof behind it, so it gets no icon: an icon there reads
// as a control (a pen looks like "edit") on a page nobody can edit.
const SOURCE: Record<ResultSource, { label: string; Icon: typeof ShieldCheck | null; tone: string }> = {
    riot: { label: 'From Riot', Icon: ShieldCheck, tone: 'text-emerald-300' },
    screenshot: { label: 'Screenshot', Icon: Camera, tone: 'text-zinc-200' },
    reported: { label: 'Team reported', Icon: null, tone: 'text-zinc-400' },
};

/** How a result was reported: pulled from Riot, proved with a screenshot, or a typed score. */
export const ResultSourceBadge = ({ source, className, iconOnly = false }: { source: ResultSource; className?: string; iconOnly?: boolean }) => {
    const { label, tone } = SOURCE[source];
    const Icon = SOURCE[source].Icon;
    if (iconOnly && !Icon) return null;
    return (
        <span
            role={iconOnly ? 'img' : undefined}
            aria-label={iconOnly ? label : undefined}
            title={iconOnly ? label : undefined}
            className={cn('inline-flex shrink-0 items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em]', tone, className)}
        >
            {Icon ? <Icon aria-hidden className="h-3.5 w-3.5" /> : null}
            {iconOnly ? null : label}
        </span>
    );
};

export default ResultSourceBadge;
