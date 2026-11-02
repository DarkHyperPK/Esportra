import { useListingOffers } from '@/hooks/competitive/useScrims';
import type { ScrimListing } from '@/types/competitive';

export function RecurringSlots({ listing }: { listing: ScrimListing }) {
  const offersQuery = useListingOffers(listing.id);
  const accepted = (offersQuery.data ?? []).filter((o) => o.status === 'accepted');

  const untilDate = listing.scheduleUntil
    ? new Date(listing.scheduleUntil).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
      {accepted.length > 0 ? (
        accepted.map((offer) => (
          <p key={offer.id} className="text-[12px] text-white/50">
            {offer.proposedAt
              ? new Date(offer.proposedAt).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : offer.offeringTeamName ?? offer.offeringTeamId.slice(0, 8)}
          </p>
        ))
      ) : (
        <p className="text-[12px] text-white/30">No slots booked yet</p>
      )}
      {untilDate && (
        <p className="text-[12px] text-white/25">Accepting bookings until {untilDate}</p>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
