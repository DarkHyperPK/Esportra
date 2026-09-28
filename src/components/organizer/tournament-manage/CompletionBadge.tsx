import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CompletionBadgeProps {
  requiredMissing: number;
  recommendedMissing: number;
  isPublished: boolean;
  /** Stagger delay in seconds for entrance animation */
  delay?: number;
}

const badgeEntrance = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1, transition: { delay, duration: 0.15, ease: [0, 0, 0.2, 1] } },
});

const greenPulse = {
  initial: { opacity: 0, scale: 0.6 },
  animate: {
    opacity: 1,
    scale: [0.6, 1.15, 1.0],
    transition: {
      opacity: { duration: 0.1 },
      scale: { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] },
    },
  },
};

export function CompletionBadge({
  requiredMissing,
  recommendedMissing,
  isPublished,
  delay = 0,
}: CompletionBadgeProps) {
  if (isPublished) return null;

  if (requiredMissing > 0) {
    return (
      <motion.span
        key="red"
        {...badgeEntrance(delay)}
        className={cn(
          'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold leading-none text-white'
        )}
        aria-label={`${requiredMissing} required fields incomplete`}
      >
        {requiredMissing > 1 ? requiredMissing : ''}
      </motion.span>
    );
  }

  if (recommendedMissing > 0) {
    return (
      <motion.span
        key="amber"
        {...badgeEntrance(delay)}
        className={cn(
          'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold leading-none text-black'
        )}
        aria-label={`${recommendedMissing} recommended fields incomplete`}
      >
        {recommendedMissing > 1 ? recommendedMissing : ''}
      </motion.span>
    );
  }

  return (
    <motion.span
      key="green"
      {...greenPulse}
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white'
      )}
      aria-label="All fields complete"
    >
      <Check className="h-2.5 w-2.5" />
    </motion.span>
  );
}
