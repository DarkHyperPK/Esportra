import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChoiceCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  /** Small facts under the description: stage count, time estimate, etc. */
  meta?: ReactNode;
  /** Corner tag such as "Recommended". Use at most one per group. */
  badge?: string;
  disabled?: boolean;
  /** "row" puts the icon beside the text (compact); "stack" puts it on top (feature cards). */
  layout?: 'row' | 'stack';
  /** "radio" (default) for picking a value; "action" when clicking navigates somewhere. */
  mode?: 'radio' | 'action';
  className?: string;
}

/**
 * One option in a ChoiceGroup. Selected = rose outline + faint rose fill + a
 * check in the corner, so the choice is readable without relying on colour.
 */
export function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  meta,
  badge,
  disabled = false,
  layout = 'row',
  mode = 'radio',
  className,
}: ChoiceCardProps) {
  const isRadio = mode === 'radio';

  return (
    <button
      type="button"
      role={isRadio ? 'radio' : undefined}
      aria-checked={isRadio ? selected : undefined}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'group relative flex w-full text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        layout === 'row' ? 'items-start gap-3 p-4' : 'flex-col gap-4 p-6',
        selected
          ? 'bg-rose-500/[0.07] shadow-[inset_0_0_0_1px_rgba(244,63,94,0.7)]'
          : 'bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.04] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]',
        className,
      )}
    >
      {icon && (
        <span className={cn('shrink-0 transition-colors', selected ? 'text-rose-300' : 'text-zinc-500 group-hover:text-zinc-300')}>
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('block font-semibold text-white', layout === 'stack' ? 'font-heading text-xl' : 'text-sm')}>
          {title}
        </span>
        {description && (
          <span className={cn('mt-1 block leading-relaxed text-zinc-400', layout === 'stack' ? 'text-sm' : 'text-xs')}>
            {description}
          </span>
        )}
        {meta && <span className="mt-3 block">{meta}</span>}
      </span>
      {badge && (
        <span className="absolute right-3 top-3 bg-rose-500 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white">
          {badge}
        </span>
      )}
      {selected && !badge && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center bg-rose-500 text-white" aria-hidden>
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}
