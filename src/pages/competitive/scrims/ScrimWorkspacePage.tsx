import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageIntro, InlineNotice, StatusPill, Field } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useScrimListings,
  useCreateScrimListing,
  usePauseListing,
  useCloseListing,
  useListingOffers,
  useMyOffers,
  useAcceptOffer,
  useDeclineOffer,
  useWithdrawOffer,
  useTeamScrimSessions,
  useStartScrimSession,
  useCompleteScrimSession,
  useCancelScrimSession,
  useReportScrimResult,
} from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import type { ScrimListing, ScrimOffer, ScrimSession } from '@/types/competitive';

// --- Status tone maps ---

const LISTING_TONE = { open: 'accent', paused: 'neutral', closed: 'neutral' } as const;
const OFFER_TONE = {
  pending: 'neutral',
  accepted: 'success',
  declined: 'neutral',
  withdrawn: 'neutral',
  expired: 'neutral',
} as const;
const SESSION_TONE = {
  scheduled: 'neutral',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'warning',
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// --- Listings tab ---

function NewListingForm({
  teamId,
  onSuccess,
  onCancel,
}: {
  teamId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const createMutation = useCreateScrimListing();
  const [mode, setMode] = useState('');
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    try {
      await createMutation.mutateAsync({
        teamId,
        modeKey: mode.trim() || undefined,
        regionKey: region.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not create listing. Try again.'));
    }
  }

  return (
    <div className="border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        NEW SCRIM LISTING
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mode" htmlFor="sl-mode" optional>
          <input
            id="sl-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            placeholder="e.g. competitive"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
        <Field label="Region" htmlFor="sl-region" optional>
          <input
            id="sl-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. EU, NA"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor="sl-notes" optional>
        <textarea
          id="sl-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 500))}
          placeholder="Preferred playstyle, requirements…"
          rows={2}
          className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 resize-none"
        />
      </Field>
      {apiError && <InlineNotice tone="critical">{apiError}</InlineNotice>}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-[13px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-5 text-[13px]"
        >
          {createMutation.isPending ? 'Creating…' : 'Post listing'}
        </Button>
      </div>
    </div>
  );
}

function ListingCard({ listing }: { listing: ScrimListing }) {
  const pauseMutation = usePauseListing(listing.id);
  const closeMutation = useCloseListing(listing.id);
  const isPending = pauseMutation.isPending || closeMutation.isPending;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 flex items-center gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill label={listing.status.toUpperCase()} tone={LISTING_TONE[listing.status]} />
          <p className="text-[13px] text-white/40">
            {[listing.modeKey, listing.regionKey].filter(Boolean).join(' · ') || 'Any mode / region'}
          </p>
        </div>
        {listing.notes && (
          <p className="text-[13px] text-white/55 line-clamp-1">{listing.notes}</p>
        )}
        <p className="text-[11px] text-white/25">Created {formatDate(listing.createdAt)}</p>
      </div>
      <div className="flex gap-2 shrink-0">
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
            onClick={() => pauseMutation.mutate()}
            disabled={isPending}
            className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
          >
            Reopen
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
  );
}

// --- Offers tab ---

function ReceivedOfferRow({ offer }: { offer: ScrimOffer }) {
  const acceptMutation = useAcceptOffer(offer.id);
  const declineMutation = useDeclineOffer(offer.id);
  const isPending = acceptMutation.isPending || declineMutation.isPending;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-white truncate">
            {offer.offeringTeamName ?? offer.offeringTeamId.slice(0, 8)}
          </p>
          <StatusPill label={offer.status.toUpperCase()} tone={OFFER_TONE[offer.status]} />
        </div>
        <p className="text-[11px] text-white/35 mt-0.5">
          {offer.proposedAt ? formatDate(offer.proposedAt) : 'No time proposed'}
          {offer.proposedDurationMinutes ? ` · ${offer.proposedDurationMinutes}m` : ''}
        </p>
        {offer.notes && <p className="text-[12px] text-white/45 mt-1 line-clamp-1">{offer.notes}</p>}
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
  const offers = offersQuery.data ?? [];

  if (offersQuery.isLoading) {
    return <div className="h-8 bg-white/[0.03] animate-pulse" />;
  }
  if (offers.length === 0) {
    return <p className="text-[12px] text-white/30 py-2">No offers yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {offers.map((offer) => <ReceivedOfferRow key={offer.id} offer={offer} />)}
    </div>
  );
}

function OutgoingOfferRow({ offer }: { offer: ScrimOffer }) {
  const withdrawMutation = useWithdrawOffer(offer.id);

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-white truncate">
            To: {offer.listingTeamName ?? offer.listingId.slice(0, 8)}
          </p>
          <StatusPill label={offer.status.toUpperCase()} tone={OFFER_TONE[offer.status]} />
        </div>
        <p className="text-[11px] text-white/35 mt-0.5">
          {offer.proposedAt ? formatDate(offer.proposedAt) : 'No time proposed'}
          {offer.proposedDurationMinutes ? ` · ${offer.proposedDurationMinutes}m` : ''}
        </p>
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

// --- Sessions tab ---

function ReportResultForm({
  session,
  teamId,
  onClose,
}: {
  session: ScrimSession;
  teamId: string;
  onClose: () => void;
}) {
  const reportMutation = useReportScrimResult(session.id);
  const [t1Score, setT1Score] = useState('');
  const [t2Score, setT2Score] = useState('');
  const [notes, setNotes] = useState('');
  const [apiError, setApiError] = useState('');

  async function handleSubmit() {
    setApiError('');
    const s1 = parseInt(t1Score, 10);
    const s2 = parseInt(t2Score, 10);
    if (isNaN(s1) || isNaN(s2)) {
      setApiError('Both scores are required.');
      return;
    }
    try {
      await reportMutation.mutateAsync({
        reportingTeamId: teamId,
        team1Score: s1,
        team2Score: s2,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setApiError(getApiErrorMessage(err, 'Could not submit result. Try again.'));
    }
  }

  return (
    <div className="mt-3 border border-white/10 bg-black/30 p-3 space-y-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
        REPORT RESULT
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={session.team1Name ?? 'Team 1 score'} htmlFor={`rs-t1-${session.id}`}>
          <input
            id={`rs-t1-${session.id}`}
            type="number"
            min={0}
            value={t1Score}
            onChange={(e) => setT1Score(e.target.value)}
            placeholder="0"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
        <Field label={session.team2Name ?? 'Team 2 score'} htmlFor={`rs-t2-${session.id}`}>
          <input
            id={`rs-t2-${session.id}`}
            type="number"
            min={0}
            value={t2Score}
            onChange={(e) => setT2Score(e.target.value)}
            placeholder="0"
            className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
          />
        </Field>
      </div>
      <Field label="Notes" htmlFor={`rs-notes-${session.id}`} optional>
        <input
          id={`rs-notes-${session.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 300))}
          placeholder="Any context…"
          className="h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
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
          disabled={reportMutation.isPending}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none px-4 text-[13px]"
        >
          {reportMutation.isPending ? 'Saving…' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}

function ScrimSessionRow({ session, teamId }: { session: ScrimSession; teamId: string }) {
  const [showReport, setShowReport] = useState(false);
  const startMutation = useStartScrimSession(session.id);
  const completeMutation = useCompleteScrimSession(session.id);
  const cancelMutation = useCancelScrimSession(session.id);
  const isPending = startMutation.isPending || completeMutation.isPending || cancelMutation.isPending;
  const opponent = session.team1Id === teamId ? session.team2Name : session.team1Name;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-2">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-white truncate">
              vs {opponent ?? 'Opponent'}
            </p>
            <StatusPill
              label={session.status.replace('_', ' ').toUpperCase()}
              tone={SESSION_TONE[session.status]}
            />
          </div>
          <p className="text-[12px] text-white/40 mt-0.5">
            {formatDate(session.scheduledAt)}
            {session.durationMinutes ? ` · ${session.durationMinutes}m` : ''}
            {session.lobbyCode ? ` · Lobby: ${session.lobbyCode}` : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          {session.status === 'scheduled' && (
            <Button
              size="sm"
              onClick={() => startMutation.mutate()}
              disabled={isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
            >
              {startMutation.isPending ? '…' : 'Start'}
            </Button>
          )}
          {session.status === 'in_progress' && (
            <>
              <Button
                size="sm"
                onClick={() => completeMutation.mutate()}
                disabled={isPending}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
              >
                {completeMutation.isPending ? '…' : 'Complete'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowReport((v) => !v)}
                className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
              >
                Report result
              </Button>
            </>
          )}
          {session.status === 'completed' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowReport((v) => !v)}
              className="text-[12px] text-white/55 hover:text-white rounded-none border border-white/[0.08]"
            >
              Report result
            </Button>
          )}
          {(session.status === 'scheduled' || session.status === 'in_progress') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancelMutation.mutate()}
              disabled={isPending}
              className="text-[12px] text-red-300/70 hover:text-red-300 rounded-none"
            >
              {cancelMutation.isPending ? '…' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
      {showReport && (
        <ReportResultForm
          session={session}
          teamId={teamId}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

// --- Main page ---

const TAB_CLASS =
  'bg-transparent text-[13px] font-medium text-white/55 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none pb-1 h-full data-[state=active]:bg-transparent';

export default function ScrimWorkspacePage() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team_id') ?? '';
  const [showNewListing, setShowNewListing] = useState(false);

  const listingsQuery = useScrimListings(teamId);
  const myOffersQuery = useMyOffers(teamId);
  const sessionsQuery = useTeamScrimSessions(teamId);

  const listings = listingsQuery.data ?? [];
  const myOffers = myOffersQuery.data ?? [];
  const sessions = sessionsQuery.data ?? [];

  if (!teamId) {
    return (
      <CompetitivePageShell>
        <div className="px-4 py-8">
          <InlineNotice tone="critical">No team ID provided. Add ?team_id= to the URL.</InlineNotice>
        </div>
      </CompetitivePageShell>
    );
  }

  return (
    <CompetitivePageShell>
      <div className="flex min-h-[100dvh]">
        {/* Left panel — desktop workspace divider */}
        <div className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-white/[0.06] px-5 pt-8 pb-6 gap-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
            SCRIM WORKSPACE
          </p>
          <Button
            onClick={() => setShowNewListing((v) => !v)}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[13px] w-full [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
          >
            {showNewListing ? 'Cancel' : 'New Listing'}
          </Button>
          <div className="space-y-2 border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Listings</span>
              <span className="text-white/70 tabular-nums">{listings.length}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Offers</span>
              <span className="text-white/70 tabular-nums">{myOffers.length}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-white/40">Sessions</span>
              <span className="text-white/70 tabular-nums">{sessions.length}</span>
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 px-4 lg:px-8 pt-8 pb-8 space-y-4">
          {/* Mobile header */}
          <div className="flex items-start justify-between gap-4 lg:hidden">
            <PageIntro eyebrow="SCRIM WORKSPACE" title="Scrims" />
            <Button
              onClick={() => setShowNewListing((v) => !v)}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 text-[13px]"
            >
              {showNewListing ? 'Cancel' : 'New Listing'}
            </Button>
          </div>
          <div className="hidden lg:block">
            <PageIntro eyebrow="SCRIM WORKSPACE" title="Scrims" />
          </div>

          {showNewListing && (
            <NewListingForm
              teamId={teamId}
              onSuccess={() => setShowNewListing(false)}
              onCancel={() => setShowNewListing(false)}
            />
          )}

        <Tabs defaultValue="listings">
          <div className="border-b border-white/[0.08]">
            <TabsList className="bg-transparent p-0 h-10 gap-6">
              {(
                [
                  { value: 'listings', label: 'Listings', count: listings.length },
                  { value: 'offers', label: 'Offers', count: myOffers.length },
                  { value: 'sessions', label: 'Sessions', count: sessions.length },
                ] as const
              ).map(({ value, label, count }) => (
                <TabsTrigger key={value} value={value} className={TAB_CLASS}>
                  {label} <span className="ml-1 text-white/30">{count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="listings" className="mt-4 focus-visible:outline-none">
            {listingsQuery.isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2].map((i) => <div key={i} className="h-14 bg-white/[0.04] border border-white/[0.06]" />)}
              </div>
            ) : listingsQuery.isError ? (
              <Button variant="outline" onClick={() => listingsQuery.refetch()} className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]">
                Retry
              </Button>
            ) : listings.length === 0 ? (
              <p className="text-[14px] text-white/40 py-6">No listings yet. Post one above.</p>
            ) : (
              <div className="space-y-2">
                {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="offers" className="mt-4 focus-visible:outline-none space-y-6">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35 mb-3">
                RECEIVED
              </p>
              {listingsQuery.isLoading ? (
                <div className="h-8 bg-white/[0.03] animate-pulse" />
              ) : listings.length === 0 ? (
                <p className="text-[13px] text-white/35">No listings to show offers for.</p>
              ) : (
                <div className="space-y-4">
                  {listings.map((listing) => (
                    <div key={listing.id}>
                      <p className="text-[12px] text-white/40 mb-1.5">
                        {[listing.modeKey, listing.regionKey].filter(Boolean).join(' · ') || 'Listing'}
                        {' '}·{' '}
                        <span className="text-white/25">{listing.status}</span>
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
                  {myOffers.map((offer) => <OutgoingOfferRow key={offer.id} offer={offer} />)}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sessions" className="mt-4 focus-visible:outline-none">
            {sessionsQuery.isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2].map((i) => <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.06]" />)}
              </div>
            ) : sessionsQuery.isError ? (
              <Button variant="outline" onClick={() => sessionsQuery.refetch()} className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]">
                Retry
              </Button>
            ) : sessions.length === 0 ? (
              <p className="text-[14px] text-white/40 py-6">No sessions yet. Accept an offer to create one.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => <ScrimSessionRow key={s.id} session={s} teamId={teamId} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </CompetitivePageShell>
  );
}
