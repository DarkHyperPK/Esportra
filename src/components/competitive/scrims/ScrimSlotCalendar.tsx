/**
 * ScrimSlotCalendar — PROJ-078 Surface 3 (CL-007-S3)
 *
 * Direction: Broadcast (lead), L1.
 * Archetype: Scoreboard — date-grouped slot rows.
 * Hero: selected slot (rose 2px left-border on selection).
 * UX risk 4 (tap targets): min-h-[44px] on every slot row — explicit.
 * States: S3-0 through S3-9 per direction contract.
 * Only renders for scheduleType === 'recurring'.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { InlineNotice, ActionBar, EYEBROW_CLASS } from '@/components/ui/kit';
import { useScrimSlots, useBookScrimSlot } from '@/hooks/competitive/useScrims';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { ApiError } from '@/lib/apiClient';
import type { ScrimListing, ScrimSlot } from '@/types/competitive';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScrimSlotCalendarProps {
  listing: ScrimListing;
  onSlotSelected: (slot: ScrimSlot) => void;
}

interface DateGroup {
  dateKey: string;
  dateLabel: string;
  slots: ScrimSlot[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSlotDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
}

function formatSlotTimeRange(startsAt: string, endsAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}

function groupSlotsByDate(slots: ScrimSlot[]): DateGroup[] {
  const map = new Map<string, { dateLabel: string; slots: ScrimSlot[] }>();
  for (const slot of slots) {
    const d = new Date(slot.startsAt);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const dateLabel = formatSlotDateLabel(slot.startsAt);
    if (!map.has(dateKey)) map.set(dateKey, { dateLabel, slots: [] });
    map.get(dateKey)!.slots.push(slot);
  }
  return Array.from(map.entries()).map(([dateKey, { dateLabel, slots }]) => ({
    dateKey,
    dateLabel,
    slots,
  }));
}

// ── ScrimSlotCalendar ─────────────────────────────────────────────────────────

export function ScrimSlotCalendar({ listing, onSlotSelected }: ScrimSlotCalendarProps) {
  const reduce = useReducedMotion();
  const slotsQuery = useScrimSlots(listing.id, listing.scheduleType === 'recurring');
  const bookMutation = useBookScrimSlot(listing.id);
  const teamsQuery = useMyTeamsSummary();

  const [selectedSlot, setSelectedSlot] = useState<ScrimSlot | null>(null);
  const [raceError, setRaceError] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const myTeams = (teamsQuery.data ?? []) as { id: string; name: string; gameSlug?: string | null }[];
  const myTeam = listing.gameSlug
    ? (myTeams.find((t) => t.gameSlug === listing.gameSlug) ?? myTeams[0])
    : myTeams[0];

  const slots = slotsQuery.data ?? [];
  const availableSlots = slots.filter((s) => s.status === 'available');
  const dateGroups = useMemo(
    () => groupSlotsByDate((slotsQuery.data ?? []).filter((s) => s.status !== 'cancelled')),
    [slotsQuery.data],
  );

  const fadeIn = reduce
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.18, ease: 'easeOut' } };

  // Only render for recurring listings
  if (listing.scheduleType !== 'recurring') return null;

  // S3-2: No availability set
  const hasAvailabilitySet = listing.preferredDays !== null && listing.preferredDays.length > 0;
  if (!slotsQuery.isLoading && !slotsQuery.isError && slots.length === 0 && !hasAvailabilitySet) {
    return (
      <motion.section aria-labelledby="avail-title" {...fadeIn}>
        <p id="avail-title" className={EYEBROW_CLASS}>AVAILABILITY</p>
        <div className="mt-3">
          <InlineNotice tone="neutral">This team hasn&apos;t set their availability yet.</InlineNotice>
        </div>
      </motion.section>
    );
  }

  async function handleConfirmBooking() {
    if (!selectedSlot || !myTeam) return;
    setRaceError(false);
    try {
      await bookMutation.mutateAsync({
        offeringTeamId: myTeam.id,
        slotId: selectedSlot.id,
        proposedAt: selectedSlot.startsAt,
        proposedDurationMinutes: listing.slotDurationMinutes ?? undefined,
      });
      setBookingSuccess(true);
      setSelectedSlot(null);
      onSlotSelected(selectedSlot);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRaceError(true);
        setSelectedSlot(null);
      }
    }
  }

  return (
    <motion.section aria-labelledby="avail-title" {...fadeIn}>
      <p id="avail-title" className={EYEBROW_CLASS}>AVAILABILITY</p>
      <div className="mt-3 space-y-2">

        {/* S3-8: Success */}
        {bookingSuccess && (
          <InlineNotice tone="success">
            Offer sent. You&apos;ll hear back from this team.
          </InlineNotice>
        )}

        {/* S3-7: 409 race */}
        {raceError && (
          <InlineNotice tone="warning">
            This slot has just been booked. Please select another time.
          </InlineNotice>
        )}

        {/* S3-9: Load error */}
        {slotsQuery.isError && (
          <InlineNotice
            tone="critical"
            action={
              <button
                onClick={() => void slotsQuery.refetch()}
                className="text-[12px] border border-white/[0.08] text-white/55 hover:text-white px-3 py-1 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
              >
                Retry
              </button>
            }
          >
            Couldn&apos;t load available slots.
          </InlineNotice>
        )}

        {/* S3-0: Loading skeleton */}
        {slotsQuery.isLoading && (
          <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading slots">
            {[1, 2].map((g) => (
              <div key={g} className="space-y-2">
                <div className="h-3 w-28 bg-white/[0.06]" />
                {[1, 2].map((r) => (
                  <div key={r} className="h-[44px] bg-white/[0.04] border border-white/[0.04]" />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* S3-3: No available slots */}
        {!slotsQuery.isLoading && !slotsQuery.isError && availableSlots.length === 0 && slots.length > 0 && (
          <div className="space-y-2">
            <InlineNotice tone="neutral">No available slots right now.</InlineNotice>
            <button
              className="text-[13px] text-white/50 hover:text-white underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Message this team
            </button>
          </div>
        )}

        {/* S3-4: Slot rows */}
        {!slotsQuery.isLoading && !slotsQuery.isError && dateGroups.length > 0 && (
          <div className="space-y-4">
            {dateGroups.map((group) => (
              <div key={group.dateKey}>
                <p className={`${EYEBROW_CLASS} mt-4 mb-1`}>{group.dateLabel}</p>
                <div className="space-y-1">
                  {group.slots.map((slot) => {
                    const isBooked = slot.status === 'booked';
                    const isSelected = selectedSlot?.id === slot.id;
                    const timeLabel = formatSlotTimeRange(slot.startsAt, slot.endsAt);

                    return (
                      <div
                        key={slot.id}
                        className={[
                          // UX risk 4: min-h-[44px] explicit on every slot row
                          'min-h-[44px] flex items-center justify-between px-4',
                          'border transition-colors duration-[120ms]',
                          isBooked
                            ? 'border-white/[0.06] bg-white/[0.03] opacity-40 pointer-events-none'
                            : isSelected
                            ? 'border-rose-500/30 bg-rose-500/[0.06]'
                            : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12]',
                        ].join(' ')}
                      >
                        <span className={`text-[13px] ${isBooked ? 'text-white/40' : 'text-white'}`}>
                          {timeLabel}
                        </span>
                        {isBooked ? (
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 border border-zinc-700/50 px-2 py-0.5">
                            Booked
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedSlot(isSelected ? null : slot);
                              setRaceError(false);
                            }}
                            aria-pressed={isSelected}
                            className="px-3 py-1 text-[12px] text-white/55 hover:text-white border border-white/[0.08] hover:border-white/20 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
                          >
                            {isSelected ? 'Deselect' : 'Select'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* S3-5/S3-6: Confirmation ActionBar */}
      <AnimatePresence>
        {selectedSlot && (
          <ActionBar
            sticky
            start={
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-[13px] border border-white/[0.08] text-white/55 hover:text-white px-4 py-2 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
              >
                Back
              </button>
            }
            status={
              <span className="text-[12px] text-zinc-400">
                {formatSlotDateLabel(selectedSlot.startsAt)} &middot;{' '}
                {formatSlotTimeRange(selectedSlot.startsAt, selectedSlot.endsAt)}
              </span>
            }
            end={
              <button
                onClick={() => void handleConfirmBooking()}
                disabled={bookMutation.isPending}
                aria-busy={bookMutation.isPending}
                className="bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-[13px] font-medium px-5 py-2 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
                style={{ boxShadow: '0 0 12px 0 rgba(255,45,85,0.35)' }}
              >
                {bookMutation.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Booking…
                  </span>
                ) : (
                  'Confirm booking'
                )}
              </button>
            }
          />
        )}
      </AnimatePresence>
    </motion.section>
  );
}
