import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { PageIntro, InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useScrimListings,
  useListingOffers,
  useMyOffers,
  useTeamScrimSessions,
  useAcceptOffer,
  useDeclineOffer,
  useWithdrawOffer,
} from '@/hooks/competitive/useScrims';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { WorkspaceNewListingForm } from '@/components/competitive/scrims/WorkspaceNewListingForm';
import { WorkspaceListingCard } from '@/components/competitive/scrims/WorkspaceListingCard';
import { WorkspaceSessionCard } from '@/components/competitive/scrims/WorkspaceSessionCard';
import type { ScrimListing, ScrimOffer, ScrimSession } from '@/types/competitive';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamSummary {
  id: string;
  name: string;
  primaryGameSlug?: string | null;
}

// ── Tone maps ─────────────────────────────────────────────────────────────────

const OFFER_TONE = {
  pending: 'neutral',
  accepted: 'success',
  declined: 'neutral',
  withdrawn: 'neutral',
  expired: 'neutral',
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatProposedSlot(offer: ScrimOffer): string {
  if (!offer.proposedAt) return 'No time proposed';
  const d = new Date(offer.proposedAt);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const base = `${weekday} ${date} · ${time}`;
  return offer.proposedDurationMinutes
    ? `${base} · ${offer.proposedDurationMinutes}-min block`
    : base;
}

const TAB_CLASS =
  'bg-transparent text-[13px] font-medium text-white/55 ' +
  'data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-rose-500 ' +
  'rounded-none pb-1 h-full data-[state=active]:bg-transparent';

// ── Offer rows ────────────────────────────────────────────────────────────────

function ReceivedOfferRow({ offer }: { offer: ScrimOffer }) {
  const acceptMutation = useAcceptOffer(offer.id);
  const declineMutation = useDeclineOffer(offer.id);
  const isPending = acceptMutation.isPending || declineMutation.isPending;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-3 flex items-start gap-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-white truncate">
            {offer.offeringTeamName ?? offer.offeringTeamId.slice(0, 8)}
          </p>
          <StatusPill label={offer.status.toUpperCase()} tone={OFFER_TONE[offer.status]} />
        </div>
        <p className="text-[12px] text-white/45">{formatProposedSlot(offer)}</p>
        {offer.notes && (
          <p className="text-[12px] text-white/40 line-clamp-1">Message: {offer.notes}</p>
        )}
      </div>
      {offer.status === 'pending' && (
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => acceptMutation.mutate()}
            disabled={isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
          >
            {acceptMutation.isPending ? '…' : 'Accept'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => declineMutation.mutate()}
            disabled={isPending}
            className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
          >
            {declineMutation.isPending ? '…' : 'Decline'}
          </Button>
        </div>
      )}
    </div>
  );
}

function OffersForListing({ listing }: { listing: ScrimListing }) {
  const offersQuery = useListingOffers(listing.id);
  const rawOffers = offersQuery.data ?? [];
  // pending first
  const offers = [...rawOffers].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return 0;
  });

  if (offersQuery.isLoading) {
    return <div className="h-8 bg-white/[0.03] animate-pulse" />;
  }
  if (offers.length === 0) {
    return <p className="text-[13px] text-white/35">No offers received yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {offers.map((offer) => (
        <ReceivedOfferRow key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

function OutgoingOfferRow({ offer }: { offer: ScrimOffer }) {
  const withdrawMutation = useWithdrawOffer(offer.id);

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-3 flex items-start gap-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-white truncate">
            To: {offer.listingTeamName ?? offer.listingId.slice(0, 8)}
          </p>
          <StatusPill label={offer.status.toUpperCase()} tone={OFFER_TONE[offer.status]} />
        </div>
        <p className="text-[12px] text-white/45">{formatProposedSlot(offer)}</p>
      </div>
      {offer.status === 'pending' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => withdrawMutation.mutate()}
          disabled={withdrawMutation.isPending}
          className="text-[12px] text-red-300/70 hover:text-red-300 rounded-none shrink-0"
        >
          {withdrawMutation.isPending ? '…' : 'Withdraw'}
        </Button>
      )}
    </div>
  );
}

// ── Past sessions expand ──────────────────────────────────────────────────────

const PAST_COLLAPSE_THRESHOLD = 5;

function PastSessionsList({
  sessions,
  teamId,
}: {
  sessions: ScrimSession[];
  teamId: string;
}) {
  const [expanded, setExpanded] = useState(sessions.length <= PAST_COLLAPSE_THRESHOLD);

  const visible = expanded ? sessions : sessions.slice(0, 0);

  return (
    <div className="space-y-2">
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-[13px] text-white/40 hover:text-white/70 transition-colors"
        >
          Show {sessions.length} past session{sessions.length !== 1 ? 's' : ''}
        </button>
      )}
      {expanded &&
        visible.map((s) => <WorkspaceSessionCard key={s.id} session={s} teamId={teamId} />)}
      {expanded && sessions.length > PAST_COLLAPSE_THRESHOLD && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[13px] text-white/40 hover:text-white/70 transition-colors"
        >
          Collapse
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScrimWorkspacePage() {
  const [searchParams] = useSearchParams();
  const [showNewListing, setShowNewListing] = useState(false);

  const teamsQuery = useMyTeamsSummary();
  const teams = (teamsQuery.data ?? []) as TeamSummary[];

  const urlTeamId = searchParams.get('team_id');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const resolvedTeamId = selectedTeamId || urlTeamId || teams[0]?.id || '';
  const activeTeam = teams.find((t) => t.id === resolvedTeamId) ?? teams[0] ?? null;
  const gameSlug = activeTeam?.primaryGameSlug ?? null;

  const listingsQuery = useScrimListings(resolvedTeamId);
  const myOffersQuery = useMyOffers(resolvedTeamId);
  const sessionsQuery = useTeamScrimSessions(resolvedTeamId);

  const listings = listingsQuery.data ?? [];
  const myOffers = myOffersQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const pendingOfferCount = myOffers.filter((o) => o.status === 'pending').length;
  const upcomingSessions = sessions
    .filter((s) => s.status === 'scheduled' || s.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime());
  const pastSessions = sessions
    .filter((s) => s.status === 'completed' || s.status === 'cancelled' || s.status === 'disputed')
    .sort((a, b) => new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime());

  // loading state
  if (teamsQuery.isLoading) {
    return (
      <CompetitivePageShell>
        <div className="px-4 py-8 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-white/[0.06]" />
          <div className="h-4 w-64 bg-white/[0.04]" />
        </div>
      </CompetitivePageShell>
    );
  }

  // no team
  if (!resolvedTeamId) {
    return (
      <CompetitivePageShell>
        <div className="px-4 py-8">
          <InlineNotice tone="neutral">
            You need to be on a team to use Your Scrims.
          </InlineNotice>
        </div>
      </CompetitivePageShell>
    );
  }

  return (
    <CompetitivePageShell>
      <div className="flex min-h-[100dvh]">
        {/* ── Left panel (desktop) ── */}
        <aside className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-white/[0.06] px-5 pt-8 pb-6 gap-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
            YOUR SCRIMS
          </p>

          {/* Team selector */}
          {teams.length > 1 ? (
            <select
              value={resolvedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              aria-label="Select team"
              className="h-9 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white focus:outline-none focus:border-white/30"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.primaryGameSlug ? ` · ${t.primaryGameSlug.toUpperCase().slice(0, 3)}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[13px] text-white/70">{activeTeam?.name ?? '—'}</p>
          )}

          {/* Post a listing CTA */}
          <Button
            onClick={() => setShowNewListing((v) => !v)}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px] w-full [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
          >
            {showNewListing ? 'Cancel' : 'Post a listing'}
          </Button>

          {/* Stats block */}
          <div className="space-y-2 border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Active listings</span>
              <span className="text-white/70 tabular-nums">
                {listings.filter((l) => l.status === 'open').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Pending offers</span>
              <span
                className={
                  pendingOfferCount > 0
                    ? 'text-rose-400 font-semibold tabular-nums'
                    : 'text-white/70 tabular-nums'
                }
              >
                {pendingOfferCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Upcoming sessions</span>
              <span className="text-white/70 tabular-nums">{upcomingSessions.length}</span>
            </div>
          </div>

          {/* Find a scrim link */}
          <Link
            to="/competitive/scrims"
            className="text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Find a scrim
          </Link>
        </aside>

        {/* ── Main panel ── */}
        <div className="flex-1 px-4 lg:px-8 pt-8 pb-8 space-y-4">
          {/* Mobile header */}
          <div className="flex items-start justify-between gap-4 lg:hidden">
            <PageIntro eyebrow="YOUR SCRIMS" title="Your Scrims" />
            <Button
              onClick={() => setShowNewListing((v) => !v)}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 text-[13px]"
            >
              {showNewListing ? 'Cancel' : 'Post a listing'}
            </Button>
          </div>

          {/* Mobile team selector */}
          {teams.length > 1 && (
            <div className="lg:hidden px-0 mb-4">
              <select
                value={resolvedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                aria-label="Select team"
                className="h-9 w-full border border-white/10 bg-black/30 px-3 text-[13px] text-white focus:outline-none focus:border-white/30"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.primaryGameSlug ? ` · ${t.primaryGameSlug.toUpperCase().slice(0, 3)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desktop title */}
          <div className="hidden lg:block">
            <PageIntro eyebrow="YOUR SCRIMS" title="Your Scrims" />
          </div>

          {/* New listing form */}
          {showNewListing && (
            <WorkspaceNewListingForm
              teamId={resolvedTeamId}
              gameSlug={gameSlug}
              onSuccess={() => setShowNewListing(false)}
              onCancel={() => setShowNewListing(false)}
            />
          )}

          {/* Tabs */}
          <Tabs defaultValue="listings">
            <div className="border-b border-white/[0.08]">
              <TabsList className="bg-transparent p-0 h-10 gap-6">
                <TabsTrigger value="listings" className={TAB_CLASS}>
                  Listings{' '}
                  <span className="ml-1 font-mono text-[10px] inline-flex items-center px-1.5 text-white/30">
                    {listings.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="offers" className={TAB_CLASS}>
                  Offers{' '}
                  <span
                    className={`ml-1 font-mono text-[10px] inline-flex items-center px-1.5 ${
                      pendingOfferCount > 0
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'text-white/30'
                    }`}
                  >
                    {pendingOfferCount > 0 ? pendingOfferCount : myOffers.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="sessions" className={TAB_CLASS}>
                  Sessions{' '}
                  <span className="ml-1 font-mono text-[10px] inline-flex items-center px-1.5 text-white/30">
                    {upcomingSessions.length}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Listings tab */}
            <TabsContent value="listings" className="mt-4 focus-visible:outline-none">
              {listingsQuery.isLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-14 bg-white/[0.04] border border-white/[0.06]" />
                  ))}
                </div>
              ) : listingsQuery.isError ? (
                <Button
                  variant="outline"
                  onClick={() => listingsQuery.refetch()}
                  className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
                >
                  Retry
                </Button>
              ) : listings.length === 0 ? (
                <p className="text-[14px] text-white/40 py-6">
                  No listings yet. Post one to start finding scrims.
                </p>
              ) : (
                <div className="space-y-2">
                  {listings.map((l) => (
                    <WorkspaceListingCard key={l.id} listing={l} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Offers tab */}
            <TabsContent value="offers" className="mt-4 focus-visible:outline-none space-y-6">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35 mb-3">
                  RECEIVED
                </p>
                {listingsQuery.isLoading ? (
                  <div className="h-8 bg-white/[0.03] animate-pulse" />
                ) : listings.length === 0 ? (
                  <p className="text-[13px] text-white/35">No offers received yet.</p>
                ) : (
                  <div className="space-y-4">
                    {listings.map((listing) => (
                      <div key={listing.id}>
                        <p className="text-[12px] text-white/40 mb-1.5">
                          {[listing.modeKey, listing.regionKey].filter(Boolean).join(' · ') ||
                            'Any mode / region'}
                          {listing.scheduleType === 'recurring' && (
                            <span className="ml-2 font-mono text-[10px] text-white/30">
                              RECURRING
                            </span>
                          )}
                        </p>
                        <OffersForListing listing={listing} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35 mb-3">
                  OUTGOING
                </p>
                {myOffersQuery.isLoading ? (
                  <div className="h-8 bg-white/[0.03] animate-pulse" />
                ) : myOffers.length === 0 ? (
                  <p className="text-[13px] text-white/35">No outgoing offers.</p>
                ) : (
                  <div className="space-y-1.5">
                    {myOffers.map((offer) => (
                      <OutgoingOfferRow key={offer.id} offer={offer} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Sessions tab */}
            <TabsContent value="sessions" className="mt-4 focus-visible:outline-none">
              {sessionsQuery.isLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.06]" />
                  ))}
                </div>
              ) : sessionsQuery.isError ? (
                <div className="space-y-2">
                  <p className="text-[13px] text-white/40">Could not load sessions.</p>
                  <Button
                    variant="outline"
                    onClick={() => sessionsQuery.refetch()}
                    className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
                  >
                    Retry
                  </Button>
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-[14px] text-white/40 py-6">
                  No sessions yet. Accept an offer to create one.
                </p>
              ) : (
                <div className="space-y-6">
                  {upcomingSessions.length > 0 && (
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35 mb-3">
                        UPCOMING ({upcomingSessions.length})
                      </p>
                      <div className="space-y-2">
                        {upcomingSessions.map((s) => (
                          <WorkspaceSessionCard key={s.id} session={s} teamId={resolvedTeamId} />
                        ))}
                      </div>
                    </div>
                  )}

                  {pastSessions.length > 0 && (
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35 mb-3">
                        PAST ({pastSessions.length})
                      </p>
                      <PastSessionsList sessions={pastSessions} teamId={resolvedTeamId} />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </CompetitivePageShell>
  );
}
