import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useScrimListings,
  useMyOffers,
  useTeamScrimSessions,
  useAcceptOffer,
  useDeclineOffer,
  useWithdrawOffer,
  usePendingReceivedOffers,
} from '@/hooks/competitive/useScrims';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { WorkspaceNewListingForm } from '@/components/competitive/scrims/WorkspaceNewListingForm';
import { WorkspaceListingCard } from '@/components/competitive/scrims/WorkspaceListingCard';
import { WorkspaceSessionCard } from '@/components/competitive/scrims/WorkspaceSessionCard';
import { ScrimHistoryList } from '@/components/competitive/scrims/ScrimHistoryList';
import type { ScrimOffer } from '@/types/competitive';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamSummary {
  id: string;
  name: string;
  primary_game_slug?: string | null;
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
    ? `${base} · ${offer.proposedDurationMinutes} min`
    : base;
}

// ── Offer rows ────────────────────────────────────────────────────────────────

function ReceivedOfferRow({ offer }: { offer: ScrimOffer }) {
  const acceptMutation = useAcceptOffer(offer.id);
  const declineMutation = useDeclineOffer(offer.id);
  const isPending = acceptMutation.isPending || declineMutation.isPending;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-start gap-3">
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

function OutgoingOfferRow({ offer }: { offer: ScrimOffer }) {
  const withdrawMutation = useWithdrawOffer(offer.id);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 flex items-start gap-3">
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

// ── Skeletons ─────────────────────────────────────────────────────────────────

function TwoRowSkeleton({ height }: { height: string }) {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className={`${height} bg-white/[0.04] border border-white/[0.06]`} />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScrimWorkspacePage() {
  const [searchParams] = useSearchParams();
  const [showNewListing, setShowNewListing] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const teamsQuery = useMyTeamsSummary();
  const teams = (teamsQuery.data ?? []) as TeamSummary[];

  const urlTeamId = searchParams.get('team_id');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const resolvedTeamId = selectedTeamId || urlTeamId || teams[0]?.id || '';
  const activeTeam = teams.find((t) => t.id === resolvedTeamId) ?? teams[0] ?? null;

  const catalog = useGameCatalogContext();
  const [selectedGame, setSelectedGame] = useState<string>('');
  const gameSlug = selectedGame || activeTeam?.primary_game_slug || catalog.games[0]?.slug || null;

  const listingsQuery = useScrimListings(resolvedTeamId);
  const myOffersQuery = useMyOffers(resolvedTeamId);
  const sessionsQuery = useTeamScrimSessions(resolvedTeamId);

  const listings = listingsQuery.data ?? [];
  const myOffers = myOffersQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  const upcomingSessions = sessions
    .filter((s) => s.status === 'scheduled' || s.status === 'in_progress')
    .sort((a, b) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime());
  const pastSessions = sessions
    .filter((s) => s.status === 'completed' || s.status === 'cancelled' || s.status === 'disputed')
    .sort((a, b) => new Date(b.scheduledAt ?? 0).getTime() - new Date(a.scheduledAt ?? 0).getTime());

  const { offers: pendingReceivedOffers, isLoading: isOffersLoading } = usePendingReceivedOffers(listings);

  const isCountersLoading = listingsQuery.isLoading || sessionsQuery.isLoading || isOffersLoading;

  const openListingsCount = listings.filter((l) => l.status === 'open').length;
  const pendingReceivedCount = pendingReceivedOffers.length;
  const upcomingSessionsCount = upcomingSessions.length;

  const statCounters = [
    { value: isCountersLoading ? '—' : openListingsCount, label: 'LISTINGS', accent: false },
    { value: isCountersLoading ? '—' : pendingReceivedCount, label: 'OFFERS', accent: !isCountersLoading && pendingReceivedCount > 0 },
    { value: isCountersLoading ? '—' : upcomingSessionsCount, label: 'SESSIONS', accent: false },
  ];

  return (
    <CompetitivePageShell>
      {teamsQuery.isLoading && (
        <div className="px-4 py-8 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-white/[0.06]" />
          <div className="h-4 w-64 bg-white/[0.04]" />
        </div>
      )}

      {!teamsQuery.isLoading && !resolvedTeamId && (
        <div className="px-6 py-8">
          <InlineNotice tone="neutral">You need to be on a team to use Scrims.</InlineNotice>
        </div>
      )}

      {!teamsQuery.isLoading && resolvedTeamId && (
        <div className="min-h-[100dvh]">

          {/* ── Header strip — desktop ─────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-4 px-6 py-4 border-b border-white/[0.08]">
            {/* Logo placeholder */}
            <div className="h-8 w-8 bg-white/[0.06] shrink-0" aria-hidden />

            {/* Team name — static or Select */}
            {teams.length > 1 ? (
              <Select value={resolvedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger
                  aria-label="Select team"
                  className="h-auto py-0 border-none bg-transparent px-0 focus:ring-0 shadow-none text-[18px] font-bold text-white/90 [font-family:var(--font-heading)] truncate max-w-[200px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[18px] font-bold text-white/90 [font-family:var(--font-heading)] truncate">
                {activeTeam?.name ?? '—'}
              </p>
            )}

            {/* Game badge */}
            {catalog.games.length > 1 ? (
              <Select value={gameSlug ?? ''} onValueChange={setSelectedGame}>
                <SelectTrigger
                  aria-label="Select game"
                  className="h-auto py-0.5 px-2.5 border-none bg-white/[0.08] rounded-full font-mono text-[11px] tracking-widest text-white/50 uppercase focus:ring-0 shadow-none w-auto"
                >
                  <SelectValue placeholder="Game" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.games.map((g) => (
                    <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : gameSlug ? (
              <span className="inline-flex items-center rounded-full bg-white/[0.08] px-2.5 py-0.5 font-mono text-[11px] tracking-widest text-white/50 uppercase shrink-0">
                {catalog.games.find((g) => g.slug === gameSlug)?.name ?? gameSlug.toUpperCase()}
              </span>
            ) : null}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Stat counters */}
            <div className="flex items-center gap-6" role="group" aria-label="Workspace summary">
              {statCounters.map(({ value, label, accent }) => (
                <span
                  key={label}
                  aria-label={`${value} ${label.toLowerCase()}`}
                  className="flex items-baseline gap-1.5"
                >
                  <span
                    aria-hidden
                    className={`text-[15px] font-bold tabular-nums [font-family:var(--font-heading)] leading-none ${accent ? 'text-rose-400' : 'text-white/60'}`}
                  >
                    {value}
                  </span>
                  <span aria-hidden className="text-[10px] font-mono tracking-widest text-white/30 uppercase">
                    {label}
                  </span>
                </span>
              ))}
            </div>

            {/* New Listing button */}
            <Button
              onClick={() => setShowNewListing((v) => !v)}
              aria-expanded={showNewListing}
              className={`h-9 px-4 text-[13px] font-semibold shrink-0 ${
                showNewListing
                  ? 'bg-white/[0.08] text-white/60 hover:bg-white/[0.12]'
                  : 'bg-rose-500 hover:bg-rose-600 text-white'
              }`}
            >
              {showNewListing ? 'Cancel' : 'New Listing'}
            </Button>
          </div>

          {/* ── Header strip — mobile ──────────────────────────────────────── */}
          <div className="lg:hidden flex flex-col gap-2 px-4 py-3 border-b border-white/[0.08]">
            {/* Row 1: logo + team name + game badge */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 bg-white/[0.06] shrink-0" aria-hidden />
              {teams.length > 1 ? (
                <Select value={resolvedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger
                    aria-label="Select team"
                    className="h-auto py-0 border-none bg-transparent px-0 focus:ring-0 shadow-none text-[16px] font-bold text-white/90 [font-family:var(--font-heading)] truncate min-w-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[16px] font-bold text-white/90 [font-family:var(--font-heading)] truncate min-w-0">
                  {activeTeam?.name ?? '—'}
                </p>
              )}
              {catalog.games.length > 1 ? (
                <Select value={gameSlug ?? ''} onValueChange={setSelectedGame}>
                  <SelectTrigger
                    aria-label="Select game"
                    className="h-auto py-0.5 px-2.5 border-none bg-white/[0.08] rounded-full font-mono text-[11px] tracking-widest text-white/50 uppercase focus:ring-0 shadow-none w-auto shrink-0"
                  >
                    <SelectValue placeholder="Game" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.games.map((g) => (
                      <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : gameSlug ? (
                <span className="inline-flex items-center rounded-full bg-white/[0.08] px-2.5 py-0.5 font-mono text-[11px] tracking-widest text-white/50 uppercase shrink-0">
                  {catalog.games.find((g) => g.slug === gameSlug)?.name ?? gameSlug.toUpperCase()}
                </span>
              ) : null}
            </div>

            {/* Row 2: stat counters */}
            <div className="flex items-center gap-4 pl-9" role="group" aria-label="Workspace summary">
              {statCounters.map(({ value, label, accent }) => (
                <span
                  key={label}
                  aria-label={`${value} ${label.toLowerCase()}`}
                  className="flex items-baseline gap-1"
                >
                  <span
                    aria-hidden
                    className={`text-[14px] font-bold tabular-nums [font-family:var(--font-heading)] ${accent ? 'text-rose-400' : 'text-white/60'}`}
                  >
                    {value}
                  </span>
                  <span aria-hidden className="text-[10px] font-mono tracking-widest text-white/30 uppercase">
                    {label}
                  </span>
                </span>
              ))}
            </div>

            {/* Row 3: New Listing button full-width */}
            <Button
              onClick={() => setShowNewListing((v) => !v)}
              aria-expanded={showNewListing}
              className={`w-full h-9 text-[13px] font-semibold ${
                showNewListing
                  ? 'bg-white/[0.08] text-white/60 hover:bg-white/[0.12]'
                  : 'bg-rose-500 hover:bg-rose-600 text-white'
              }`}
            >
              {showNewListing ? 'Cancel' : 'New Listing'}
            </Button>
          </div>

          {/* ── New Listing form ───────────────────────────────────────────── */}
          <AnimatePresence>
            {showNewListing && (
              <div key="new-listing-form" className="border-b border-white/[0.06] px-6 py-4">
                <WorkspaceNewListingForm
                  teamId={resolvedTeamId}
                  gameSlug={gameSlug}
                  onSuccess={() => setShowNewListing(false)}
                  onCancel={() => setShowNewListing(false)}
                />
              </div>
            )}
          </AnimatePresence>

          {/* ── Attention strip ────────────────────────────────────────────── */}
          <AnimatePresence>
            {pendingReceivedOffers.length > 0 && (
              <motion.section
                key="attention-strip"
                aria-label="Pending offers"
                initial={prefersReducedMotion ? false : { opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="border-l-[3px] border-rose-500 bg-rose-500/[0.04] px-6 py-4"
              >
                <div className="space-y-2">
                  {pendingReceivedOffers.map((offer) => (
                    <ReceivedOfferRow key={offer.id} offer={offer} />
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* ── Content sections ──────────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-12 space-y-10">

            {/* Active Listings */}
            <section aria-labelledby="section-active-listings">
              <h2
                id="section-active-listings"
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-3"
              >
                ACTIVE LISTINGS
              </h2>
              {listingsQuery.isLoading ? (
                <TwoRowSkeleton height="h-[88px]" />
              ) : listingsQuery.isError ? (
                <div className="py-4 space-y-2">
                  <p className="text-[13px] text-white/40">Could not load listings.</p>
                  <button
                    type="button"
                    onClick={() => listingsQuery.refetch()}
                    className="text-[13px] text-white/55 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : listings.length === 0 ? (
                <div className="py-6">
                  <p className="text-[14px] text-white/40">
                    No active listings. Post one to start finding scrims.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNewListing(true)}
                    className="mt-3 text-[13px] text-white/55 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors"
                  >
                    New Listing
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {listings.map((l) => (
                    <WorkspaceListingCard key={l.id} listing={l} />
                  ))}
                </div>
              )}
            </section>

            {/* Outgoing Offers */}
            <section aria-labelledby="section-outgoing-offers">
              <h2
                id="section-outgoing-offers"
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-3"
              >
                OUTGOING OFFERS
              </h2>
              {myOffersQuery.isLoading ? (
                <div className="space-y-1.5 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-[72px] bg-white/[0.04] border border-white/[0.06]" />
                  ))}
                </div>
              ) : myOffersQuery.isError ? (
                <div className="py-4 space-y-2">
                  <p className="text-[13px] text-white/40">Could not load offers.</p>
                  <button
                    type="button"
                    onClick={() => myOffersQuery.refetch()}
                    className="text-[13px] text-white/55 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : myOffers.length === 0 ? (
                <p className="py-4 text-[14px] text-white/40">No outgoing offers yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {myOffers.map((offer) => (
                    <OutgoingOfferRow key={offer.id} offer={offer} />
                  ))}
                </div>
              )}
            </section>

            {/* Scheduled Scrims */}
            <section aria-labelledby="section-scheduled-scrims">
              <h2
                id="section-scheduled-scrims"
                className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-3"
              >
                SCHEDULED SCRIMS
              </h2>
              {sessionsQuery.isLoading ? (
                <TwoRowSkeleton height="h-[96px]" />
              ) : sessionsQuery.isError ? (
                <div className="py-4 space-y-2">
                  <p className="text-[13px] text-white/40">Could not load sessions.</p>
                  <button
                    type="button"
                    onClick={() => sessionsQuery.refetch()}
                    className="text-[13px] text-white/55 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : upcomingSessions.length === 0 ? (
                <p className="py-4 text-[14px] text-white/40">
                  No scheduled scrims yet. Accept an offer to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingSessions.map((s) => (
                    <WorkspaceSessionCard key={s.id} session={s} teamId={resolvedTeamId} />
                  ))}
                </div>
              )}
            </section>

            {/* Recent Results — only rendered when data is loaded and past sessions exist */}
            {!sessionsQuery.isLoading && pastSessions.length > 0 && (
              <section aria-labelledby="section-recent-results">
                <h2
                  id="section-recent-results"
                  className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-3"
                >
                  RECENT RESULTS
                </h2>
                <ScrimHistoryList teamId={resolvedTeamId} />
              </section>
            )}

          </div>
        </div>
      )}
    </CompetitivePageShell>
  );
}
