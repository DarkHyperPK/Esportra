import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from './tone';

interface PageIntroProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned slot for context (a badge, a game mark, a step count). */
  aside?: ReactNode;
  className?: string;
}

/**
 * The top of a flow screen: one eyebrow for context, one display title that
 * names the job, one sentence that sets expectations.
 */
export function PageIntro({ eyebrow, title, description, aside, className }: PageIntroProps) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className={cn(EYEBROW_CLASS, 'mb-3')}>{eyebrow}</p>}
        <h1 className="font-heading text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description && <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  );
}
