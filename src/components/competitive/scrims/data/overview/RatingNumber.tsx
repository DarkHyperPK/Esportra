import { cn } from '@/lib/utils';
import type { Rating } from '@/schemas/scrimReport';
import { ratingBreakdown, ratingChange } from '@/services/scrimInsights/rating';

/** The rating in big type, with its change against the window before when there is one. */
export function RatingNumber({ rating, size = 'lg', label = 'Esportra rating' }: { rating: Rating | undefined; size?: 'lg' | 'md'; label?: string }) {
  const value = rating?.value;
  const change = rating?.change;
  return (
    <div title={rating && value != null ? ratingBreakdown(rating) : 'Not enough maps for a rating yet.'} aria-label={value == null ? `${label}: not enough maps` : `${label} ${Math.round(value)}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={cn('font-heading font-black leading-none tabular-nums tracking-tight text-white', size === 'lg' ? 'text-[56px] sm:text-[72px]' : 'text-[34px]')}>
          {value == null ? '—' : Math.round(value)}
        </span>
        {change != null && change !== 0 && (
          <span className={cn('font-mono text-[12px] font-bold tabular-nums', change > 0 ? 'text-emerald-300' : 'text-rose-400')}>
            {change > 0 ? '▲' : '▼'} {ratingChange(change)}
          </span>
        )}
      </div>
    </div>
  );
}
