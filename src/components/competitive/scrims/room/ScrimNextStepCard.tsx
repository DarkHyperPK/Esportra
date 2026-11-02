/**
 * ScrimNextStepCard
 *
 * The one thing my team should do right now, with its deadline. The button
 * scrolls to the panel where the action happens; there is no second CTA.
 */

import { ArrowDown } from 'lucide-react';
import { Countdown } from '@/components/ui/Countdown';
import { EYEBROW_CLASS } from '@/components/ui/kit';
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
        'relative flex flex-col gap-4 border bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:p-5',
        view.urgent ? 'border-white/[0.16]' : 'border-white/[0.08]',
        className,
      )}
    >
      {view.urgent && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-rose-500" />}

      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn(EYEBROW_CLASS, 'flex items-center gap-2')}>
          {view.urgent && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
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
            className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-white px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-black transition-colors hover:bg-rose-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]"
          >
            Go
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
