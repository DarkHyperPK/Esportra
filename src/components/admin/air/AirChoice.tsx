import { cn } from '@/lib/utils';

export function AirChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-none border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
            value === o.value ? 'border-white bg-white/[0.06] text-white' : 'border-white/10 text-zinc-400 hover:border-white/25 hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
