/**
 * FindTeammatesPage — PROJ-075 T11.
 * Route: /competitive/find-teammates
 * Two tabs: "Looking for Team" (LFG listings + recruitment openings)
 *           "Looking for Player" (player profiles with lookingForTeam=true)
 * Desktop: 240px filter rail + card grid. Mobile: filter bottom sheet.
 */
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, X, Users, Search, Plus } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useDiscoverPlayers, useDiscoverLfg } from '@/hooks/competitive/useDiscovery';
import { useMyLfgListings } from '@/hooks/competitive/useLfg';
import { useCatalogRankTiers, useCatalogGameRoles, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useDiscoverOpenings } from '@/hooks/competitive/useRecruitment';
import { useAuth } from '@/hooks/useAuth';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { LfgDiscoveryCard } from '@/components/competitive/LfgDiscoveryCard';
import { PlayerDiscoveryCard } from '@/components/competitive/PlayerDiscoveryCard';
import { RecruitmentOpeningCard } from '@/components/competitive/RecruitmentOpeningCard';
import { FindTeammatesFilterPanel, INITIAL_FILTER, activeFilterCount } from '@/components/competitive/FindTeammatesFilterPanel';
import { CreateListingSheet } from '@/components/competitive/CreateListingSheet';
import type { FilterState } from '@/components/competitive/FindTeammatesFilterPanel';
import type { LfgListing } from '@/types/competitive';
import type { RecruitmentOpening } from '@/types/competitive';

const GAME = 'valorant';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-3" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 bg-white/[0.06]" />
          <div className="h-3 w-20 bg-white/[0.04]" />
        </div>
        <div className="h-5 w-16 bg-white/[0.04]" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-white/[0.06] shrink-0" />
        <div className="h-4 w-36 bg-white/[0.06]" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-white/[0.04]" />
        <div className="h-5 w-16 bg-white/[0.04]" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-white/[0.04]" />
        <div className="h-3 w-3/4 bg-white/[0.04]" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, heading, sub, action }: { icon: React.ReactNode; heading: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 flex flex-col items-center gap-4 text-center">
      {icon}
      <p className="text-[15px] font-medium text-white/55">{heading}</p>
      {sub && <p className="text-[13px] text-white/35 max-w-[280px]">{sub}</p>}
      {action}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FeedItem = { type: 'listing'; data: LfgListing } | { type: 'opening'; data: RecruitmentOpening };

export default function FindTeammatesPage() {
  const { user } = useAuth();
  const reduced = useReducedMotion() ?? false;

  const [activeTab, setActiveTab] = useState<'lfteam' | 'lfplayer'>('lfteam');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const ranksQuery = useCatalogRankTiers(GAME);
  const rolesQuery = useCatalogGameRoles(GAME);
  const regionsQuery = useCatalogRegions(GAME);
  const myListingsQuery = useMyLfgListings();

  const lfgQuery = useDiscoverLfg({
    game: GAME,
    intent: filters.intents.length ? filters.intents : undefined,
    minRank: filters.minRank,
    maxRank: filters.maxRank,
    regionKey: filters.regionKey,
    limit: 20,
  });
  const openingsQuery = useDiscoverOpenings(GAME);
  const playersQuery = useDiscoverPlayers({
    game: GAME,
    roles: filters.roles.length ? filters.roles : undefined,
    minRank: filters.minRank,
    maxRank: filters.maxRank,
    regionKey: filters.regionKey,
    lookingForTeam: true,
    limit: 20,
  });

  const ranks = ranksQuery.data ?? [];
  const gameRoles = rolesQuery.data ?? [];
  const regions = regionsQuery.data ?? [];
  const myListingsCount = myListingsQuery.data?.length ?? 0;
  const filterCount = activeFilterCount(filters, activeTab === 'lfteam');

  const mixedFeed = useMemo<FeedItem[]>(() => {
    const listings = (lfgQuery.data ?? []).map<FeedItem>(l => ({ type: 'listing', data: l }));
    const openings = (openingsQuery.data ?? [])
      .filter(o => o.status === 'open')
      .map<FeedItem>(o => ({ type: 'opening', data: o }));
    let merged = [...listings, ...openings].sort(
      (a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime(),
    );
    if (filters.roles.length) {
      merged = merged.filter(item =>
        item.type !== 'listing' || item.data.preferredRoles.some(r => filters.roles.includes(r)),
      );
    }
    return merged;
  }, [lfgQuery.data, openingsQuery.data, filters.roles]);

  const lfTeamLoading = lfgQuery.isLoading || openingsQuery.isLoading;
  const lfTeamError = lfgQuery.isError || openingsQuery.isError;

  return (
    <CompetitivePageShell>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight">
            Find Teammates
          </h1>
          <div className="flex items-center gap-3 shrink-0">
            {myListingsCount > 0 && (
              <Link to="/competitive/lfg/mine" className="text-[13px] text-white/55 hover:text-white transition-colors hidden sm:block">
                My Listings
              </Link>
            )}
            <button
              type="button"
              onClick={() => setCreateSheetOpen(true)}
              aria-label="Create Listing"
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 h-9 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Create Listing</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 px-6 h-10 flex items-end border-b border-white/[0.08]"
        style={{ backgroundColor: '#08080a' }}
      >
        <div role="tablist" className="flex gap-6">
          {(['lfteam', 'lfplayer'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tabpanel-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`relative pb-2 text-[13px] font-medium transition-colors ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              {tab === 'lfteam' ? 'Looking for Team' : 'Looking for Player'}
              {activeTab === tab && (
                <motion.div
                  layoutId="find-teammates-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-500"
                  transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mobile filter bar ──────────────────────────────────────────────── */}
      <div className="lg:hidden sticky top-10 z-10 flex items-center justify-between px-4 py-2 border-b border-white/[0.08]" style={{ backgroundColor: '#08080a' }}>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="flex items-center gap-2 text-[13px] text-white/55 hover:text-white min-h-[44px]"
          aria-label={filterCount > 0 ? `Filters, ${filterCount} active` : 'Filters'}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
        </button>
        <span className="text-[11px] font-mono text-white/35">
          {activeTab === 'lfteam' ? 'Most recent' : 'By rank'}
        </span>
        <span aria-live="polite" className="sr-only">
          {filterCount > 0 ? `${filterCount} filter${filterCount > 1 ? 's' : ''} active` : 'No filters active'}
        </span>
      </div>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <div className="flex">

        {/* Desktop filter panel */}
        <aside className="hidden lg:block w-[240px] shrink-0 sticky top-10 h-[calc(100vh-var(--header-height,160px))] overflow-y-auto border-r border-white/[0.06] pr-5 py-6 pl-6">
          <FindTeammatesFilterPanel
            filters={filters}
            onChange={setFilters}
            ranks={ranks}
            gameRoles={gameRoles}
            regions={regions}
            showIntents={activeTab === 'lfteam'}
          />
        </aside>

        {/* Card area */}
        <main id={`tabpanel-${activeTab}`} role="tabpanel" className="flex-1 px-4 lg:pl-6 lg:pr-6 py-4">

          {/* Sort disclosure */}
          <p className="text-[11px] font-mono text-white/35 mb-3">
            {activeTab === 'lfteam'
              ? 'Sorted by most recent. Results are not AI-ranked.'
              : 'Sorted by rank (self-reported). Results are not AI-ranked.'}
          </p>

          {/* My Listings banner */}
          {myListingsCount > 0 && (
            <p className="text-[12px] text-white/40 mb-3">
              You have {myListingsCount} listing{myListingsCount > 1 ? 's' : ''}.{' '}
              <Link to="/competitive/lfg/mine" className="text-white/60 hover:text-white transition-colors">Manage →</Link>
            </p>
          )}

          {/* LF Team tab */}
          {activeTab === 'lfteam' && (
            lfTeamLoading ? (
              <div className="space-y-2">{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</div>
            ) : lfTeamError ? (
              <div className="py-10 space-y-3">
                <p className="text-[14px] text-white/55">Could not load listings. Check your connection and try again.</p>
                <button type="button" onClick={() => { void lfgQuery.refetch(); void openingsQuery.refetch(); }}
                  className="border border-white/[0.08] bg-transparent text-white text-[13px] px-4 py-2 hover:bg-white/[0.07] transition-colors">
                  Retry
                </button>
              </div>
            ) : mixedFeed.length === 0 ? (
              filterCount > 0 ? (
                <EmptyState
                  icon={<Search className="h-8 w-8 text-white/25" />}
                  heading="No listings match your filters."
                  sub="Try adjusting your rank range or region."
                  action={<button type="button" onClick={() => setFilters(INITIAL_FILTER)} className="text-[13px] text-white/50 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors">Clear filters</button>}
                />
              ) : (
                <EmptyState
                  icon={<Users className="h-8 w-8 text-white/25" />}
                  heading="No listings yet. Be the first — post yours and let teammates find you."
                  action={<button type="button" onClick={() => setCreateSheetOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 py-2 transition-colors">Create Listing</button>}
                />
              )
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3" role="list" aria-label="Team listings and openings">
                {mixedFeed.map((item, i) => (
                  <motion.div
                    key={item.type === 'listing' ? item.data.id : `opening-${item.data.id}`}
                    role="listitem"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: [0.2, 0, 0, 1], delay: reduced ? 0 : Math.min(i, 5) * 0.03 }}
                  >
                    {item.type === 'listing'
                      ? <LfgDiscoveryCard listing={item.data} gameRoles={gameRoles} currentUserId={user?.id} />
                      : <RecruitmentOpeningCard opening={item.data} />}
                  </motion.div>
                ))}
              </div>
            )
          )}

          {/* LF Player tab */}
          {activeTab === 'lfplayer' && (
            playersQuery.isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map(i => <SkeletonCard key={i} />)}</div>
            ) : playersQuery.isError ? (
              <div className="py-10 space-y-3">
                <p className="text-[14px] text-white/55">Could not load listings. Check your connection and try again.</p>
                <button type="button" onClick={() => void playersQuery.refetch()}
                  className="border border-white/[0.08] bg-transparent text-white text-[13px] px-4 py-2 hover:bg-white/[0.07] transition-colors">
                  Retry
                </button>
              </div>
            ) : (playersQuery.data ?? []).length === 0 ? (
              filterCount > 0 ? (
                <EmptyState
                  icon={<Search className="h-8 w-8 text-white/25" />}
                  heading="No players match these filters."
                  action={<button type="button" onClick={() => setFilters(INITIAL_FILTER)} className="text-[13px] text-white/50 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors">Clear filters</button>}
                />
              ) : (
                <EmptyState
                  icon={<Users className="h-8 w-8 text-white/25" />}
                  heading="No players are looking for a team right now."
                />
              )
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3" role="list" aria-label="Players looking for team">
                {(playersQuery.data ?? []).map((player, i) => (
                  <motion.div
                    key={player.userId}
                    role="listitem"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: [0.2, 0, 0, 1], delay: reduced ? 0 : Math.min(i, 5) * 0.03 }}
                  >
                    <PlayerDiscoveryCard player={player} gameRoles={gameRoles} />
                  </motion.div>
                ))}
              </div>
            )
          )}
        </main>
      </div>

      {/* ── Mobile filter sheet ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {filterSheetOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterSheetOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="Filters"
              aria-modal="true"
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-[#111111] border-t border-white/[0.08] flex flex-col lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
              <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-white/[0.08] shrink-0">
                <span className="text-[14px] font-semibold text-white">Filters</span>
                <button type="button" onClick={() => setFilterSheetOpen(false)} aria-label="Close filters" className="p-1 text-white/55 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <FindTeammatesFilterPanel
                  filters={filters}
                  onChange={setFilters}
                  ranks={ranks}
                  gameRoles={gameRoles}
                  regions={regions}
                  showIntents={activeTab === 'lfteam'}
                />
              </div>
              <div className="sticky bottom-0 flex items-center justify-end gap-3 px-4 py-4 border-t border-white/[0.08] bg-[#111111] shrink-0">
                <button type="button" onClick={() => setFilters(INITIAL_FILTER)} className="text-[13px] text-white/55 hover:text-white px-4 py-2">Clear</button>
                <button type="button" onClick={() => setFilterSheetOpen(false)} className="bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-6 py-2 transition-colors">Apply</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Create Listing Sheet ────────────────────────────────────────────── */}
      <CreateListingSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        ranks={ranks}
        gameRoles={gameRoles}
        regions={regions}
      />
    </CompetitivePageShell>
  );
}
