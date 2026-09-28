/**
 * CompletionBadge.tsx
 *
 * Badge showing completion state for configuration panels.
 * Red = required fields missing (hard block)
 * Amber = recommended fields missing (soft warning)
 * Green = all fields complete (checkmark)
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompletionBadgeProps {
  requiredMissing: number;
  recommendedMissing: number;
  isPublished: boolean;
}

export function CompletionBadge({
  requiredMissing,
  recommendedMissing,
  isPublished,
}: CompletionBadgeProps) {
  // Hide badges entirely once tournament is published
  if (isPublished) {
    return null;
  }

  // Red badge: required fields missing
  if (requiredMissing > 0) {
    return (
      <span
        className={cn(
          'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold leading-none text-white'
        )}
        aria-label={`${requiredMissing} required fields incomplete`}
      >
        {requiredMissing > 1 ? requiredMissing : ''}
      </span>
    );
  }

  // Amber badge: recommended fields missing
  if (recommendedMissing > 0) {
    return (
      <span
        className={cn(
          'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold leading-none text-black'
        )}
        aria-label={`${recommendedMissing} recommended fields incomplete`}
      >
        {recommendedMissing > 1 ? recommendedMissing : ''}
      </span>
    );
  }

  // Green badge: all complete
  return (
    <span
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white'
      )}
      aria-label="All fields complete"
    >
      <Check className="h-2.5 w-2.5" />
    </span>
  );
}
