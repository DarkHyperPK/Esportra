import { cn } from '@/lib/utils';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
    label: string;
    value: T;
    options: Option<T>[];
    onChange: (value: T) => void;
    className?: string;
};

/** A row of square segments for a short, exclusive choice (format, best of, size). */
export function SegmentedChoice<T extends string>({ label, value, options, onChange, className }: Props<T>) {
    return (
        <div role="radiogroup" aria-label={label} className={cn('grid gap-px bg-white/[0.08] p-px', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'h-10 truncate px-2 text-[13px] font-medium transition-colors focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                            active ? 'bg-white text-zinc-950' : 'bg-[#0d0d10] text-zinc-400 hover:bg-white/[0.04] hover:text-white',
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

export default SegmentedChoice;
