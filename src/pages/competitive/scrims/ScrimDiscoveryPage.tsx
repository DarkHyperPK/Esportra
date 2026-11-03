import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { ScrimDetailModal } from '@/components/competitive/scrims/ScrimDetailModal';
import { UpNextStrip } from '@/components/competitive/scrims/UpNextStrip';
import { DiscoveryEmpty } from '@/components/competitive/scrims/listing/DiscoveryEmpty';
import { DiscoveryFilterPanel, DiscoveryToolbar, type FilterChip } from '@/components/competitive/scrims/listing/DiscoveryToolbar';
import { ScrimOpponentCard } from '@/components/competitive/scrims/listing/ScrimOpponentCard';
import { ScrimOpponentCardSkeleton } from '@/components/competitive/scrims/listing/ScrimOpponentCardSkeleton';
import { useAuth } from '@/hooks/useAuth';
import { useDiscoverScrimsFiltered } from '@/hooks/competitive/useScrimDiscovery';
import { useScrimUpNext } from '@/hooks/competitive/useScrimUpNext';
import { useCatalogRankTiers, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { SCRIM_GAME_SLUGS, scrimGamesOf } from '@/lib/scrimGames';
import type { ScrimListingEnriched } from '@/services/scrimDiscoveryUtils';
import { sortListings, type DiscoverySort } from '@/services/scrimListingView';
import { pickLead } from '@/services/scrimUpNext';

export default function ScrimDiscoveryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion() ?? false;
  const catalog = useGameCatalogContext();

  const [gameSlug, setGameSlug] = useState('');
  const [region, setRegion] = useState('');
  const [minRank, setMinRank] = useState('');
  const [maxRank, setMaxRank] = useState('');
  const [sort, setSort] = useState<DiscoverySort>('newest');
  const [detail, setDetail] = useState<ScrimListingEnriched | null>(null);

  // "" = all games. Only games scrims run in are offered.
  const games = scrimGamesOf(catalog.games);
  const activeGame = gameSlug;
  const gameName = activeGame ? games.find((g) => g.slug === activeGame)?.name ?? activeGame : null;
  // Regions and ranks come from one game's catalog; with "all games" the first scrim game's regions are used.
  const catalogGame = activeGame || SCRIM_GAME_SLUGS[0];

  const rankTiers = useCatalogRankTiers(catalogGame).data ?? [];
  const regions = useCatalogRegions(catalogGame).data ?? [];
  const sortOrderOf = (key: string | null | undefined) =>
    key ? rankTiers.find((t) => t.tierKey === key)?.sortOrder ?? null : null;

  const teams = (useMyTeamsSummary().data ?? []) as { id: string; primary_game_slug?: string | null }[];
  const hasTeam = teams.length > 0;
  const myTeamIds = new Set(teams.map((t) => t.id));

  const query = useDiscoverScrimsFiltered({
    game: activeGame,
    region: region || undefined,
    minRankSortOrder: minRank ? sortOrderOf(minRank) ?? undefined : undefined,
    maxRankSortOrder: maxRank ? sortOrderOf(maxRank) ?? undefined : undefined,
  });
  const listings = useMemo(
    () => sortListings(((query.data ?? []) as ScrimListingEnriched[]).filter((l) => SCRIM_GAME_SLUGS.includes((l.gameSlug ?? '').toLowerCase())), sort),
    [query.data, sort],
  );

  const upNext = useScrimUpNext();
  const { lead, more } = pickLead(upNext.data);

  const rankOptions = rankTiers.map((t) => ({ value: t.tierKey, label: t.displayName, iconUrl: t.iconUrl }));
  const regionOptions = regions.map((r) => ({ value: r.regionKey, label: r.displayName }));
  const chips: FilterChip[] = [
    ...(activeGame ? [{ key: 'game', label: gameName ?? activeGame, onDismiss: () => changeGame('') }] : []),
    ...(region ? [{ key: 'region', label: regionOptions.find((o) => o.value === region)?.label ?? region, onDismiss: () => setRegion('') }] : []),
    ...(minRank ? [{ key: 'min', label: `Min: ${rankOptions.find((o) => o.value === minRank)?.label ?? minRank}`, iconUrl: rankOptions.find((o) => o.value === minRank)?.iconUrl, onDismiss: () => setMinRank('') }] : []),
    ...(maxRank ? [{ key: 'max', label: `Max: ${rankOptions.find((o) => o.value === maxRank)?.label ?? maxRank}`, iconUrl: rankOptions.find((o) => o.value === maxRank)?.iconUrl, onDismiss: () => setMaxRank('') }] : []),
  ];

  const filterProps = {
    games: games.map((g) => ({ value: g.slug, label: g.name })),
    game: activeGame, onGameChange: changeGame,
    regions: regionOptions, region, onRegionChange: setRegion,
    ranks: rankOptions, minRank, onMinRankChange: setMinRank, maxRank, onMaxRankChange: setMaxRank,
    sort, onSortChange: setSort,
  };

  function changeGame(slug: string) {
    setGameSlug(slug);
    setRegion('');
    setMinRank('');
    setMaxRank('');
  }
  function clearFilters() {
    setGameSlug('');
    setRegion('');
    setMinRank('');
    setMaxRank('');
  }
  function open(listing: ScrimListingEnriched) {
    if (!user) {
      navigate(`/auth/signin?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    setDetail(listing);
  }

  return (
    <CompetitivePageShell>
      <div className="px-4 pt-8 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-[24px] font-bold leading-tight text-white">Find a scrim</h1>
            <p className="mt-1 text-[13px] text-zinc-400">Teams looking for scrims. Compare records, then send a request.</p>
          </div>
          <Link
            to="/competitive/scrims/workspace"
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/[0.14] px-4 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {hasTeam ? 'My scrims' : 'Post a listing'}
          </Link>
        </header>
      </div>

      <div className="flex px-4 pb-12 lg:px-8">
        <aside className="sticky top-10 hidden h-[calc(100vh-var(--header-height,160px))] w-[240px] shrink-0 overflow-y-auto border-r border-white/[0.06] py-6 pr-5 lg:block">
          <DiscoveryFilterPanel {...filterProps} />
        </aside>
      <main className="min-w-0 flex-1 space-y-6 pt-6 lg:pl-6">
        <UpNextStrip lead={lead} more={more} onDeadlinePassed={() => void upNext.refetch()} />

        <DiscoveryToolbar {...filterProps} chips={chips} />

        {!query.isLoading && !query.isError && listings.length > 0 && (
          <p className="text-[13px] text-zinc-400" aria-live="polite">
            <span className="font-semibold tabular-nums text-white">{listings.length}</span> team{listings.length === 1 ? '' : 's'} looking for {gameName ? `${gameName} ` : ''}scrims
          </p>
        )}

        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <ScrimOpponentCardSkeleton key={i} />)}
          </div>
        ) : query.isError ? (
          <DiscoveryEmpty kind="error" gameName={gameName ?? 'any game'} onRetry={() => void query.refetch()} />
        ) : listings.length === 0 ? (
          <DiscoveryEmpty kind={chips.length > 0 ? 'filtered' : 'none'} gameName={gameName ?? 'any game'} onClearFilters={clearFilters} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Scrim listings">
            {listings.map((listing, i) => (
              <motion.li
                key={listing.id}
                className="flex"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut', delay: Math.min(i, 8) * 0.04 }}
              >
                <ScrimOpponentCard
                  listing={listing}
                  isOwner={!!listing.teamId && myTeamIds.has(listing.teamId)}
                  hasTeam={hasTeam}
                  onOpen={() => open(listing)}
                />
              </motion.li>
            ))}
          </ul>
        )}
      </main>
      </div>

      <ScrimDetailModal
        listingId={detail?.id ?? null}
        teamName={detail?.teamName}
        teamLogoUrl={detail?.teamLogoUrl}
        gameSlug={detail?.gameSlug}
        isOwner={detail?.teamId ? myTeamIds.has(detail.teamId) : false}
        onClose={() => setDetail(null)}
      />
    </CompetitivePageShell>
  );
}
