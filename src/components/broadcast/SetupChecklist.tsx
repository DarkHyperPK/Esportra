import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { CommandButton } from '@/components/management/CommandSurface';
import type { SetupStep } from '@/types/broadcast';

export interface StepRowProps {
  step: SetupStep;
  isComplete: boolean;
  reduceMotion?: boolean;
  /** Called when the CTA action is 'sync' */
  onSync?: () => void;
}

export function StepRow({ step, isComplete, reduceMotion = false, onSync }: StepRowProps) {
  return (
    <div className="flex items-start gap-4 border-b border-white/[0.05] py-4 last:border-0">
      {/* Completion icon */}
      <div className="mt-0.5 shrink-0">
        <AnimatePresence initial={false} mode="wait">
          {isComplete ? (
            <motion.div
              key="done"
              initial={reduceMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0.1 }
                  : { type: 'spring', stiffness: 420, damping: 34 }
              }
              className="flex h-6 w-6 items-center justify-center border border-emerald-500/30 bg-emerald-500/20"
            >
              <CheckCircle className="h-3.5 w-3.5 text-emerald-300" />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-6 w-6 border border-white/10 bg-white/[0.03]"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1">
        <p
          className={cn(
            'text-sm font-semibold',
            isComplete ? 'text-zinc-400' : 'text-white',
          )}
        >
          {step.title}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">
          {step.description}
        </p>
      </div>

      {/* CTA */}
      <div className="shrink-0">
        {isComplete ? (
          <span
            className="font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-400"
            aria-hidden
          >
            Done ✓
          </span>
        ) : step.ctaAction === 'sync' && onSync ? (
          <CommandButton
            variant="ghost"
            size="sm"
            onClick={onSync}
            aria-label={`${step.title}: ${step.cta}`}
          >
            {step.cta}
          </CommandButton>
        ) : (
          <CommandButton
            variant="ghost"
            size="sm"
            asChild
          >
            <Link to={step.ctaHref} aria-label={`${step.title}: ${step.cta}`}>
              {step.cta}
            </Link>
          </CommandButton>
        )}
      </div>
    </div>
  );
}

export interface SetupChecklistProps {
  steps: SetupStep[];
  completion: boolean[];
  reduceMotion?: boolean;
  onSync?: () => void;
}

export function SetupChecklist({ steps, completion, reduceMotion = false, onSync }: SetupChecklistProps) {
  const required = steps.filter((s) => s.required);
  const optional = steps.filter((s) => !s.required);

  return (
    <div>
      <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
        Required
      </p>
      {required.map((step) => (
        <StepRow
          key={step.id}
          step={step}
          isComplete={completion[steps.indexOf(step)] ?? false}
          reduceMotion={reduceMotion}
          onSync={step.ctaAction === 'sync' ? onSync : undefined}
        />
      ))}

      {optional.length > 0 && (
        <>
          <p className="mb-3 mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Optional
          </p>
          {optional.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              isComplete={completion[steps.indexOf(step)] ?? false}
              reduceMotion={reduceMotion}
              onSync={step.ctaAction === 'sync' ? onSync : undefined}
            />
          ))}
        </>
      )}
    </div>
  );
}
