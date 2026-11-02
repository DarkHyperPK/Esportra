/**
 * ScrimStageRail
 *
 * Read-only progress tracker for a scrim: Scheduled → Check-in → Live → Result → Done.
 * Position comes from railState(); the connecting line fills to the active step.
 */

import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ROOM_STEPS, railState } from '@/services/scrimRoomView';
import type { ScrimStage } from '@/services/scrimNextAction';

interface ScrimStageRailProps {
  stage: ScrimStage;
  className?: string;
}

export function ScrimStageRail({ stage, className }: ScrimStageRailProps) {
  const reduce = useReducedMotion();
  const { current, variant } = railState(stage);
  const stopped = variant === 'cancelled';
  const lastIndex = ROOM_STEPS.length - 1;
  // Fill reaches the active step's centre; a finished scrim fills the whole line.
  const fill = stopped ? 0 : Math.min(Math.max(current, 0), lastIndex) / lastIndex;

  return (
    <nav aria-label="Scrim progress" className={className}>
      <div className="relative">
        <div aria-hidden="true" className="absolute left-[10%] right-[10%] top-[13px] h-px bg-white/[0.1]" />
        <motion.div
          aria-hidden="true"
          className="absolute left-[10%] top-[13px] h-px w-[80%] origin-left bg-white/60"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: fill }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        <ol className="relative grid grid-cols-5">
          {ROOM_STEPS.map((step, index) => {
            const isCurrent = index === current;
            const isDone = !stopped && index < current;
            const isAlert = isCurrent && variant === 'disputed';
            return (
              <li
                key={step.key}
                aria-current={isCurrent ? 'step' : undefined}
                className="flex flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    'flex h-[27px] w-[27px] items-center justify-center border bg-[#08080a] font-mono text-[11px] font-bold',
                    isDone && 'border-white/30 text-white',
                    isCurrent && !isAlert && 'border-white bg-white text-black',
                    isAlert && 'border-amber-400/60 bg-amber-400/15 text-amber-200',
                    !isDone && !isCurrent && 'border-white/10 text-zinc-600',
                    stopped && 'border-white/10 text-zinc-700',
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-center text-[11px] font-medium sm:text-[10px]',
                    isCurrent ? 'font-semibold text-white' : isDone ? 'text-zinc-400' : 'text-zinc-600',
                  )}
                >
                  {isAlert ? 'Disputed' : step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {stopped && (
        <p className="mt-3 text-center text-[11px] font-medium text-zinc-500">
          Cancelled
        </p>
      )}
    </nav>
  );
}
