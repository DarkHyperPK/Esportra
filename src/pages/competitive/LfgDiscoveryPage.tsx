import { withLfgStaffRoles } from '@/lib/lfgRoles';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { useCatalogGameRoles, useCatalogRankTiers, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useInfiniteLfg } from '@/hooks/competitive/useDiscovery';
import { useLfgListing, useMyLfgListings, useSetLfgSaved } from '@/hooks/competitive/useLfg';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import { LfgListingCard } from '@/components/competitive/LfgListingCard';
import { LfgListingDetail } from '@/components/competitive/LfgListingDetail';
import { LfgRankSelect } from '@/components/competitive/LfgRankSelect';
import { LFG_LANGUAGES } from '@/lib/lfgLanguages';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import type { LfgIntent } from '@/types/competitive';

export default function LfgDiscoveryPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const catalog = useGameCatalogContext();
  const game = params.get('game') || catalog.games.find(item => item.slug === 'valorant')?.slug || catalog.games[0]?.slug || '';
  const kind = params.get('kind') === 'teams' ? 'teams' : 'players';
  const returnFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [region, setRegion] = useState('');
  const [rank, setRank] = useState('');
  const [maxRank, setMaxRank] = useState('');
  const [language, setLanguage] = useState('');
  const savedOnly = params.get('saved') === '1';
  const [filterOpen, setFilterOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => setSearch(query), 250); return () => window.clearTimeout(timer); }, [query]);
  const roles = withLfgStaffRoles(game, useCatalogGameRoles(game).data ?? []);
  const ranks = useCatalogRankTiers(game).data ?? [];
  const regions = useCatalogRegions(game).data ?? [];
  const intents: LfgIntent[] = kind === 'players' ? ['looking_for_team'] : ['looking_for_player', 'competitive_roster'];
  const feed = useInfiniteLfg({ game, intent: intents, roles: role ? [role] : undefined, regionKey: region || undefined,
    minRank: rank ? Number(rank) : undefined, maxRank: maxRank ? Number(maxRank) : undefined, query: search, language: language || undefined, savedOnly });
  const myListings = useMyLfgListings();
  const save = useSetLfgSaved();
  const rows = feed.data?.pages.flat() ?? [];
  const own = savedOnly ? [] : (myListings.data ?? []).filter(item => item.gameSlug === game && item.status === 'published' && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now()) && intents.includes(item.intent)
    && (!role || item.preferredRoles?.includes(role)) && (!region || item.regionKey === region)
    && (!rank || ((kind === 'players' ? game === 'valorant' && item.competitiveTier != null && item.competitiveTier >= 3 && item.competitiveTier - 3 >= Number(rank) : item.minRankSortOrder != null && item.minRankSortOrder >= Number(rank))))
    && (!maxRank || ((kind === 'players' ? game === 'valorant' && item.competitiveTier != null && item.competitiveTier >= 3 && item.competitiveTier - 3 <= Number(maxRank) : item.maxRankSortOrder != null && item.maxRankSortOrder <= Number(maxRank))))
    && (!language || item.languages?.includes(language))
    && (!search || `${item.username ?? ''} ${item.teamName ?? ''} ${item.description ?? ''}`.toLowerCase().includes(search.toLowerCase())));
  const selectedId = params.get('listing') || '';
  const detail = useLfgListing(selectedId);
  const feedListings = [...own, ...rows];
  const linkedListing = detail.data && detail.data.gameSlug === game && intents.includes(detail.data.intent) && (!savedOnly || detail.data.isSaved) && !feedListings.some(item => item.id === selectedId) ? detail.data : null;
  const listings = linkedListing ? [linkedListing, ...feedListings] : feedListings;
  const activeGame = catalog.games.find(item => item.slug === game);
  function change(next: Record<string, string | null>) {
    const updated = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => value ? updated.set(key, value) : updated.delete(key));
    setParams(updated);
  }
  function changeGame(value: string) {
    setRole(''); setRegion(''); setRank(''); setMaxRank(''); setLanguage(''); setQuery('');
    change({ game: value, listing: null });
  }
  function select(id: string) { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; change({ listing: id }); }
  async function toggleSave(id: string, isSaved: boolean) {
    setSaveError('');
    try { await save.mutateAsync({ id, saved: !isSaved }); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not update saved listings.'); }
  }
  return <LfgWorkspace>
    <header className="lfg-heading"><div><div className="lfg-eyebrow">Esportra / Find a group</div><h1>{savedOnly ? 'Saved listings.' : 'Find your next team.'}</h1><p>{savedOnly ? 'Players and teams you saved, organized by game.' : 'Good people. Shared goals. A team worth showing up for.'}</p></div>
      <label className="lfg-field">Your game<select className="lfg-input" value={game} onChange={event => changeGame(event.target.value)} disabled={!catalog.games.length}>{!catalog.games.length && <option value="">Game catalog unavailable</option>}{catalog.games.map(item => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label>
    </header>
    <div className="lfg-layout">
      <aside className={`lfg-filters lfg-panel ${filterOpen ? 'open' : ''}`} aria-label="Listing filters"><h2>Narrow the search</h2>
        {roles.length > 0 && <label className="lfg-field">Role<select className="lfg-input" value={role} onChange={event => setRole(event.target.value)}><option value="">Any role</option>{roles.map(item => <option key={item.id} value={item.roleKey}>{item.displayName}</option>)}</select></label>}
        {ranks.length > 0 && <LfgRankSelect label="Minimum rank" game={game} ranks={ranks} value={rank} onChange={setRank} />}
        {ranks.length > 0 && <LfgRankSelect label="Maximum rank" game={game} ranks={ranks} value={maxRank} onChange={setMaxRank} />}
        {regions.length > 0 && <label className="lfg-field">Region<select className="lfg-input" value={region} onChange={event => setRegion(event.target.value)}><option value="">Any region</option>{regions.map(item => <option key={item.id} value={item.regionKey}>{item.displayName}</option>)}</select></label>}
        <label className="lfg-field">Language<select className="lfg-input" value={language} onChange={event => setLanguage(event.target.value)}><option value="">Any language</option>{LFG_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="lfg-field" style={{ flexDirection:'row', alignItems:'center' }}><input type="checkbox" checked={savedOnly} onChange={event => change({ saved: event.target.checked ? '1' : null, listing: null })} /> Saved listings</label>
        <button className="lfg-button" type="button" onClick={() => { setRole(''); setRegion(''); setRank(''); setMaxRank(''); setLanguage(''); setQuery(''); }}>Reset filters</button>
      </aside>
      <section className="lfg-results" aria-label="Discover listings">
        <div className="lfg-tools"><div className="lfg-segmented" aria-label="Listing type"><button type="button" aria-pressed={kind === 'players'} onClick={() => change({ kind:'players', listing:null })}>Find players</button><button type="button" aria-pressed={kind === 'teams'} onClick={() => change({ kind:'teams', listing:null })}>Find a team</button></div>
          <button type="button" className="lfg-button lfg-mobile-filter" onClick={() => setFilterOpen(!filterOpen)} aria-expanded={filterOpen}><SlidersHorizontal size={16} /> Filters</button>
          <input className="lfg-input lfg-search" aria-label="Search listings" placeholder="Search names and descriptions" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        {saveError && <p className="lfg-error" role="alert">{saveError}</p>}
        <div>
          {feed.isLoading || catalog.isLoading ? <div className="lfg-panel lfg-empty" aria-live="polite">Loading listings…</div> : feed.isError ? <div className="lfg-panel lfg-empty"><strong>Listings could not load.</strong><button className="lfg-button" type="button" onClick={() => void feed.refetch()}>Try again</button></div> : listings.length === 0 ? <div className="lfg-panel lfg-empty"><strong>{savedOnly ? 'No saved listings here.' : 'No listings found.'}</strong>{savedOnly ? 'Try the other listing type, another game, or save a listing in Discover.' : 'Try another game or adjust your filters.'}</div> : <>
            <div className="lfg-grid">{listings.map(item => <LfgListingCard key={item.id} listing={item} roles={roles} artwork={activeGame?.banner || activeGame?.logo} selected={item.id === selectedId} onSelect={() => select(item.id)} onSave={() => void toggleSave(item.id, !!item.isSaved)} savePending={save.isPending} isOwn={item.userId === user?.id} />)}</div>
            {feed.hasNextPage && <button className="lfg-button" type="button" style={{ marginTop:16, width:'100%' }} disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>{feed.isFetchingNextPage ? 'Loading…' : 'Load more listings'}</button>}
          </>}
        </div>
      </section>
    </div>
    <Sheet open={!!selectedId} onOpenChange={open => { if (!open) change({ listing: null }); }}>
      <SheetContent side="right" className="lfg-detail-drawer" onCloseAutoFocus={event => { if (returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus(); } }}>
        <SheetTitle className="lfg-drawer-title">Listing details</SheetTitle>
        <SheetDescription className="lfg-drawer-description">Review this listing and connect with its owner.</SheetDescription>
        {detail.isLoading ? <p className="lfg-card-detail-message" role="status">Loading details…</p> : detail.isError || !detail.data ? <p className="lfg-card-detail-message" role="alert">This listing is unavailable. <button type="button" onClick={() => void detail.refetch()}>Try again</button></p> : <LfgListingDetail key={selectedId} listing={detail.data} roles={roles} currentUserId={user?.id} />}
      </SheetContent>
    </Sheet>
  </LfgWorkspace>;
}
