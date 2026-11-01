import { useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { InlineNotice, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import {
  useListingOffers,
  usePauseListing,
  useReopenListing,
  useCloseListing,
  useDeleteScrimListing,
  useUpdateScrimListing,
} from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import {
  BEST_OF_OPTIONS,
  type BestOf,
  bestOfLabel,
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

function formatPosted(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditListingForm({ listing, onClose }: { listing: ScrimListing; onClose: () => void }) {
  const updateMutation = useUpdateScrimListing(listing.id);
  const [region, setRegion] = useState(listing.regionKey ?? '');
  const [bestOf, setBestOf] = useState<BestOf>(normalizeBestOf(listing.bestOf));
  const [notes, setNotes] = useState(listing.notes ?? '');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    try {
      await updateMutation.mutateAsync({
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
    <div className="space-y-3 rounded-b-2xl border-t border-white/[0.06] bg-black/40 p-4">
      <p className={SCRIM_EYEBROW}>Edit listing</p>
      <Field label="Region" htmlFor={`elr-${listing.id}`} optional>
        <input
          id={`elr-${listing.id}`}
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. EU, NA"
          className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
      </Field>
      <div className="space-y-2">
        <div className={SCRIM_EYEBROW}>Series format</div>
        <div className="flex gap-2">
          {BEST_OF_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={bestOf === n}
              onClick={() => setBestOf(n)}
              className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                bestOf === n
                  ? 'border-rose-500/30 bg-rose-500/15 text-rose-400'
                  : 'border-white/[0.08] text-white/45 hover:border-white/20 hover:text-white'
              }`}
            >
              BO{n}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/30">
          Changing this only affects future offers; accepted scrims keep their format.
        </p>
      </div>
      <Field label="Message to teams" htmlFor={`eln-${listing.id}`} optional>
        <textarea
          id={`eln-${listing.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          rows={2}
          className="w-full resize-none rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          className="rounded-lg border border-white/[0.08] text-[13px] text-white/50 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
          className="rounded-lg bg-rose-500 px-4 text-[13px] text-white hover:bg-rose-600"
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

export function WorkspaceListingCard({
  listing,
  overlappingWith = [],
}: {
  listing: ScrimListing;
  /** Names of other listings whose availability collides with this one. */
  overlappingWith?: string[];
}) {
  const pauseMutation = usePauseListing(listing.id);
  const reopenMutation = useReopenListing(listing.id);
  const closeMutation = useCloseListing(listing.id);
  const deleteMutation = useDeleteScrimListing(listing.id);
  const offersQuery = useListingOffers(listing.id);
  const catalog = useGameCatalogContext();

  const [showEdit, setShowEdit] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isPending = pauseMutation.isPending || reopenMutation.isPending || closeMutation.isPending || deleteMutation.isPending;
  const pendingOfferCount = (offersQuery.data ?? []).filter((o) => o.status === 'pending').length;
  const bookedCount = (offersQuery.data ?? []).filter((o) => o.status === 'accepted').length;

  const days = formatPreferredDays(listing.preferredDays);
  const timeWindow = formatTimeWindow(listing.preferredTimeStart, listing.preferredTimeEnd);
  const isRecurring = listing.scheduleType === 'recurring';
  const isOpen = listing.status === 'open';
  const hasSchedule = days.length > 0 || !!timeWindow;

  const catalogGame = catalog.games.find((g) => g.slug === listing.gameSlug);
  const gameName = catalogGame?.name ?? (listing.gameSlug ? listing.gameSlug.toUpperCase() : 'Scrim');

  const rankRange =
    listing.minRankDisplayName &&
    listing.maxRankDisplayName &&
    listing.minRankDisplayName !== listing.maxRankDisplayName
      ? `${listing.minRankDisplayName} – ${listing.maxRankDisplayName}`
      : listing.minRankDisplayName ?? listing.maxRankDisplayName ?? null;

  return (
    <div className={SCRIM_CARD_CLASS}>
      {/* Accent line — open listings carry the cue light */}
      <div className="mb-px h-[2px] rounded-t-2xl bg-gradient-to-r from-rose-500 via-rose-500/50 to-transparent" />

      <article className="space-y-3 p-4">
        {/* Header — game crest, format, status */}
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.09] bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            {listing.gameSlug ? (
              <GameLogoImage
                gameName={listing.gameSlug}
                catalogLogo={catalogGame?.logo}
                className="h-7 w-7 object-contain"
              />
            ) : (
              <span className="font-mono text-[9px] text-white/30">—</span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-white [font-family:var(--font-heading)]">
              {gameName}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
              5v5
              <span className="text-white/15">·</span>
              {bestOfLabel(listing.bestOf)}
              {isRecurring && (
                <>
                  <span className="text-white/15">·</span>
                  Recurring
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${
                isOpen
                  ? 'bg-rose-500/15 text-rose-400'
                  : listing.status === 'paused'
                    ? 'bg-amber-500/10 text-amber-400/70'
                    : 'bg-white/[0.05] text-white/25'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isOpen ? 'bg-rose-500' : listing.status === 'paused' ? 'bg-amber-500/60' : 'bg-white/20'
                }`}
              />
              {listing.status}
            </span>
            {pendingOfferCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5">
                <Zap className="h-3 w-3 text-rose-400" aria-hidden />
                <span className="text-[10px] font-semibold tabular-nums text-rose-400">
                  {pendingOfferCount} new
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Availability */}
        {hasSchedule && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={SCRIM_EYEBROW}>Available</span>
            {days.map((d) => (
              <span
                key={d}
                className="rounded-md border border-white/[0.06] bg-black/40 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                {d}
              </span>
            ))}
            {timeWindow && (
              <span className="text-[12px] font-medium tabular-nums text-white/55">
                {days.length > 0 ? '· ' : ''}
                {timeWindow}
              </span>
            )}
          </div>
        )}

        {/* Rank */}
        {rankRange && (
          <div className="flex items-center gap-1.5">
            {listing.minRankIconUrl && (
              <img src={listing.minRankIconUrl} alt="" className="h-3.5 w-3.5 object-contain" />
            )}
            <span className="text-[12px] text-white/40">{rankRange}</span>
          </div>
        )}

        {listing.notes && (
          <p className="line-clamp-2 text-[12px] italic text-white/35">"{listing.notes}"</p>
        )}

        {/* Overlap warning */}
        {overlappingWith.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" aria-hidden />
            <p className="text-[11px] leading-snug text-amber-200/75">
              Overlaps {overlappingWith.join(', ')} — same days and time window.
            </p>
          </div>
        )}

        {/* Footer — stats + actions */}
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-white/30">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarClock className="h-3 w-3" aria-hidden />
              Posted {formatPosted(listing.createdAt)}
            </span>
            {isRecurring ? (
              <button
                type="button"
                onClick={() => setShowSlots((v) => !v)}
                className="inline-flex items-center gap-1 text-white/40 transition-colors hover:text-white/70"
              >
                {showSlots ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
                {bookedCount} booked
              </button>
            ) : (
              <span className="tabular-nums">{bookedCount} scrim{bookedCount === 1 ? '' : 's'}</span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {(listing.status === 'open' || listing.status === 'paused') && (
              <button
                type="button"
                onClick={() => setShowEdit((v) => !v)}
                className="rounded-lg px-2.5 py-1 text-[11px] text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                Edit
              </button>
            )}
            {listing.status === 'open' && (
              <button
                type="button"
                onClick={() => pauseMutation.mutate()}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-[11px] text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
              >
                {pauseMutation.isPending ? '…' : 'Pause'}
              </button>
            )}
            {listing.status === 'paused' && (
              <button
                type="button"
                onClick={() => reopenMutation.mutate()}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-[11px] text-rose-400/70 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-30"
              >
                {reopenMutation.isPending ? '…' : 'Reopen'}
              </button>
            )}
            {listing.status !== 'closed' && (
              <button
                type="button"
                onClick={() => closeMutation.mutate()}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-[11px] text-red-400/50 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
              >
                {closeMutation.isPending ? '…' : 'Close'}
              </button>
            )}
            {confirmDelete ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    setDeleteError('');
                    try {
                      await deleteMutation.mutateAsync();
                    } catch (err) {
                      setDeleteError(getApiErrorMessage(err, 'Could not delete listing.'));
                      setConfirmDelete(false);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg px-2.5 py-1 text-[11px] text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-30"
                >
                  {deleteMutation.isPending ? '…' : 'Confirm delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1 text-[11px] text-white/30 hover:text-white/60"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={isPending}
                className="rounded-lg px-2.5 py-1 text-[11px] text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
              >
                Delete
              </button>
            )}
          </div>
          {deleteError && (
            <p className="mt-1 text-[11px] text-red-400">{deleteError}</p>
          )}
        </div>

        {showSlots && isRecurring && <RecurringSlotExpansion listing={listing} />}
      </article>

      {showEdit && <EditListingForm listing={listing} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
