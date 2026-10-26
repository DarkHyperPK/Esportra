import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Search, Users, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDiscoverLfg } from '@/hooks/competitive/useDiscovery';
import { useMyLfgListings } from '@/hooks/competitive/useLfg';
import { useCatalogRankTiers, useCatalogGameRoles, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useAuth } from '@/hooks/useAuth';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { PlayerLfgCard } from '@/components/competitive/PlayerLfgCard';
import { FindTeammatesFilterPanel, INITIAL_FILTER, activeFilterCount } from '@/components/competitive/FindTeammatesFilterPanel';
import type { FilterState } from '@/components/competitive/FindTeammatesFilterPanel';

const GAME = 'valorant';

function SkeletonCard() {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.03] p-4 space-y-3" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 bg-white/[0.06] rounded" />
          <div className="h-3 w-20 bg-white/[0.04] rounded" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-white/[0.06] shrink-0" />
        <div className="h-4 w-36 bg-white/[0.06] rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-full bg-white/[0.04] rounded" />
        <div className="h-3 w-3/4 bg-white/[0.04] rounded" />
      </div>
    </div>
  );
}

export default function LookingForTeamPage() {
  const { user } = useAuth();
  const reduced = useReducedMotion() ?? false;
  const navigate = useNavigate();

  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const ranksQuery = useCatalogRankTiers(GAME);
  const rolesQuery = useCatalogGameRoles(GAME);
  const regionsQuery = useCatalogRegions(GAME);
  const myListingsQuery = useMyLfgListings();

  const lfgQuery = useDiscoverLfg({
    game: GAME,
    intent: ['looking_for_team'],
    minRank: filters.minRank,
    maxRank: filters.maxRank,
    regionKey: filters.regionKey,
    limit: 30,
  });

  const ranks = ranksQuery.data ?? [];
  const gameRoles = rolesQuery.data ?? [];
  const regions = regionsQuery.data ?? [];
  const myListingsCount = myListingsQuery.data?.length ?? 0;
  const filterCount = activeFilterCount(filters, false);
  const listings = lfgQuery.data ?? [];

  return (
    <CompetitivePageShell>
      <div className="px-6 pt-8 pb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
        <div className="flex items-center justify-between gap-4">
          <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight">
            Find a Team
          </h1>
          <div className="flex items-center gap-3 shrink-0">
            {myListingsCount > 0 && (
              <Link to="/competitive/lfg/mine" className="text-[13px] text-white/55 hover:text-white transition-colors hidden sm:block">
                My Listings
              </Link>
            )}
            <button
              type="button"
              onClick={() => navigate('/competitive/looking-for-team/create')}
              className="flex items-center gap-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 h-9 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Create Listing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile filter bar */}
      <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-white/[0.08]" style={{ backgroundColor: '#08080a' }}>
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="flex items-center gap-2 text-[13px] text-white/55 hover:text-white min-h-[44px]"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {filterCount > 0 ? `Filters (${filterCount})` : 'Filters'}
        </button>
        <span className="text-[11px] font-mono text-white/35">Most recent</span>
      </div>

      <div className="flex">
        <aside className="hidden lg:block w-[240px] shrink-0 sticky top-0 h-[calc(100vh-160px)] overflow-y-auto border-r border-white/[0.06] pr-5 py-6 pl-6">
          <FindTeammatesFilterPanel
            filters={filters}
            onChange={setFilters}
            ranks={ranks}
            gameRoles={gameRoles}
            regions={regions}
            showIntents={false}
          />
        </aside>

        <main className="flex-1 px-4 lg:pl-6 lg:pr-6 py-4">
          <p className="text-[11px] font-mono text-white/35 mb-3">
            Sorted by most recent. Players looking for a team.
          </p>

          {myListingsCount > 0 && (
            <p className="text-[12px] text-white/40 mb-3">
              You have {myListingsCount} listing{myListingsCount > 1 ? 's' : ''}.{' '}
              <Link to="/competitive/lfg/mine" className="text-white/60 hover:text-white transition-colors">Manage</Link>
            </p>
          )}

          {lfgQuery.isLoading ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
          ) : lfgQuery.isError ? (
            <div className="py-10 space-y-3">
              <p className="text-[14px] text-white/55">Could not load listings.</p>
              <button type="button" onClick={() => void lfgQuery.refetch()}
                className="rounded-md border border-white/[0.08] bg-transparent text-white text-[13px] px-4 py-2 hover:bg-white/[0.07]">
                Retry
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-4 text-center">
              {filterCount > 0 ? (
                <>
                  <Search className="h-8 w-8 text-white/25" />
                  <p className="text-[15px] font-medium text-white/55">No listings match your filters.</p>
                  <button type="button" onClick={() => setFilters(INITIAL_FILTER)} className="rounded-md text-[13px] text-white/50 hover:text-white border border-white/[0.08] px-4 py-2">Clear filters</button>
                </>
              ) : (
                <>
                  <Users className="h-8 w-8 text-white/25" />
                  <p className="text-[15px] font-medium text-white/55">No listings yet. Be the first.</p>
                  <button type="button" onClick={() => navigate('/competitive/looking-for-team/create')} className="rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 py-2">Create Listing</button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3" role="list">
              {listings.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  role="listitem"
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1], delay: reduced ? 0 : Math.min(i, 5) * 0.03 }}
                >
                  <PlayerLfgCard listing={listing} gameRoles={gameRoles} currentUserId={user?.id} />
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Mobile filter sheet */}
      {filterSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setFilterSheetOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto bg-[#0c0c0e] border-t border-white/[0.08] p-6">
            <FindTeammatesFilterPanel
              filters={filters}
              onChange={setFilters}
              ranks={ranks}
              gameRoles={gameRoles}
              regions={regions}
              showIntents={false}
            />
            <button type="button" onClick={() => setFilterSheetOpen(false)}
              className="mt-4 w-full rounded-md bg-rose-500 text-white text-[13px] py-2.5">
              Apply
            </button>
          </div>
        </div>
      )}

    </CompetitivePageShell>
  );
}
