import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { InlineNotice, Field } from '@/components/ui/kit';
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
    <div className="border border-white/[0.06] border-t-0 bg-[#0d0d12] p-4 space-y-3">
      <p className="text-[11px] font-mono tracking-widest text-white/25 uppercase">Edit listing</p>
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
    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
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
      {untilDate && listing.slotDurationMinutes && (
        <p className="text-[12px] text-white/25">
          Until {untilDate} · {listing.slotDurationMinutes}-min sessions
        </p>
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

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
  const isPaused = listing.status === 'paused';
  const hasSchedule = days.length > 0 || !!timeWindow;

  const accentColor = isOpen ? '#f43f5e' : isPaused ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)';
  const statusLabel = listing.status.toUpperCase();
  const statusTextClass = isOpen
    ? 'text-rose-400'
    : isPaused
    ? 'text-amber-400/70'
    : 'text-white/25';

  return (
    <>
      <article
        className={`relative overflow-hidden border border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04] transition-colors duration-150 ${showEdit ? '' : 'hover:border-white/[0.12]'}`}
        style={{ borderLeft: `3px solid ${accentColor}` }}
      >
        <div className="pl-4 pr-4 pt-4 pb-3.5">
          {/* Row 1 — status + mode/region + offers badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <span className={`text-[10px] font-mono tracking-[0.18em] font-semibold ${statusTextClass}`}>
                {statusLabel}
              </span>

              {listing.modeKey && (
                <span className="text-[14px] font-semibold text-white [font-family:var(--font-heading)]">
                  {listing.modeKey}
                </span>
              )}

              {listing.regionKey && (
                <span className="font-mono text-[10px] tracking-[0.15em] text-white/40 bg-white/[0.06] px-1.5 py-0.5">
                  {listing.regionKey.toUpperCase()}
                </span>
              )}

              {isRecurring && (
                <span className="text-[10px] text-white/30 bg-white/[0.05] px-1.5 py-0.5">
                  Recurring
                </span>
              )}
            </div>

            {pendingOfferCount > 0 && (
              <div className="shrink-0 flex items-center gap-1 bg-rose-500/15 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-400 font-semibold text-[12px] tabular-nums">
                  {pendingOfferCount} offer{pendingOfferCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Row 2 — schedule */}
          {hasSchedule && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {days.map((d) => (
                <span
                  key={d}
                  className="px-1.5 py-0.5 bg-white/[0.07] font-mono text-[10px] text-white/75 font-semibold tracking-wider"
                >
                  {d.toUpperCase()}
                </span>
              ))}
              {timeWindow && (
                <span className="text-[13px] font-medium text-white/55">
                  {days.length > 0 ? '· ' : ''}{timeWindow}
                </span>
              )}
            </div>
          )}

          {/* Row 3 — rank requirement */}
          {(listing.minRankDisplayName || listing.maxRankDisplayName) && (
            <div className="flex items-center gap-1.5 mb-3">
              {listing.minRankIconUrl && (
                <img src={listing.minRankIconUrl} alt="" className="h-4 w-4 object-contain" />
              )}
              <span className="text-[12px] text-white/40">
                {listing.minRankDisplayName && listing.maxRankDisplayName && listing.minRankDisplayName !== listing.maxRankDisplayName
                  ? `${listing.minRankDisplayName} – ${listing.maxRankDisplayName}`
                  : listing.minRankDisplayName ?? listing.maxRankDisplayName}
              </span>
              {listing.maxRankIconUrl && listing.maxRankIconUrl !== listing.minRankIconUrl && (
                <img src={listing.maxRankIconUrl} alt="" className="h-4 w-4 object-contain" />
              )}
            </div>
          )}

          {/* Row 4 — notes */}
          {listing.notes && (
            <p className="text-[12px] text-white/35 line-clamp-1 mb-3 italic">"{listing.notes}"</p>
          )}

          {/* Recurring slot summary */}
          {isRecurring && (
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] text-white/30 tabular-nums">{bookedCount} booked</span>
              <button
                type="button"
                onClick={() => setShowSlots((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60 transition-colors"
              >
                {showSlots ? 'Hide' : 'Slots'}
                {showSlots ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
          )}

          {/* Bottom row — date + actions */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/[0.05]">
            <span className="text-[10px] text-white/20 tabular-nums tracking-wide font-mono">
              {new Date(listing.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>

            <div className="flex items-center gap-1 shrink-0">
              {(listing.status === 'open' || listing.status === 'paused') && (
                <button
                  type="button"
                  onClick={() => setShowEdit((v) => !v)}
                  className="px-2.5 py-1 text-[11px] text-white/40 hover:text-white border border-white/[0.07] hover:border-white/20 transition-colors"
                >
                  Edit
                </button>
              )}
              {listing.status === 'open' && (
                <button
                  type="button"
                  onClick={() => pauseMutation.mutate()}
                  disabled={isPending}
                  className="px-2.5 py-1 text-[11px] text-white/40 hover:text-white border border-white/[0.07] hover:border-white/20 transition-colors disabled:opacity-30"
                >
                  {pauseMutation.isPending ? '…' : 'Pause'}
                </button>
              )}
              {listing.status === 'paused' && (
                <button
                  type="button"
                  onClick={() => reopenMutation.mutate()}
                  disabled={isPending}
                  className="px-2.5 py-1 text-[11px] text-rose-400/70 hover:text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-colors disabled:opacity-30"
                >
                  {reopenMutation.isPending ? '…' : 'Reopen'}
                </button>
              )}
              {listing.status !== 'closed' && (
                <button
                  type="button"
                  onClick={() => closeMutation.mutate()}
                  disabled={isPending}
                  className="px-2.5 py-1 text-[11px] text-red-400/50 hover:text-red-400 transition-colors disabled:opacity-30"
                >
                  {closeMutation.isPending ? '…' : 'Close'}
                </button>
              )}
            </div>
          </div>

          {showSlots && isRecurring && <RecurringSlotExpansion listing={listing} />}
        </div>
      </article>

      {showEdit && <EditListingForm listing={listing} onClose={() => setShowEdit(false)} />}
    </>
  );
}
