import { formatPreferredDays } from '@/services/scrimUtils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import type { ScrimOffer } from '@/types/competitive';

interface AcceptTimePickerProps {
  offer: ScrimOffer;
  /** Local "YYYY-MM-DDTHH:mm" value for the datetime-local input. */
  value: string;
  onChange: (value: string) => void;
}

/** Confirm-time step shown while accepting an offer, with the listing's availability for context. */
export function AcceptTimePicker({ offer, value, onChange }: AcceptTimePickerProps) {
  const days = offer.listingPreferredDays ?? [];
  const hasWindow = !!(offer.listingPreferredTimeStart && offer.listingPreferredTimeEnd);

  return (
    <div className="space-y-2 border border-white/[0.08] bg-black/30 p-3">
      {(days.length > 0 || hasWindow) && (
        <div className="space-y-1">
          <p className={EYEBROW_CLASS}>Your availability</p>
          <div className="flex flex-wrap gap-1.5">
            {days.length > 0 && (
              <span className="bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/55">
                {formatPreferredDays(days).join(' / ')}
              </span>
            )}
            {hasWindow && (
              <span className="bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/55">
                {offer.listingPreferredTimeStart} – {offer.listingPreferredTimeEnd}
                {offer.listingTimezone ? ` (${offer.listingTimezone})` : ''}
              </span>
            )}
          </div>
        </div>
      )}
      <label className="block space-y-1">
        <span className={EYEBROW_CLASS}>Confirm time</span>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white [color-scheme:dark] focus:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        />
      </label>
    </div>
  );
}
