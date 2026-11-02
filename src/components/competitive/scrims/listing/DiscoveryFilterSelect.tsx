
import { SCRIM_LABEL } from '../scrimCardStyles';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NONE = '_';

export interface FilterOption {
  value: string;
  label: string;
  iconUrl?: string | null;
}

interface DiscoveryFilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder: string;
  /** When false there is no "any" choice (e.g. the game). */
  allowAny?: boolean;
}

/** A labelled select with optional option icons; "" means no filter. */
export function DiscoveryFilterSelect({ label, value, onChange, options, placeholder, allowAny = true }: DiscoveryFilterSelectProps) {
  const selected = options.find((o) => o.value === value);
  return (
    <div className="flex min-w-[140px] flex-col gap-1.5">
      <p className={SCRIM_LABEL}>{label}</p>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
        <SelectTrigger aria-label={label} className="h-10 rounded-lg border-white/10 bg-black/30 text-[13px]">
          {selected?.iconUrl ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <img src={selected.iconUrl} alt="" className="h-4 w-4 shrink-0 object-contain" />
              <span className="truncate">{selected.label}</span>
            </span>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {allowAny && <SelectItem value={NONE}>{placeholder}</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.iconUrl ? (
                <span className="flex items-center gap-2">
                  <img src={o.iconUrl} alt="" className="h-4 w-4 shrink-0 object-contain" />
                  {o.label}
                </span>
              ) : o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
