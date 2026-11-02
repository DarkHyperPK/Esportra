/**
 * OwnListingCard
 *
 * One of my team's scrim listings: what it offers (format, days, ranks), whether
 * it is live, how many offers are waiting, and the controls to manage it.
 * Soft-cornered to match the discovery cards.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, TriangleAlert, Zap } from 'lucide-react';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { StatusPill } from '@/components/ui/kit';
import { useListingOffers } from '@/hooks/competitive/useScrims';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { formatTimeWindow } from '@/services/scrimDiscoveryUtils';
import { bestOfLabel } from '@/services/scrimUtils';
import type { ScrimListing } from '@/types/competitive';
import { EditListingForm } from './EditListingForm';
import { OwnListingActions } from './OwnListingActions';
import { RankBand } from './RankBand';
import { RecurringSlots } from './RecurringSlots';
import { WeekDots } from './WeekDots';

const STATUS = {
  open: { label: 'Open', tone: 'success' },
  paused: { label: 'Paused', tone: 'warning' },
  closed: { label: 'Closed', tone: 'neutral' },
} as const;

interface OwnListingCardProps {
  listing: ScrimListing;
  /** Names of other listings whose availability collides with this one. */
  overlappingWith?: string[];
}

export function OwnListingCard({ listing, overlappingWith = [] }: OwnListingCardProps) {
  const catalog = useGameCatalogContext();
  const offers = useListingOffers(listing.id).data ?? [];
  const [editing, setEditing] = useState(false);
  const [showSlots, setShowSlots] = useState(false);

  const game = catalog.games.find((g) => g.slug === listing.gameSlug);
  const pending = offers.filter((o) => o.status === 'pending').length;
  const booked = offers.filter((o) => o.status === 'accepted').length;
  const recurring = listing.scheduleType === 'recurring';
  const status = STATUS[listing.status] ?? STATUS.closed;
  const timeLabel = listing.preferredTimeStart && listing.preferredTimeEnd
    ? formatTimeWindow(listing.preferredTimeStart, listing.preferredTimeEnd, listing.timezone ?? null)
    : '';
  const posted = new Date(listing.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.09] bg-card transition-colors hover:border-white/[0.16]">
      {pending > 0 && (
        <a
          href="#needs-you-title"
          className="flex items-center justify-between gap-3 bg-white/[0.06] px-5 py-2.5 text-[12px] text-white/85 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            {pending} new offer{pending === 1 ? '' : 's'} waiting
          </span>
          <span className="text-[11px] font-medium text-white/60">Review</span>
        </a>
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-black/40">
            {listing.gameSlug && (
              <GameLogoImage gameName={listing.gameSlug} catalogLogo={game?.logo} catalogIcon={game?.icon} className="h-6 w-6 object-contain" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-heading text-[17px] font-bold text-white">{game?.name ?? listing.gameSlug?.toUpperCase() ?? 'Scrim'}</h3>
            <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
              5v5 · {bestOfLabel(listing.bestOf)}{recurring ? ' · Weekly' : ''}{listing.regionKey ? ` · ${listing.regionKey.toUpperCase()}` : ''}
            </p>
          </div>
          <StatusPill label={status.label} tone={status.tone} className="rounded-full font-sans text-[11px] font-medium normal-case tracking-normal" />
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <WeekDots days={listing.preferredDays} soft />
            {timeLabel && <span className="text-[12px] tabular-nums text-zinc-400">{timeLabel}</span>}
          </div>
          <RankBand minName={listing.minRankDisplayName} maxName={listing.maxRankDisplayName} minIcon={listing.minRankIconUrl} maxIcon={listing.maxRankIconUrl} />
          {listing.notes && <p className="line-clamp-2 text-[12px] italic text-zinc-400">&ldquo;{listing.notes}&rdquo;</p>}
        </div>

        {overlappingWith.length > 0 && (
          <div role="note" className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
            <p className="text-[12px] leading-snug text-amber-100/80">Overlaps {overlappingWith.join(', ')}: same days and time window.</p>
          </div>
        )}
      </div>

      <div className="space-y-2.5 border-t border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-3 text-[12px] text-zinc-500">
          <span className="tabular-nums">Posted {posted}</span>
          {recurring ? (
            <button
              type="button"
              onClick={() => setShowSlots((v) => !v)}
              aria-expanded={showSlots}
              className="inline-flex items-center gap-1 rounded-md text-white/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              {showSlots ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
              {booked} booked
            </button>
          ) : (
            <span className="tabular-nums">{booked} scrim{booked === 1 ? '' : 's'}</span>
          )}
        </div>
        {showSlots && recurring && <RecurringSlots listing={listing} />}
        <OwnListingActions listing={listing} editing={editing} onToggleEdit={() => setEditing((v) => !v)} />
      </div>

      {editing && <EditListingForm listing={listing} onClose={() => setEditing(false)} />}
    </article>
  );
}
