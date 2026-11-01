import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
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
import {
  BEST_OF_OPTIONS,
  type BestOf,
  bestOfLongLabel,
  formatPreferredDays,
  normalizeBestOf,
} from '@/services/scrimUtils';
import type { ScrimListing } from '@/types/competitive';

// ─── Shared card skin (management cards + workspace) ─────────────────────────

/**
 * Depth layering for management cards: raised surface over the stage-black ground,
 * a one-pixel top highlight, hairline border and hover lift. Chunky enough to read
 * as physical; quiet enough to scan vertically.
 */
export const SCRIM_CARD_CLASS =
  'relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.055] to-white/[0.02] ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-all duration-200 ' +
  'hover:border-white/[0.16] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_24px_-12px_rgba(0,0,0,0.8)]';

/** Mono-caps eyebrow used for card section labels. */
export const SCRIM_EYEBROW = 'font-mono text-[10px] uppercase tracking-[0.22em] text-white/30';

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

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditListingForm({ listing, onClose }: { listing: ScrimListing; onClose: () => void }) {
  const updateMutation = useUpdateScrimListing(listing.id);
  const [mode, setMode] = useState(listing.modeKey ?? '');
  const [region, setRegion] = useState(listing.regionKey ?? '');
  const [bestOf, setBestOf] = useState<BestOf>(normalizeBestOf(listing.bestOf));
  const [notes, setNotes] = useState(listing.notes ?? '');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    try {
      await updateMutation.mutateAsync({
        modeKey: mode.trim() || undefined,
        regionKey: region.trim() || undefined,
        bestOf,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not update listing. Try again.'));
    }
  }

  return (
    <div className="rounded-b-2xl border-t border-white/[0.06] bg-black/40 p-4 space-y-3">
      <p className={SCRIM_EYEBROW}>Edit listing</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mode" htmlFor={`elm-${listing.id}`} optional>
          <input
            id={`elm-${listing.id}`}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            placeholder="e.g. competitive"
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
        <Field label="Region" htmlFor={`elr-${listing.id}`} optional>
          <input
            id={`elr-${listing.id}`}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. EU, NA"
            className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>
      <div className="space-y-2">
        <div className={SCRIM_EYEBROW}>Match format</div>
        <div className="flex gap-2">
          {BEST_OF_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={bestOf === n}
              onClick={() => setBestOf(n)}
              className={`px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition-colors ${
                bestOf === n
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'text-white/45 border-white/[0.08] hover:text-white hover:border-white/20'
              }`}
            >
              BO{n}
            </button>
          ))}
        </div>
      </div>
      <Field label="Message to teams" htmlFor={`eln-${listing.id}`} optional>
        <textarea
          id={`eln-${listing.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          rows={2}
          className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-[13px] text-white/50 hover:text-white rounded-lg border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-lg px-4 text-[13px]"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ─── Slot expansion ───────────────────────────────────────────────────────────

function RecurringSlotExpansion({ listing }: { listing: ScrimListing }) {
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
      {untilDate && (
        <p className="text-[12px] text-white/25">Accepting bookings until {untilDate}</p>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

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
    <div className={SCRIM_CARD_CLASS}>
      {/* Accent line — open listings carry the cue light */}
      <div className="rounded-t-2xl h-[2px] mb-px bg-gradient-to-r from-rose-500 via-rose-500/50 to-transparent" />

      <article className="p-4 space-y-3">
        {/* Header — status + offers badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] shrink-0 ${
            isOpen
              ? 'bg-rose-500/15 text-rose-400'
              : listing.status === 'paused'
              ? 'bg-amber-500/10 text-amber-400/70'
              : 'bg-white/[0.05] text-white/25'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${
              isOpen ? 'bg-rose-500' : listing.status === 'paused' ? 'bg-amber-500/60' : 'bg-white/20'
            }`} />
            {listing.status}
          </span>

          {isRecurring && (
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
              Recurring
            </span>
          )}

          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.14em] text-white/50">
            {bestOfLongLabel(listing.bestOf).toUpperCase()}
          </span>

          <div className="flex-1" />

          {pendingOfferCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5">
              <Zap className="h-3 w-3 text-rose-400" aria-hidden />
              <span className="text-rose-400 font-semibold text-[11px] tabular-nums">
                {pendingOfferCount} new
              </span>
            </span>
          )}
        </div>

        {/* Availability — game, days, time window */}
        <div className="space-y-1.5">
          {listing.gameSlug && (
            <p className="text-[12px] text-white/45">
              <span className={SCRIM_EYEBROW}>Game</span>
              <span className="ml-2 text-white/70">{listing.gameSlug.toUpperCase()}</span>
              {listing.modeKey && <span className="text-white/35"> · {listing.modeKey}</span>}
            </p>
          )}
          {hasSchedule && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={SCRIM_EYEBROW}>Available</span>
              {days.map((d) => (
                <span key={d} className="rounded-md bg-black/40 border border-white/[0.06] px-2 py-0.5 font-mono text-[11px] font-semibold text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  {d}
                </span>
              ))}
              {timeWindow && (
                <span className="text-[12px] font-medium text-white/55 tabular-nums">
                  {days.length > 0 ? '· ' : ''}{timeWindow}
                </span>
              )}
            </div>
          )}
          {(listing.minRankDisplayName || listing.maxRankDisplayName) && (
            <div className="flex items-center gap-1.5">
              {listing.minRankIconUrl && (
                <img src={listing.minRankIconUrl} alt="" className="h-3.5 w-3.5 object-contain" />
              )}
              <span className="text-[12px] text-white/40">
                {listing.minRankDisplayName && listing.maxRankDisplayName && listing.minRankDisplayName !== listing.maxRankDisplayName
                  ? `${listing.minRankDisplayName} – ${listing.maxRankDisplayName}`
                  : listing.minRankDisplayName ?? listing.maxRankDisplayName}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {listing.notes && (
          <p className="text-[12px] text-white/35 line-clamp-2 italic">"{listing.notes}"</p>
        )}

        {/* Footer — booked count, slot toggle, actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            {isRecurring ? (
              <button
                type="button"
                onClick={() => setShowSlots((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
              >
                {showSlots ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
                {bookedCount} booked
              </button>
            ) : (
              <span className="text-[11px] text-white/25 tabular-nums">
                {bookedCount} scrim{bookedCount === 1 ? '' : 's'} played
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {(listing.status === 'open' || listing.status === 'paused') && (
              <button
                type="button"
                onClick={() => setShowEdit((v) => !v)}
                className="rounded-lg px-2.5 py-1 text-[11px] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                Edit
              </button>
            )}
            {listing.status === 'open' && (
              <button
                type="button"
                onClick={() => pauseMutation.mutate()}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-[11px] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-30"
              >
                {pauseMutation.isPending ? '…' : 'Pause'}
              </button>
            )}
            {listing.status === 'paused' && (
              <button
                type="button"
                onClick={() => reopenMutation.mutate()}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-[11px] text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30"
              >
                {reopenMutation.isPending ? '…' : 'Reopen'}
              </button>
            )}
            {listing.status !== 'closed' && (
              <button
                type="button"
                onClick={() => closeMutation.mutate()}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-[11px] text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
              >
                {closeMutation.isPending ? '…' : 'Close'}
              </button>
            )}
          </div>
        </div>

        {showSlots && isRecurring && <RecurringSlotExpansion listing={listing} />}
      </article>

      {showEdit && <EditListingForm listing={listing} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
