import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChoiceGroupProps {
  label: string;
  /** Grid columns at desktop width; mobile always stacks to one or two. */
  columns?: 1 | 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}

const COLUMN_CLASS: Record<NonNullable<ChoiceGroupProps['columns']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
};

/** Radio group of ChoiceCards. The label is read by screen readers; show a visible one with Field or FormSection. */
export function ChoiceGroup({ label, columns = 2, children, className }: ChoiceGroupProps) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-2', COLUMN_CLASS[columns], className)}>
      {children}
    </div>
  );
}
