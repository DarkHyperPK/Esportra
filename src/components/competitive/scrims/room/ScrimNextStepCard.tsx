/**
 * ScrimNextStepCard
 *
 * The one thing my team should do right now, with its deadline. The button
 * scrolls to the panel where the action happens; there is no second CTA.
 */

import { SCRIM_LABEL } from '../scrimCardStyles';
import { ArrowDown } from 'lucide-react';
import { Countdown } from '@/components/ui/Countdown';

import { cn } from '@/lib/utils';
import type { NextStepView } from '@/services/scrimRoomView';

interface ScrimNextStepCardProps {
  view: NextStepView;
  /** ISO time to count down to, shown only while the step is urgent. */
  deadline: string | null;
  onDeadlinePassed?: () => void;
  onGo: (targetId: string) => void;
  className?: string;
}

export function ScrimNextStepCard({ view, deadline, onDeadlinePassed, onGo, className }: ScrimNextStepCardProps) {
  const { target } = view;
  return (
    <section
      aria-label="Next step"
      className={cn(
        'relative flex flex-col gap-4 border border-l-2 bg-[#0a0a0c] p-4 sm:flex-row sm:items-center sm:p-5',
        view.urgent ? 'border-white/[0.12] border-l-amber-400' : 'border-white/[0.08] border-l-rose-500',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn(SCRIM_LABEL, 'flex items-center gap-2')}>
                    Next step
        </p>
        <h2 className="font-heading text-[18px] font-bold leading-tight text-white">{view.headline}</h2>
        <p className="text-[13px] leading-snug text-zinc-400">{view.body}</p>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {view.urgent && deadline && (
          <Countdown targetDate={deadline} onComplete={onDeadlinePassed} className="text-[14px] text-white/80" />
        )}
        {target && (
          <button
            type="button"
            onClick={() => onGo(target)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-white px-5 text-[13px] font-semibold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]"
          >
            Go
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
