import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { InlineNotice } from '@/components/ui/kit';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { WorkspaceNewListingForm } from '@/components/competitive/scrims/WorkspaceNewListingForm';
import { WorkspaceListingCard } from '@/components/competitive/scrims/WorkspaceListingCard';
import { WorkspaceSection } from '@/components/competitive/scrims/workspace/WorkspaceSection';
import { ScrimTeamHeader } from '@/components/competitive/scrims/workspace/ScrimTeamHeader';
import { UpNextList } from '@/components/competitive/scrims/workspace/UpNextList';
import { ReceivedOfferCard } from '@/components/competitive/scrims/workspace/ReceivedOfferCard';
import { OutgoingOfferCard } from '@/components/competitive/scrims/workspace/OutgoingOfferCard';
import { ScrimAgenda } from '@/components/competitive/scrims/workspace/ScrimAgenda';
import { ScrimHistory } from '@/components/competitive/scrims/workspace/ScrimHistory';
import {
  useScrimListings,
  useMyOffers,
  useTeamScrimSessions,
  usePendingReceivedOffers,
} from '@/hooks/competitive/useScrims';
import { useScrimUpNext } from '@/hooks/competitive/useScrimUpNext';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { useNow } from '@/hooks/useNow';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { splitSessions } from '@/services/scrimAgenda';
import { findOverlappingListings, formatPreferredDays } from '@/services/scrimUtils';

/** Shape of /api/teams/me (not camel-cased). */
interface TeamSummary {
  id: string;
  name: string;
  logo_url?: string | null;
  primary_game_slug?: string | null;
}

const RETRY_BUTTON =
  'border border-white/[0.14] px-4 py-2 text-[13px] text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

export default function ScrimWorkspacePage() {
  const [searchParams] = useSearchParams();
  const reduce = useReducedMotion();
  const catalog = useGameCatalogContext();
  const nowMs = useNow(30_000);
  const [showNewListing, setShowNewListing] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedGame, setSelectedGame] = useState('');

  const teamsQuery = useMyTeamsSummary();
  const teams = (teamsQuery.data ?? []) as TeamSummary[];
  const teamId = selectedTeamId || searchParams.get('team_id') || teams[0]?.id || '';
  const team = teams.find((t) => t.id === teamId) ?? teams[0] ?? null;
  const gameSlug = selectedGame || team?.primary_game_slug || catalog.games[0]?.slug || null;

  function changeGame(slug: string) {
    setSelectedGame(slug);
    const match = teams.find((t) => t.primary_game_slug === slug);
    if (match) setSelectedTeamId(match.id);
  }

  const listingsQuery = useScrimListings(teamId);
  const offersQuery = useMyOffers(teamId);
  const sessionsQuery = useTeamScrimSessions(teamId);
  const listings = useMemo(() => listingsQuery.data ?? [], [listingsQuery.data]);
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const sentOffers = offersQuery.data ?? [];

  const { offers: receivedOffers } = usePendingReceivedOffers(listings);
  const upNextQuery = useScrimUpNext(team?.id);
  const actionItems = (upNextQuery.data?.items ?? []).filter((i) => i.type !== 'offer_received');

  const queuedSessionIds = useMemo(
    () => new Set(actionItems.flatMap((i) => (i.sessionId ? [i.sessionId] : []))),
    [actionItems],
  );

  const { active, history } = useMemo(() => splitSessions(sessions), [sessions]);
  const needsCount = actionItems.length + receivedOffers.length;
  const summary = sessionsQuery.isLoading
    ? ''
    : `${active.length} upcoming · ${history.filter((s) => s.status === 'completed').length} played`;

  const listingOverlaps = useMemo(() => {
    const labels = new Map<string, string[]>();
    for (const [id, otherIds] of findOverlappingListings(listings)) {
      labels.set(id, otherIds.map((otherId) => {
        const other = listings.find((l) => l.id === otherId);
        const days = other ? formatPreferredDays(other.preferredDays).join('/') : '';
        return days ? `${days} listing` : 'another listing';
      }));
    }
    return labels;
  }, [listings]);

  const arrive = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18, delay } };

  return (
    <CompetitivePageShell>
      {teamsQuery.isLoading && (
        <div className="animate-pulse space-y-4 px-4 py-8 lg:px-8">
          <div className="h-24 border border-white/[0.06] bg-white/[0.03]" />
          <div className="h-4 w-64 bg-white/[0.04]" />
        </div>
      )}

      {!teamsQuery.isLoading && !teamId && (
        <div className="px-4 py-8 lg:px-8">
          <InlineNotice tone="neutral">You need to be on a team to use Scrims.</InlineNotice>
        </div>
      )}

      {!teamsQuery.isLoading && teamId && team && (
        <div className="mx-auto max-w-[1100px] space-y-8 px-4 pb-16 pt-6 lg:px-8 lg:pt-8">
          <motion.div {...arrive(0)}>
            <ScrimTeamHeader
              team={{ id: team.id, name: team.name, logoUrl: team.logo_url ?? null }}
              teams={teams.map((t) => ({ id: t.id, name: t.name, logoUrl: t.logo_url ?? null }))}
              onTeamChange={setSelectedTeamId}
              games={catalog.games.map((g) => ({ slug: g.slug, name: g.name }))}
              gameSlug={gameSlug}
              onGameChange={changeGame}
              summary={summary}
              onNewScrim={() => setShowNewListing(true)}
            />
          </motion.div>

          <motion.div {...arrive(0.05)}>
            <WorkspaceSection id="needs-you" title="Needs you" count={needsCount}>
              {needsCount === 0 ? (
                <p className="border border-white/[0.08] px-4 py-3 text-[13px] text-zinc-400">
                  Nothing needs you right now. New offers and match-day actions will show up here.
                </p>
              ) : (
                <div className="space-y-3">
                  <UpNextList items={actionItems} />
                  {receivedOffers.length > 0 && (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {receivedOffers.map((offer) => <ReceivedOfferCard key={offer.id} offer={offer} />)}
                    </div>
                  )}
                </div>
              )}
            </WorkspaceSection>
          </motion.div>

          <motion.div {...arrive(0.1)} className="space-y-4">
            <WorkspaceSection id="coming-up" title="Coming up" count={active.length}>
              <ScrimAgenda
                sessions={active}
                teamId={teamId}
                nowMs={nowMs}
                queuedSessionIds={queuedSessionIds}
                isLoading={sessionsQuery.isLoading}
                isError={sessionsQuery.isError}
                onRetry={() => void sessionsQuery.refetch()}
                onNewScrim={() => setShowNewListing(true)}
              />
            </WorkspaceSection>
            {!sessionsQuery.isLoading && !sessionsQuery.isError && (
              <ScrimHistory sessions={history} teamId={teamId} defaultOpen={active.length === 0} />
            )}
          </motion.div>

          <motion.div {...arrive(0.15)}>
            <WorkspaceSection id="listings" title="Your listings" count={listings.length}>
              {listingsQuery.isLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2].map((i) => <div key={i} className="h-[88px] border border-white/[0.06] bg-white/[0.04]" />)}
                </div>
              ) : listingsQuery.isError ? (
                <div className="space-y-2">
                  <p className="text-[13px] text-white/45">Could not load listings.</p>
                  <button type="button" onClick={() => void listingsQuery.refetch()} className={RETRY_BUTTON}>Retry</button>
                </div>
              ) : listings.length === 0 ? (
                <p className="text-[13px] text-zinc-400">No active listings. Post one and teams can send you requests.</p>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {listings.map((l) => (
                    <WorkspaceListingCard key={l.id} listing={l} overlappingWith={listingOverlaps.get(l.id) ?? []} />
                  ))}
                </div>
              )}
            </WorkspaceSection>
          </motion.div>

          {(offersQuery.isLoading || sentOffers.length > 0) && (
            <motion.div {...arrive(0.2)}>
              <WorkspaceSection id="sent-offers" title="Requests you sent" count={sentOffers.length}>
                {offersQuery.isLoading ? (
                  <div className="grid animate-pulse gap-3 xl:grid-cols-2">
                    {[1, 2].map((i) => <div key={i} className="h-[72px] border border-white/[0.06] bg-white/[0.04]" />)}
                  </div>
                ) : (
                  <div className="grid gap-3 xl:grid-cols-2">
                    {sentOffers.map((offer) => <OutgoingOfferCard key={offer.id} offer={offer} />)}
                  </div>
                )}
              </WorkspaceSection>
            </motion.div>
          )}
        </div>
      )}

      <Dialog open={showNewListing} onOpenChange={setShowNewListing}>
        <DialogContent className="max-h-[90vh] max-w-xl gap-0 overflow-y-auto rounded-2xl border-white/[0.1] p-0">
          <DialogTitle className="sr-only">New scrim listing</DialogTitle>
          <WorkspaceNewListingForm
            teamId={teamId}
            gameSlug={gameSlug}
            onSuccess={() => setShowNewListing(false)}
            onCancel={() => setShowNewListing(false)}
          />
        </DialogContent>
      </Dialog>
    </CompetitivePageShell>
  );
}
