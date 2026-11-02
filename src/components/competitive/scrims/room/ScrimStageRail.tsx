/**
 * ScrimStageRail
 *
 * Read-only progress tracker for a scrim: Scheduled → Check-in → Live → Result → Done.
 * Position comes from railState(). Nodes are solid shapes with full-contrast labels and 2px
 * connectors, so nothing depends on hairlines or faint text.
 */

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROOM_STEPS, railState } from '@/services/scrimRoomView';
import type { ScrimStage } from '@/services/scrimNextAction';

interface ScrimStageRailProps {
  stage: ScrimStage;
  className?: string;
}

const NODE = 'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-[13px] font-bold tabular-nums';

export function ScrimStageRail({ stage, className }: ScrimStageRailProps) {
  const { current, variant } = railState(stage);
  const stopped = variant === 'cancelled';

  return (
    <nav aria-label="Scrim progress" className={className}>
      <ol className="grid grid-cols-5">
        {ROOM_STEPS.map((step, index) => {
          const isCurrent = !stopped && index === current;
          const isDone = !stopped && index < current;
          const isAlert = isCurrent && variant === 'disputed';
          // A connector is lit when the step on its left has been reached.
          const leftLit = !stopped && index <= current;
          const rightLit = !stopped && index < current;
          return (
            <li key={step.key} aria-current={isCurrent ? 'step' : undefined} className="relative flex flex-col items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className={cn('absolute left-0 right-1/2 top-[15px] h-0.5', leftLit ? 'bg-emerald-400/70' : 'bg-white/15')} />
              )}
              {index < ROOM_STEPS.length - 1 && (
                <span aria-hidden="true" className={cn('absolute left-1/2 right-0 top-[15px] h-0.5', rightLit ? 'bg-emerald-400/70' : 'bg-white/15')} />
              )}
              <span
                className={cn(
                  NODE,
                  isDone && 'border-emerald-400/70 bg-emerald-400/15 text-emerald-300',
                  isCurrent && !isAlert && 'border-white bg-white text-black ring-4 ring-white/15',
                  isAlert && 'border-amber-300 bg-amber-300 text-black ring-4 ring-amber-300/20',
                  !isDone && !isCurrent && 'border-white/20 bg-[#0c0c0f] text-zinc-400',
                )}
              >
                {isDone ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : stopped && index === 0 ? <X className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn('text-center text-[13px] leading-tight', isCurrent ? 'font-semibold text-white' : isDone ? 'font-medium text-zinc-200' : 'font-medium text-zinc-400')}>
                {isAlert ? 'Disputed' : step.label}
              </span>
            </li>
          );
        })}
      </ol>
      {stopped && <p className="mt-3 text-center text-[13px] font-medium text-zinc-400">This scrim was cancelled.</p>}
    </nav>
  );
}
