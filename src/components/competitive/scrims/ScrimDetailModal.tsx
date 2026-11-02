/**
 * ScrimDetailModal
 *
 * Scouting report and request flow for one listing: who they are, how they have
 * played, when they are free, then pick a time and send the offer. One dialog for
 * the whole journey so a captain never loses context.
 */

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Clock3 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useScrimHistory, useScrimListingDetail } from '@/hooks/competitive/useScrims';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { formatSlotDay, formatSlotTime } from '@/services/scrimSlots';
import { bestOfLabel, winsNeeded } from '@/services/scrimUtils';
import { ScrimOfferForm } from './ScrimOfferForm';
import { RecentResults } from './scouting/RecentResults';
import { ScoutingHeader } from './scouting/ScoutingHeader';
import { ScoutingRoster } from './scouting/ScoutingRoster';
import { ScoutingSnapshot } from './scouting/ScoutingSnapshot';
import { SlotPicker } from './scouting/SlotPicker';

interface Props {
  /** Listing to show; null closes the modal. */
  listingId: string | null;
  /** Fallbacks while the detail request is in flight. */
  teamName?: string | null;
  teamLogoUrl?: string | null;
  gameSlug?: string | null;
  /** Owner sees details only; their own listing is managed from the workspace. */
  isOwner?: boolean;
  onClose: () => void;
}

const FOOT_BUTTON =
  'min-h-[40px] rounded-xl px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60';

export function ScrimDetailModal({ listingId, teamName, teamLogoUrl, gameSlug, isOwner = false, onClose }: Props) {
  const open = !!listingId;
  const [step, setStep] = useState<'details' | 'offer'>('details');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const detail = useScrimListingDetail(listingId ?? '', open).data;
  const listing = detail?.listing;
  const members = detail?.members ?? [];
  const slots = useMemo(() => detail?.slots ?? [], [detail]);
  // Private history answers with an error; the section then simply does not show.
  const history = useScrimHistory(listing?.teamId ?? '', 1, 5).data?.items ?? [];

  const catalog = useGameCatalogContext();
  const activeGame = listing?.gameSlug ?? gameSlug ?? null;
  const game = catalog.games.find((g) => g.slug === activeGame);

  // Start every listing from the top of the flow.
  useEffect(() => {
    setStep('details');
    setSelectedSlotId(null);
  }, [listingId]);

  const name = listing?.teamName ?? teamName ?? 'Team';
  const logo = listing?.teamLogoUrl ?? teamLogoUrl ?? null;
  const captainArt = members.find((m) => m.role === 'captain')?.playerCardId;
  const cardArt = captainArt && activeGame === 'valorant'
    ? `https://media.valorant-api.com/playercards/${captainArt}/wideart.png`
    : null;
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  const footerHint = isOwner
    ? 'Your listing. Manage availability and offers from the workspace.'
    : selectedSlot
      ? `${formatSlotDay(selectedSlot)} · ${formatSlotTime(selectedSlot)}`
      : listing?.scheduleType === 'recurring'
        ? 'Pick a time above, or request without one'
        : 'Request with a time that suits both teams';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[680px] flex-col gap-0 overflow-hidden rounded-2xl border border-white/[0.09] bg-card p-0 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]">
        <ScoutingHeader
          name={name}
          logoUrl={logo}
          bannerUrl={cardArt ?? logo}
          isCardArt={!!cardArt}
          tag={listing?.teamTag ? `[${listing.teamTag}]` : null}
          region={listing?.regionKey}
          gameSlug={activeGame}
          gameName={game?.name ?? null}
          gameLogo={game?.logo}
          seriesLabel={listing ? bestOfLabel(listing.bestOf) : null}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!detail && !listing ? (
            <div className="animate-pulse space-y-3 p-5" aria-busy="true" aria-label="Loading team">
              <div className="h-8 w-1/2 rounded-lg bg-white/[0.06]" />
              <div className="h-16 rounded-xl bg-white/[0.04]" />
              <div className="h-28 rounded-xl bg-white/[0.04]" />
            </div>
          ) : !listing ? (
            <p className="p-5 text-[13px] text-zinc-400">Could not load listing details.</p>
          ) : step === 'offer' ? (
            <div className="space-y-3 p-5">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="inline-flex items-center gap-1 rounded-md text-[12px] text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to scouting report
              </button>
              {selectedSlot && (
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.05] px-3 py-2">
                  <Clock3 className="h-3.5 w-3.5 text-white/60" aria-hidden="true" />
                  <span className="text-[12px] font-medium text-white/85">{formatSlotDay(selectedSlot)} · {formatSlotTime(selectedSlot)}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
                    {bestOfLabel(listing.bestOf)} · first to {winsNeeded(listing.bestOf)}
                  </span>
                </div>
              )}
              <ScrimOfferForm
                listingId={listing.id}
                gameSlug={listing.gameSlug ?? gameSlug ?? null}
                bestOf={listing.bestOf}
                prefilledProposedAt={selectedSlot?.startsAt}
                slotId={selectedSlot?.id}
                onClose={() => setStep('details')}
              />
            </div>
          ) : (
            <div className="space-y-6 p-5">
              <ScoutingSnapshot listing={listing} />
              <RecentResults entries={history} />
              <SlotPicker slots={slots} selectedId={selectedSlotId} onSelect={setSelectedSlotId} />
              <ScoutingRoster members={members} />
              <p className="border-t border-white/[0.06] pt-3 text-[11px] text-zinc-600">
                {[
                  (listing.scrimsCompleted ?? 0) > 0 ? `${listing.scrimsCompleted} scrims played` : null,
                  `Listed ${new Date(listing.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          )}
        </div>

        {detail && step === 'details' && (
          <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.07] bg-black/30 px-4 py-3">
            <p className="min-w-0 flex-1 truncate text-[12px] text-zinc-400">{footerHint}</p>
            <button type="button" onClick={onClose} className={`${FOOT_BUTTON} border border-white/[0.14] text-white/70 hover:text-white`}>
              Close
            </button>
            {!isOwner && (
              <button type="button" onClick={() => setStep('offer')} className={`${FOOT_BUTTON} bg-white text-black hover:bg-rose-500 hover:text-white`}>
                Request scrim
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
