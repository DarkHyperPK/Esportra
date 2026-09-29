import { CommandSegmentedButton } from '@/components/management/CommandSurface';
import { cn } from '@/lib/utils';

export interface NotificationFilterOption {
  value: string;
  label: string;
  count?: number;
}

interface NotificationFiltersProps {
  options: NotificationFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Segmented filter. The active chip is white; rose stays reserved for unread. */
export function NotificationFilters({ options, value, onChange, className }: NotificationFiltersProps) {
  return (
    <div role="radiogroup" aria-label="Filter notifications" className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <CommandSegmentedButton
            key={o.value}
            role="radio"
            aria-checked={active}
            active={active}
            onClick={() => onChange(o.value)}
            className={active ? 'bg-white text-matte-black' : undefined}
          >
            {o.label}
            {o.count != null && o.count > 0 && (
              <span className="tabular-nums text-zinc-500">{o.count}</span>
            )}
          </CommandSegmentedButton>
        );
      })}
    </div>
  );
}
