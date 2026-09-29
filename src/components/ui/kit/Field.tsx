import type { ReactNode } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fieldErrorId, fieldHintId } from './fieldIds';
import { HINT_CLASS, LABEL_CLASS } from './tone';

interface FieldProps {
  label: string;
  /** Id of the control; wires the label and the hint/error for screen readers. */
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  /** Marks the field "Optional" — required is the default and carries no mark. */
  optional?: boolean;
  /** Shows a lock and explains the field can no longer change. */
  lockedReason?: string;
  /** Amber dot: a pre-filled value worth a second look. */
  review?: boolean;
  children: ReactNode;
  className?: string;
}


/**
 * Label, control, then either the error (what to do) or the hint (why it
 * matters). Never both: an error replaces the hint so the field stays calm.
 */
export function Field({ label, htmlFor, hint, error, optional, lockedReason, review, children, className }: FieldProps) {
  const message = error ?? lockedReason ?? hint;
  const messageId = htmlFor ? (error ? fieldErrorId(htmlFor) : fieldHintId(htmlFor)) : undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <label htmlFor={htmlFor} className={LABEL_CLASS}>{label}</label>
        {optional && <span className="text-xs text-zinc-600">Optional</span>}
        {review && !error && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Pre-filled — worth a second look" aria-label="Worth a second look" />
        )}
        {lockedReason && <Lock className="h-3 w-3 text-zinc-500" aria-hidden />}
      </div>
      {children}
      {message && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn(error ? 'flex items-start gap-1.5 text-xs text-red-300' : HINT_CLASS)}
        >
          {error && <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />}
          {message}
        </p>
      )}
    </div>
  );
}
