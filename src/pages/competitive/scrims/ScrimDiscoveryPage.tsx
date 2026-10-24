import { useState } from 'react';
import { PageIntro, InlineNotice, StatusPill, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useDiscoverScrims, useMakeOffer } from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ScrimListing } from '@/types/competitive';

const GAME_SLUG = 'valorant';

const LISTING_TONE = {
  open: 'accent',
  paused: 'neutral',
  closed: 'neutral',
} as const;

function formatDays(days: string[] | null): string {
  if (!days || days.length === 0) return '';
  return days.map((d) => d.slice(0, 3)).join(', ');
}

function SkeletonCard() {
  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-3 opacity-60 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-40 bg-white/[0.06]" />
          <div className="h-3 w-28 bg-white/[0.04]" />
        </div>
        <div className="h-8 w-24 bg-white/[0.04]" />
      </div>
      <div className="flex gap-3">
        <div className="h-3 w-16 bg-white/[0.04]" />
        <div className="h-3 w-20 bg-white/[0.04]" />
      </div>
    </div>
  );
}

function MakeOfferForm({ listingId, onClose }: { listingId: string; onClose: () => void }) {
  const offerMutation = useMakeOffer(listingId);
  const [offeringTeamId, setOfferingTeamId] = useState('');
  const [proposedAt, setProposedAt] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [teamIdError, setTeamIdError] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    setTeamIdError('');
    if (!offeringTeamId.trim()) {
      setTeamIdError('Your team ID is required.');
      return;
    }
    try {
      await offerMutation.mutateAsync({
        offeringTeamId: offeringTeamId.trim(),
        proposedAt: proposedAt || undefined,
        proposedDurationMinutes: duration ? parseInt(duration, 10) : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not send offer. Try again.'));
    }
  }

  return (
    <div className="border border-white/10 bg-black/40 p-4 space-y-3 mt-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        SEND SCRIM OFFER
      </p>
      <Field label="Your team ID" htmlFor={`oti-${listingId}`}>
        <input
          id={`oti-${listingId}`}
          value={offeringTeamId}
          onChange={(e) => setOfferingTeamId(e.target.value)}
          placeholder="Team UUID"
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
        />
        {teamIdError && <p role="alert" className="text-xs text-red-300 mt-1">{teamIdError}</p>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Proposed date & time" htmlFor={`oat-${listingId}`} optional>
          <input
            id={`oat-${listingId}`}
            type="datetime-local"
            value={proposedAt}
            onChange={(e) => setProposedAt(e.target.value)}
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white focus:outline-none focus:border-white/30 [color-scheme:dark]"
          />
        </Field>
        <Field label="Duration (min)" htmlFor={`odm-${listingId}`} optional>
          <input
            id={`odm-${listingId}`}
            type="number"
            min={15}
            max={300}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 60"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor={`on-${listingId}`} optional>
        <textarea
          id={`on-${listingId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 400))}
          placeholder="Message to the other team…"
          rows={2}
          className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={offerMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-5 text-[13px]"
        >
          {offerMutation.isPending ? 'Sending…' : 'Send offer'}
        </Button>
      </div>
    </div>
  );
}

function ListingCard({
  listing,
  activeOfferId,
  onToggleOffer,
}: {
  listing: ScrimListing;
  activeOfferId: string | null;
  onToggleOffer: (id: string | null) => void;
}) {
  const isOfferOpen = activeOfferId === listing.id;
  const days = formatDays(listing.preferredDays);

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-semibold text-white truncate">
              {listing.teamName ?? 'Unknown team'}
              {listing.teamTag ? ` [${listing.teamTag}]` : ''}
            </p>
            <StatusPill
              label={listing.status.toUpperCase()}
              tone={LISTING_TONE[listing.status]}
            />
          </div>
          <p className="text-[12px] text-white/40 mt-0.5">
            {[listing.gameSlug, listing.modeKey, listing.regionKey]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onToggleOffer(isOfferOpen ? null : listing.id)}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 px-4 min-h-[36px] text-[13px]"
        >
          {isOfferOpen ? 'Close' : 'Make Offer'}
        </Button>
      </div>
      {days && (
        <p className="text-[12px] text-white/40">Preferred days: {days}</p>
      )}
      {listing.notes && (
        <p className="text-[13px] text-white/55 line-clamp-2">{listing.notes}</p>
      )}
      {isOfferOpen && (
        <MakeOfferForm listingId={listing.id} onClose={() => onToggleOffer(null)} />
      )}
    </div>
  );
}

export default function ScrimDiscoveryPage() {
  const discoverQuery = useDiscoverScrims(GAME_SLUG);
  const listings = discoverQuery.data ?? [];
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white w-full">
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <PageIntro eyebrow="SCRIMS" title="Find a Scrim" className="mb-6" />
      </div>

      <main className="px-4 lg:px-8 pb-8">
        {discoverQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : discoverQuery.isError ? (
          <div className="py-8 space-y-3">
            <p className="text-[14px] text-white/55">
              Could not load scrim listings. Check your connection and try again.
            </p>
            <Button
              variant="outline"
              onClick={() => discoverQuery.refetch()}
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
            >
              Retry
            </Button>
          </div>
        ) : listings.length === 0 ? (
          <div className="py-12 space-y-3">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
              VALORANT
            </p>
            <p className="text-[14px] text-white/55 max-w-md">
              No scrim listings posted yet. Ask your team to post one from the Scrim Workspace.
            </p>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="Scrim listings">
            {listings.map((listing) => (
              <div key={listing.id} role="listitem">
                <ListingCard
                  listing={listing}
                  activeOfferId={activeOfferId}
                  onToggleOffer={setActiveOfferId}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
