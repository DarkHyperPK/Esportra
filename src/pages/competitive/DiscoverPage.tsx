import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, X, Users, Search } from 'lucide-react';
import { PageIntro } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, useReducedMotion } from 'framer-motion';
import { useDiscoverPlayers, useDiscoverLfg } from '@/hooks/competitive/useDiscovery';
import { useRankTiers, useGameRoles, useGameRegions } from '@/hooks/competitive/useCatalogCompetitive';
import { usePlatformFeatures, FEATURES } from '@/hooks/usePlatformFeatures';
import { useAuth } from '@/hooks/useAuth';
import { SortDisclosure } from '@/components/competitive/SortDisclosure';
import { PlayerDiscoveryCard } from '@/components/competitive/PlayerDiscoveryCard';
import { LfgDiscoveryCard } from '@/components/competitive/LfgDiscoveryCard';
import { FilterPanel } from '@/components/competitive/FilterPanel';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import type { PlayerSearchFilters, LfgSearchFilters } from '@/types/competitive';

const GAME_SLUG = 'valorant';

function SkeletonCard() {
  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 space-y-3 opacity-60">
      <div className="flex gap-3">
        <div className="h-10 w-10 bg-white/[0.06] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-white/[0.06]" />
          <div className="h-3 w-24 bg-white/[0.04]" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-white/[0.04]" />
        <div className="h-6 w-16 bg-white/[0.04]" />
      </div>
    </div>
  );
}

type EmptyStateProps = {
  icon: React.ReactNode;
  heading: string;
  subMessage?: string;
  action?: React.ReactNode;
};

function EmptyState({ icon, heading, subMessage, action }: EmptyStateProps) {
  return (
    <div className="py-16 flex flex-col items-center gap-4 text-center">
      {icon}
      <p className="text-[15px] font-medium text-white/55">{heading}</p>
      {subMessage && <p className="text-[13px] text-white/35 max-w-xs">{subMessage}</p>}
      {action}
    </div>
  );
}

function activeFilterCount(filters: PlayerSearchFilters | LfgSearchFilters): number {
  let count = 0;
  if ('roles' in filters && filters.roles?.length) count++;
  if ('lftOnly' in filters && filters.lftOnly) count++;
  if ('intent' in filters && (filters as LfgSearchFilters).intent?.length) count++;
  if (filters.minRank) count++;
  if (filters.maxRank) count++;
  if (filters.region) count++;
  return count;
}

export default function DiscoverPage() {
  const { isEnabled } = usePlatformFeatures();
  const { profile } = useAuth();
  const [selectedGame, setSelectedGame] = useState('');
  const [activeTab, setActiveTab] = useState('players');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [playerFilters, setPlayerFilters] = useState<PlayerSearchFilters>({ game: GAME_SLUG });
  const [lfgFilters, setLfgFilters] = useState<LfgSearchFilters>({ game: GAME_SLUG });
  const reduced = useReducedMotion() ?? false;

  const rankTiersQuery = useRankTiers(GAME_SLUG);
  const rolesQuery = useGameRoles(GAME_SLUG);
  const regionsQuery = useGameRegions(GAME_SLUG);

  const playersQuery = useDiscoverPlayers({ ...playerFilters, game: selectedGame });
  const lfgQuery = useDiscoverLfg({ ...lfgFilters, game: selectedGame });

  const lfgEnabled = isEnabled(FEATURES.lfg);
  const catalogReady = !rankTiersQuery.isLoading && !rolesQuery.isLoading && !regionsQuery.isLoading;
  const rankTiers = rankTiersQuery.data ?? [];
  const gameRoles = rolesQuery.data ?? [];
  const regions = regionsQuery.data ?? [];

  if (!isEnabled(FEATURES.competitiveProfiles)) {
    return null;
  }

  const currentFilters = activeTab === 'players' ? playerFilters : lfgFilters;
  const filterCount = selectedGame ? activeFilterCount(currentFilters) : 0;

  return (
    <CompetitivePageShell>
      {/* Page header */}
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <PageIntro eyebrow="COMPETITIVE DISCOVERY" title="Discover" className="mb-6" />

        {/* Game selector */}
        <Select value={selectedGame} onValueChange={setSelectedGame}>
          <SelectTrigger
            aria-label="Select a game"
            aria-required="true"
            className="w-full rounded-none border-white/10 bg-black/30 text-white text-[15px] h-12"
          >
            <SelectValue placeholder="Select a game" />
          </SelectTrigger>
          <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
            <SelectItem value="valorant">Valorant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-0 z-20 border-b border-white/[0.08] px-4 lg:px-8" style={{ backgroundColor: '#08080a' }}>
          <TabsList className="bg-transparent p-0 h-10 gap-6">
            <TabsTrigger
              value="players"
              disabled={!selectedGame}
              className="bg-transparent text-[13px] font-medium text-white/55 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none pb-1 h-full data-[state=active]:bg-transparent"
            >
              Find Players
            </TabsTrigger>
            {lfgEnabled && (
              <TabsTrigger
                value="lfg"
                disabled={!selectedGame}
                className="bg-transparent text-[13px] font-medium text-white/55 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none pb-1 h-full data-[state=active]:bg-transparent"
              >
                Find LFG
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Mobile filter bar */}
        {selectedGame && (
          <div className="sticky top-10 z-10 lg:hidden flex items-center justify-between px-4 py-2 border-b border-white/[0.08]" style={{ backgroundColor: '#08080a' }}>
            <button
              type="button"
              onClick={() => setShowFilterSheet(true)}
              aria-label={filterCount > 0 ? `Filters, ${filterCount} active` : 'Filters'}
              className="flex items-center gap-2 text-[13px] text-white/55 hover:text-white"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filterCount > 0 ? `Filters · ${filterCount}` : 'Filters'}
            </button>
          </div>
        )}

        {/* Main layout */}
        <div className="flex gap-0 lg:gap-6 px-0 lg:px-8 py-4">
          {/* Desktop filter sidebar */}
          {selectedGame && catalogReady && (
            <aside
              role="search"
              aria-label="Player filters"
              className="hidden lg:block w-[280px] shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-white/[0.08] px-5 py-6"
            >
              {activeTab === 'players' ? (
                <FilterPanel
                  mode="players"
                  filters={playerFilters}
                  onChange={setPlayerFilters}
                  gameRoles={gameRoles}
                  regions={regions}
                  rankTiers={rankTiers}
                />
              ) : (
                <FilterPanel
                  mode="lfg"
                  filters={lfgFilters}
                  onChange={setLfgFilters}
                  regions={regions}
                  rankTiers={rankTiers}
                />
              )}
            </aside>
          )}

          {/* Results */}
          <main className="flex-1 px-4 lg:px-0">
            <TabsContent value="players" className="mt-0 focus-visible:outline-none">
              {!selectedGame ? (
                <EmptyState
                  icon={<Users className="h-8 w-8 text-white/25" />}
                  heading="Select a game to discover players"
                  subMessage="Choose a game above to see competitive profiles."
                />
              ) : playersQuery.isLoading ? (
                <div className="space-y-2 pt-2">
                  <SortDisclosure text="Sorted by rank (self-reported). Results are not AI-ranked." />
                  {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
              ) : playersQuery.isError ? (
                <div className="py-8 space-y-3">
                  <p className="text-[14px] text-white/55">Could not load results. Check your connection and try again.</p>
                  <Button variant="outline" onClick={() => playersQuery.refetch()}
                    className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]">
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 pt-2" role="list" aria-label="Player results">
                  <SortDisclosure text="Sorted by rank (self-reported). Results are not AI-ranked." />
                  {(playersQuery.data ?? []).length === 0 ? (
                    filterCount > 0 ? (
                      <EmptyState
                        icon={<Search className="h-8 w-8 text-white/25" />}
                        heading="No players match these filters"
                        subMessage="Try adjusting your rank or region filter."
                        action={
                          <button type="button" onClick={() => setPlayerFilters({ game: GAME_SLUG })}
                            className="text-[13px] text-white/50 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors">
                            Clear filters
                          </button>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={<Users className="h-8 w-8 text-white/25" />}
                        heading="No players match these filters"
                        subMessage="Try adjusting your rank or region filter."
                        action={
                          <button type="button" onClick={() => setPlayerFilters({ game: GAME_SLUG })}
                            className="text-[13px] text-white/50 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors">
                            Clear filters
                          </button>
                        }
                      />
                    )
                  ) : (
                    <motion.div
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      {(playersQuery.data ?? []).map((player) => (
                        <div key={player.userId} role="listitem" className="mb-2">
                          <PlayerDiscoveryCard player={player} />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </TabsContent>

            {lfgEnabled && (
              <TabsContent value="lfg" className="mt-0 focus-visible:outline-none">
                {!selectedGame ? (
                  <EmptyState
                    icon={<Users className="h-8 w-8 text-white/25" />}
                    heading="Select a game to see LFG listings"
                    subMessage="Choose a game above to see players looking for a team."
                  />
                ) : lfgQuery.isLoading ? (
                  <div className="space-y-2 pt-2">
                    <SortDisclosure text="Sorted by most recent. Results are not AI-ranked." />
                    {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                  </div>
                ) : lfgQuery.isError ? (
                  <div className="py-8 space-y-3">
                    <p className="text-[14px] text-white/55">Could not load results. Check your connection and try again.</p>
                    <Button variant="outline" onClick={() => lfgQuery.refetch()}
                      className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]">
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2" role="list" aria-label="LFG results">
                    <SortDisclosure text="Sorted by most recent. Results are not AI-ranked." />
                    {(lfgQuery.data ?? []).length === 0 ? (
                      filterCount > 0 ? (
                        <EmptyState
                          icon={<Search className="h-8 w-8 text-white/25" />}
                          heading="No listings match your filters"
                          subMessage="Try clearing a filter to see more players."
                          action={
                            <button type="button" onClick={() => setLfgFilters({ game: GAME_SLUG })}
                              className="text-[13px] text-white/50 hover:text-white border border-white/[0.08] px-4 py-2 transition-colors">
                              Clear filters
                            </button>
                          }
                        />
                      ) : (
                        <EmptyState
                          icon={<Users className="h-8 w-8 text-white/25" />}
                          heading="No listings in this region yet"
                          subMessage="Be the first. Tell teams what role you play."
                          action={
                            <Link
                              to={profile ? '/competitive/lfg/new' : '/auth/signin'}
                              className="px-4 py-2 text-[13px] font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors [box-shadow:0_0_12px_0_rgba(255,45,85,0.35)]"
                            >
                              Post your listing
                            </Link>
                          }
                        />
                      )
                    ) : (
                      <motion.div
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                      >
                        {(lfgQuery.data ?? []).map((listing) => (
                          <div key={listing.id} role="listitem" className="mb-2">
                            <LfgDiscoveryCard listing={listing} />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )}
              </TabsContent>
            )}
          </main>
        </div>
      </Tabs>

      {/* Mobile filter bottom sheet */}
      {showFilterSheet && selectedGame && catalogReady && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-label="Filters" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowFilterSheet(false)} />
          <div className="relative w-full max-h-[85vh] bg-[#1a1a1a] border-t border-white/[0.08] overflow-y-auto">
            {/* Sheet header */}
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-white/[0.08]">
              <span className="text-[14px] font-semibold text-white">Filters</span>
              <button type="button" onClick={() => setShowFilterSheet(false)} aria-label="Close filters"
                className="p-1 text-white/55 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter content */}
            <div className="px-4 py-4">
              {activeTab === 'players' ? (
                <FilterPanel
                  mode="players"
                  filters={playerFilters}
                  onChange={setPlayerFilters}
                  gameRoles={gameRoles}
                  regions={regions}
                  rankTiers={rankTiers}
                />
              ) : (
                <FilterPanel
                  mode="lfg"
                  filters={lfgFilters}
                  onChange={setLfgFilters}
                  regions={regions}
                  rankTiers={rankTiers}
                />
              )}
            </div>

            {/* Sheet footer */}
            <div className="sticky bottom-0 flex gap-3 justify-end px-4 py-3 bg-[#1a1a1a] border-t border-white/[0.08]">
              <button type="button"
                onClick={() => {
                  if (activeTab === 'players') setPlayerFilters({ game: GAME_SLUG });
                  else setLfgFilters({ game: GAME_SLUG });
                }}
                className="text-[13px] text-white/55 hover:text-white px-4 py-2">
                Clear
              </button>
              <Button onClick={() => setShowFilterSheet(false)}
                className="bg-white text-[#0A0A0A] hover:bg-white/90 rounded-none px-6 text-[13px]">
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </CompetitivePageShell>
  );
}
