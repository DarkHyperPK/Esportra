import { useState } from 'react';
import { StatusPill, Field, InlineNotice } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import {
  useListingOffers,
  usePauseListing,
  useReopenListing,
  useCloseListing,
  useUpdateScrimListing,
} from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { formatPreferredDays } from '@/services/scrimUtils';
import type { ScrimListing } from '@/types/competitive';

const LISTING_TONE = { open: 'accent', paused: 'neutral', closed: 'neutral' } as const;

function formatTimeWindow(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  const fmt = (t: string) =>
    new Date(`1970-01-01T${t}`).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditListingForm({ listing, onClose }: { listing: ScrimListing; onClose: () => void }) {
  const updateMutation = useUpdateScrimListing(listing.id);
  const [mode, setMode] = useState(listing.modeKey ?? '');
  const [region, setRegion] = useState(listing.regionKey ?? '');
  const [notes, setNotes] = useState(listing.notes ?? '');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    try {
      await updateMutation.mutateAsync({
        modeKey: mode.trim() || undefined,
        regionKey: region.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not update listing. Try again.'));
    }
  }

  return (
    <div className="mt-1 border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <p className="text-[11px] font-medium text-white/35">Edit listing</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mode" htmlFor={`elm-${listing.id}`} optional>
          <input
            id={`elm-${listing.id}`}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            placeholder="e.g. competitive"
            className="h-9 w-full border border-white/[0.08] bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
        <Field label="Region" htmlFor={`elr-${listing.id}`} optional>
          <input
            id={`elr-${listing.id}`}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. EU, NA"
            className="h-9 w-full border border-white/[0.08] bg-black/30 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>
      <Field label="Message to teams" htmlFor={`eln-${listing.id}`} optional>
        <textarea
          id={`eln-${listing.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          rows={2}
          className="w-full border border-white/[0.08] bg-black/30 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-4 text-[13px]"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ── Slot expansion ────────────────────────────────────────────────────────────

function RecurringSlotExpansion({ listing }: { listing: ScrimListing }) {
  const offersQuery = useListingOffers(listing.id);
  const offers = offersQuery.data ?? [];
  const accepted = offers.filter((o) => o.status === 'accepted');

  const untilDate = listing.scheduleUntil
    ? new Date(listing.scheduleUntil).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3 space-y-2">
      {accepted.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-white/25">Booked slots</p>
          {accepted.map((offer) => (
            <p key={offer.id} className="text-[12px] text-white/55">
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
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-white/35">No slots booked yet</p>
      )}
      {untilDate && listing.slotDurationMinutes && (
        <p className="text-[12px] text-white/35">
          Available until {untilDate} · {listing.slotDurationMinutes}-min sessions
        </p>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function WorkspaceListingCard({ listing }: { listing: ScrimListing }) {
  const pauseMutation = usePauseListing(listing.id);
  const reopenMutation = useReopenListing(listing.id);
  const closeMutation = useCloseListing(listing.id);
  const offersQuery = useListingOffers(listing.id);

  const [showEdit, setShowEdit] = useState(false);
  const [showSlots, setShowSlots] = useState(false);

  const isPending = pauseMutation.isPending || reopenMutation.isPending || closeMutation.isPending;
  const pendingOfferCount = (offersQuery.data ?? []).filter((o) => o.status === 'pending').length;
  const bookedCount = (offersQuery.data ?? []).filter((o) => o.status === 'accepted').length;

  const days = formatPreferredDays(listing.preferredDays);
  const timeWindow = formatTimeWindow(listing.preferredTimeStart, listing.preferredTimeEnd);
  const isRecurring = listing.scheduleType === 'recurring';
  const isOpen = listing.status === 'open';
  const hasSchedule = days.length > 0 || !!timeWindow;

  return (
    <>
      <article
        className={`bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-colors duration-150 p-4${isOpen ? ' border-t-2 border-t-[#FF2D55]' : ''}`}
      >
        {/* Row 1 — status + meta chips */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <StatusPill label={listing.status} tone={LISTING_TONE[listing.status]} />
            {listing.modeKey && (
              <span className="text-[13px] text-white/55">{listing.modeKey}</span>
            )}
            {listing.regionKey && (
              <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 bg-white/[0.05] px-1.5 py-0.5">
                {listing.regionKey.toUpperCase()}
              </span>
            )}
            {isRecurring && (
              <span className="text-[10px] bg-white/[0.05] text-white/40 px-1.5 py-0.5">
                Recurring
              </span>
            )}
          </div>
          {pendingOfferCount > 0 && (
            <span className="bg-rose-500/15 text-rose-400 font-mono text-[11px] px-2 py-0.5 shrink-0 tabular-nums">
              {pendingOfferCount} offer{pendingOfferCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Row 2 — schedule as visual anchor */}
        {hasSchedule && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {days.map((d) => (
              <span
                key={d}
                className="inline-flex px-2 py-0.5 bg-white/[0.07] font-mono text-[11px] text-white/80 font-semibold"
              >
                {d.toUpperCase()}
              </span>
            ))}
            {timeWindow && (
              <span className="text-[14px] font-semibold text-white [font-family:var(--font-heading)]">
                {timeWindow}
              </span>
            )}
          </div>
        )}

        {/* Row 3 — recurring slot summary */}
        {isRecurring && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] text-white/40 tabular-nums">{bookedCount} booked</span>
            <button
              type="button"
              onClick={() => setShowSlots((v) => !v)}
              className="text-[12px] text-white/40 hover:text-white/70 underline underline-offset-2 transition-colors"
            >
              {showSlots ? 'Hide slots' : 'View slots'}
            </button>
          </div>
        )}

        {/* Bottom row — meta + actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-white/25">
            Created{' '}
            {new Date(listing.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>

          <div className="flex gap-2 shrink-0">
            {(listing.status === 'open' || listing.status === 'paused') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEdit((v) => !v)}
                className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
              >
                Edit
              </Button>
            )}
            {listing.status === 'open' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => pauseMutation.mutate()}
                disabled={isPending}
                className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
              >
                {pauseMutation.isPending ? '…' : 'Pause'}
              </Button>
            )}
            {listing.status === 'paused' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => reopenMutation.mutate()}
                disabled={isPending}
                className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
              >
                {reopenMutation.isPending ? '…' : 'Reopen'}
              </Button>
            )}
            {listing.status !== 'closed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => closeMutation.mutate()}
                disabled={isPending}
                className="text-[12px] text-red-300/70 hover:text-red-300 rounded-none"
              >
                {closeMutation.isPending ? '…' : 'Close'}
              </Button>
            )}
          </div>
        </div>

        {showSlots && isRecurring && <RecurringSlotExpansion listing={listing} />}
      </article>
      {showEdit && <EditListingForm listing={listing} onClose={() => setShowEdit(false)} />}
    </>
  );
}
