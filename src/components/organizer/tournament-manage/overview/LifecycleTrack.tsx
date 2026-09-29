import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LifecycleStep } from '@/services/tournamentDashboard/lifecycle';

interface LifecycleTrackProps {
  steps: LifecycleStep[];
}

/** Where the event is now and what comes next — read left to right. */
export function LifecycleTrack({ steps }: LifecycleTrackProps) {
  return (
    <ol aria-label="Tournament lifecycle" className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, index) => (
        <li key={step.id} className="relative pr-2" aria-current={step.state === 'current' ? 'step' : undefined}>
          <div className="flex items-center">
            <span
              className={cn(
                'relative z-10 flex h-5 w-5 shrink-0 items-center justify-center border',
                step.state === 'done' && 'border-rose-500 bg-rose-500 text-white',
                step.state === 'current' && 'border-rose-400 bg-background ring-4 ring-rose-500/15',
                step.state === 'upcoming' && 'border-white/15 bg-background',
              )}
            >
              {step.state === 'done' && <Check className="h-3 w-3" aria-hidden />}
              {step.state === 'current' && <span className="h-1.5 w-1.5 bg-rose-400" />}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn('ml-2 h-px flex-1', step.state === 'done' ? 'bg-rose-500/70' : 'bg-white/10')}
              />
            )}
          </div>
          <p
            className={cn(
              'mt-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em]',
              step.state === 'current' ? 'font-semibold text-white' : 'hidden sm:block',
              step.state === 'done' && 'text-zinc-400',
              step.state === 'upcoming' && 'text-zinc-500',
            )}
          >
            {step.label}
          </p>
        </li>
      ))}
    </ol>
  );
}
