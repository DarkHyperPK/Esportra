import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { HINT_CLASS } from './tone';

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  /** Right side of the section header, e.g. a lock note or a count. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Groups related fields under one plain-language question. Sections are
 * separated by a hairline and generous space; fields inside sit closer, so
 * the eye reads "one topic, then the next".
 */
export function FormSection({ title, description, aside, children, className }: FormSectionProps) {
  return (
    <section className={cn('border-t border-white/[0.07] py-8 first:border-t-0 first:pt-0', className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-white">{title}</h2>
          {description && <p className={cn(HINT_CLASS, 'mt-1 max-w-xl text-[13px]')}>{description}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
