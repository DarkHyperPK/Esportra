import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepProgressItem {
  id: number;
  title: string;
}

interface StepProgressProps {
  steps: StepProgressItem[];
  current: number;
  /** Steps whose required fields are filled. */
  completed: Record<number, boolean>;
  onStepClick: (id: number) => void;
}

/**
 * Wizard progress. Desktop: numbered squares joined by a line that fills in
 * rose as you go. Mobile: "Step 2 of 7 · Format" plus a segmented bar.
 * Only visited or completed steps are clickable.
 */
export function StepProgress({ steps, current, completed, onStepClick }: StepProgressProps) {
  const currentStep = steps.find((step) => step.id === current);

  return (
    <nav aria-label="Setup steps">
      <ol className="hidden items-start md:flex">
        {steps.map((step, index) => {
          const isCurrent = step.id === current;
          const isDone = !isCurrent && (completed[step.id] || step.id < current);
          const canClick = step.id <= current || completed[step.id];
          return (
            <li key={step.id} className="flex flex-1 items-start last:flex-none">
              <button
                type="button"
                disabled={!canClick}
                onClick={() => onStepClick(step.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className="group flex flex-col items-start gap-2 text-left disabled:cursor-not-allowed focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center font-mono text-xs font-bold transition-colors',
                    isCurrent && 'bg-rose-500 text-white',
                    isDone && 'bg-white/10 text-rose-300 group-hover:bg-white/15',
                    !isCurrent && !isDone && 'text-zinc-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]',
                    'group-focus-visible:ring-2 group-focus-visible:ring-white/40',
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" aria-hidden /> : step.id}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-xs',
                    isCurrent ? 'font-semibold text-white' : isDone ? 'text-zinc-400 group-hover:text-white' : 'text-zinc-600',
                  )}
                >
                  {step.title}
                </span>
              </button>
              {index < steps.length - 1 && (
                <span aria-hidden className={cn('mx-3 mt-3.5 h-px flex-1', step.id < current ? 'bg-rose-500/60' : 'bg-white/10')} />
              )}
            </li>
          );
        })}
      </ol>

      <div className="md:hidden">
        <p className="mb-2 text-sm text-zinc-400">
          Step {current} of {steps.length} · <span className="font-semibold text-white">{currentStep?.title}</span>
        </p>
        <div className="flex gap-1" aria-hidden>
          {steps.map((step) => (
            <span key={step.id} className={cn('h-1 flex-1', step.id <= current ? 'bg-rose-500' : 'bg-white/10')} />
          ))}
        </div>
      </div>
    </nav>
  );
}
