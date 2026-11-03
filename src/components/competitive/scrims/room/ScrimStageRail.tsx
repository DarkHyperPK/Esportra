/**
 * ScrimStageRail
 *
 * Where the scrim is: Scheduled → Check-in → Live → Result → Done, as one segmented bar under the header.
 * Done segments are white, the current one rose (amber when disputed), the rest dark. Position comes from railState().
 */

import { cn } from '@/lib/utils';
import { ROOM_STEPS, railState } from '@/services/scrimRoomView';
import type { ScrimStage } from '@/services/scrimNextAction';

interface ScrimStageRailProps {
  stage: ScrimStage;
  className?: string;
}

export function ScrimStageRail({ stage, className }: ScrimStageRailProps) {
  const { current, variant } = railState(stage);
  const stopped = variant === 'cancelled';

  return (
    <nav aria-label="Scrim progress" className={className}>
      <ol className="grid grid-cols-5 gap-1">
        {ROOM_STEPS.map((step, index) => {
          const isCurrent = !stopped && index === current;
          const isDone = !stopped && index < current;
          const isAlert = isCurrent && variant === 'disputed';
          return (
            <li key={step.key} aria-current={isCurrent ? 'step' : undefined} className="min-w-0">
              <span aria-hidden="true" className={cn('block h-1', isAlert ? 'bg-amber-300' : isCurrent ? 'bg-rose-500' : isDone ? 'bg-white/70' : 'bg-white/10')} />
              <span className={cn('mt-2 flex items-baseline gap-1.5 truncate font-mono text-[11px] uppercase tracking-[0.14em]',
                isCurrent ? 'font-bold text-white' : isDone ? 'text-white/60' : 'text-white/30')}>
                <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                <span className="truncate">{isAlert ? 'Disputed' : step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {stopped && <p className="mt-3 text-[13px] font-medium text-zinc-400">This scrim was cancelled.</p>}
    </nav>
  );
}
