/**
 * SlotPicker
 *
 * Open times on a recurring listing, grouped by day. Picking one carries it
 * into the request; leaving it empty still allows a free-form request.
 */

import { SCRIM_LABEL } from '../scrimCardStyles';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatSlotTime, groupSlotsByDay, slotCounts } from '@/services/scrimSlots';
import type { ScrimSlot } from '@/types/competitive';

interface SlotPickerProps {
  slots: ScrimSlot[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function SlotPicker({ slots, selectedId, onSelect }: SlotPickerProps) {
  if (slots.length === 0) return null;
  const { open, total } = slotCounts(slots);

  return (
    <section className="space-y-2" aria-labelledby="slot-picker-title">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="slot-picker-title" className={SCRIM_LABEL}>Pick a time</h3>
        <span className="text-[11px] tabular-nums text-zinc-500">{open} of {total} open</span>
      </div>
      <div className="space-y-2.5">
        {groupSlotsByDay(slots).map((day) => (
          <div key={day.key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="mb-2 text-[11px] font-medium text-zinc-500">{day.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {day.slots.map((slot) => {
                const booked = slot.status !== 'available';
                const selected = slot.id === selectedId;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={booked}
                    aria-pressed={selected}
                    onClick={() => onSelect(selected ? null : slot.id)}
                    className={cn(
                      'inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                      booked && 'cursor-not-allowed border-white/[0.04] text-white/20 line-through',
                      !booked && selected && 'border-white bg-white text-black',
                      !booked && !selected && 'border-white/[0.1] text-white/75 hover:border-white/30 hover:text-white',
                    )}
                  >
                    {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                    {formatSlotTime(slot)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
