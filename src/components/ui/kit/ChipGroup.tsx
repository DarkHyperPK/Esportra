import { cn } from '@/lib/utils';

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string | number> {
  label: string;
  options: ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Small, fast choices with short labels (team counts, modes, best-of).
 * Selected chip inverts to white: stronger than the rose card outline
 * because chips are small and sit in dense rows.
 */
export function ChipGroup<T extends string | number>({ label, options, value, onChange, className }: ChipGroupProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 min-w-12 px-4 font-mono text-sm font-bold tabular-nums transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              selected
                ? 'bg-white text-matte-black'
                : 'bg-white/[0.03] text-zinc-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-white/[0.06] hover:text-white',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
