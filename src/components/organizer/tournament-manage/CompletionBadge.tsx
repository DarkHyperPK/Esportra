import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionBadgeProps {
  requiredMissing: number;
  recommendedMissing: number;
  isPublished: boolean;
}

/** Setup status for a configuration panel while the tournament is a draft. */
export function CompletionBadge({ requiredMissing, recommendedMissing, isPublished }: CompletionBadgeProps) {
  if (isPublished) return null;

  if (requiredMissing > 0) {
    return (
      <span
        className="inline-flex h-4 min-w-4 items-center justify-center bg-red-500 px-1 font-mono text-[10px] font-bold leading-none text-white"
        aria-label={`${requiredMissing} required fields incomplete`}
      >
        {requiredMissing}
      </span>
    );
  }

  if (recommendedMissing > 0) {
    return (
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
        aria-label={`${recommendedMissing} recommended fields incomplete`}
      />
    );
  }

  return (
    <span className={cn('inline-flex h-4 w-4 items-center justify-center text-emerald-400')} aria-label="All fields complete">
      <Check className="h-3.5 w-3.5" aria-hidden />
    </span>
  );
}
