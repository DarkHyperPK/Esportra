import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import type { PrizeDistributionEntry } from '@/types/prizeDistribution';

interface PrizeAllocationBarProps {
    placements: PrizeDistributionEntry[];
    prizePool: number;
    currency: string;
}

// First place strongest, fading down the ladder: hierarchy through one hue.
const SHADES = ['bg-rose-500', 'bg-rose-500/70', 'bg-rose-500/50', 'bg-rose-500/35', 'bg-rose-500/25'];

/** The whole pool as one bar: each place's share, what's left, and whether you've over-allocated. */
export function PrizeAllocationBar({ placements, prizePool, currency }: PrizeAllocationBarProps) {
    const total = placements.reduce((sum, p) => sum + (Number.isFinite(p.percentage) ? p.percentage : 0), 0);
    const over = total > 100;
    const remaining = Math.max(0, 100 - total);

    return (
        <div className="space-y-2">
            <div className="flex h-3 w-full overflow-hidden bg-white/[0.06]" role="img" aria-label={`${total.toFixed(0)}% of the prize pool allocated`}>
                {placements.map((p, i) => (
                    <div
                        key={p.position}
                        className={cn('h-full border-r border-background last:border-r-0', over ? 'bg-red-500/70' : SHADES[i] ?? SHADES[SHADES.length - 1])}
                        style={{ width: `${Math.min(100, Math.max(0, p.percentage)) * (over ? 100 / total : 1)}%` }}
                        title={`${p.label}: ${p.percentage}%`}
                    />
                ))}
            </div>
            <p className={cn('flex justify-between text-xs tabular-nums', over ? 'text-red-300' : 'text-zinc-500')}>
                <span>{over ? `${(total - 100).toFixed(1)}% over — lower a share to fit` : `${total.toFixed(0)}% allocated`}</span>
                {!over && prizePool > 0 && remaining > 0 && (
                    <span>{formatCurrency((remaining / 100) * prizePool, currency)} unassigned</span>
                )}
                {!over && total === 100 && <span className="text-emerald-300">Fully allocated</span>}
            </p>
        </div>
    );
}
