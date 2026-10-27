import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SlidersHorizontal, Search, Users, Plus, LayoutGrid, List } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDiscoverLfg } from '@/hooks/competitive/useDiscovery';
import { useMyLfgListings } from '@/hooks/competitive/useLfg';
import { useCatalogRankTiers, useCatalogGameRoles, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useAuth } from '@/hooks/useAuth';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { PlayerLfgCard } from '@/components/competitive/PlayerLfgCard';
import { PlayerLfgCardGrid } from '@/components/competitive/PlayerLfgCardGrid';
import { FindTeammatesFilterPanel, INITIAL_FILTER, activeFilterCount } from '@/components/competitive/FindTeammatesFilterPanel';
import type { FilterState } from '@/components/competitive/FindTeammatesFilterPanel';

type ViewMode = 'list' | 'grid';

function getViewMode(): ViewMode {
  try { return (localStorage.getItem('lfg-view-mode') as ViewMode) ?? 'list'; } catch { return 'list'; }
}
function saveViewMode(v: ViewMode) {
  try { localStorage.setItem('lfg-view-mode', v); } catch { /* ignore */ }
}

const GAME = 'valorant';

function SkeletonCard() {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.025] px-3 py-3.5" aria-hidden>
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded bg-white/[0.06] shrink-0" />
        <div className="flex-1 h-3.5 w-32 bg-white/[0.06] rounded" />
        <div className="h-3 w-16 bg-white/[0.04] rounded" />
        <div className="h-3 w-8 bg-white/[0.03] rounded" />
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
  const [viewMode, setViewMode] = useState<ViewMode>(getViewMode);

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
  const myPublished = (myListingsQuery.data ?? []).filter(
    (l) => l.intent === 'looking_for_team' && l.status === 'published'
  );
  const listings = [...myPublished, ...(lfgQuery.data ?? [])];

  return (
    <CompetitivePageShell>
      <div className="px-6 pt-8 pb-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
        <div className="flex items-center justify-between gap-4 mb-5">
          <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight">
            Matchmaking
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center border border-white/[0.08]">
              <button
                type="button"
                onClick={() => { setViewMode('list'); saveViewMode('list'); }}
                title="List view"
                className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-white/[0.08] text-white' : 'text-white/35 hover:text-white/60'}`}
              >
                <List className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('grid'); saveViewMode('grid'); }}
                title="Grid view"
                className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-white/[0.08] text-white' : 'text-white/35 hover:text-white/60'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate('/competitive/looking-for-team/create')}
              className="flex items-center gap-1.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-4 h-9 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">I'm Looking</span>
            </button>
          </div>
        </div>

        {/* Pane tabs */}
        <div className="flex items-center gap-0 border-b border-white/[0.08]">
          <Link
            to="/competitive/looking-for-team"
            className="px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors border-rose-500 text-white"
          >
            Find a Team
            <span className="ml-1.5 text-[10px] text-white/30">Players LFT</span>
          </Link>
          <Link
            to="/competitive/looking-for-player"
            className="px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors border-transparent text-white/40 hover:text-white/70"
          >
            Find Players
            <span className="ml-1.5 text-[10px] text-white/20">Teams LFP</span>
          </Link>
          {myListingsCount > 0 && (
            <Link
              to="/competitive/lfg/mine"
              className="ml-auto px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-colors border-transparent text-white/40 hover:text-white/70"
            >
              My Listings
              <span className="ml-1 text-[10px] text-rose-400/70">{myListingsCount}</span>
            </Link>
          )}
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
                </>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2" role="list">
              {listings.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  role="listitem"
                  initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.14, ease: [0.2, 0, 0, 1], delay: reduced ? 0 : Math.min(i, 12) * 0.015 }}
                >
                  <PlayerLfgCardGrid listing={listing} gameRoles={gameRoles} ranks={ranks} currentUserId={user?.id} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5" role="list">
              {listings.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  role="listitem"
                  initial={reduced ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.14, ease: [0.2, 0, 0, 1], delay: reduced ? 0 : Math.min(i, 8) * 0.02 }}
                >
                  <PlayerLfgCard listing={listing} gameRoles={gameRoles} ranks={ranks} currentUserId={user?.id} />
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
