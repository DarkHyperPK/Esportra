import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { useCatalogGameRoles, useCatalogRankTiers, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useInfiniteLfg } from '@/hooks/competitive/useDiscovery';
import { useLfgListing, useMyLfgListings, useSetLfgSaved } from '@/hooks/competitive/useLfg';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import { LfgListingCard } from '@/components/competitive/LfgListingCard';
import { LfgListingDetail } from '@/components/competitive/LfgListingDetail';
import { LFG_LANGUAGES } from '@/lib/lfgLanguages';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { LfgIntent } from '@/types/competitive';

export default function LfgDiscoveryPage() {
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const catalog = useGameCatalogContext();
  const game = params.get('game') || catalog.games.find(item => item.slug === 'valorant')?.slug || catalog.games[0]?.slug || '';
  const kind = params.get('kind') === 'teams' ? 'teams' : 'players';
  const list = params.get('view') === 'list';
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [region, setRegion] = useState('');
  const [rank, setRank] = useState('');
  const [maxRank, setMaxRank] = useState('');
  const [server, setServer] = useState('');
  const [language, setLanguage] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => setSearch(query), 250); return () => window.clearTimeout(timer); }, [query]);
  const roles = useCatalogGameRoles(game).data ?? [];
  const ranks = useCatalogRankTiers(game).data ?? [];
  const regions = useCatalogRegions(game).data ?? [];
  const serverOptions = [...new Set(regions.filter(item => !region || item.regionKey === region).flatMap(item => item.serverIds ?? []))];
  const intents: LfgIntent[] = kind === 'players' ? ['looking_for_team'] : ['looking_for_player', 'competitive_roster'];
  const feed = useInfiniteLfg({ game, intent: intents, roles: role ? [role] : undefined, regionKey: region || undefined,
    minRank: rank ? Number(rank) : undefined, maxRank: maxRank ? Number(maxRank) : undefined, query: search, server: server || undefined, language: language || undefined, savedOnly });
  const myListings = useMyLfgListings();
  const save = useSetLfgSaved();
  const rows = feed.data?.pages.flat() ?? [];
  const own = savedOnly ? [] : (myListings.data ?? []).filter(item => item.gameSlug === game && item.status === 'published' && (!item.expiresAt || new Date(item.expiresAt).getTime() > Date.now()) && intents.includes(item.intent)
    && (!role || item.preferredRoles?.includes(role)) && (!region || item.regionKey === region)
    && (!rank || (item.minRankSortOrder != null && item.minRankSortOrder >= Number(rank)))
    && (!maxRank || (item.maxRankSortOrder != null && item.maxRankSortOrder <= Number(maxRank)))
    && (!server || item.preferredServers?.includes(server)) && (!language || item.languages?.includes(language))
    && (!search || `${item.username ?? ''} ${item.teamName ?? ''} ${item.description ?? ''}`.toLowerCase().includes(search.toLowerCase())));
  const listings = [...own, ...rows];
  const selectedId = params.get('listing') || listings[0]?.id || '';
  const detail = useLfgListing(selectedId);
  const selected = detail.data ?? listings.find(item => item.id === selectedId);
  const activeGame = catalog.games.find(item => item.slug === game);
  function change(next: Record<string, string | null>) {
    const updated = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => value ? updated.set(key, value) : updated.delete(key));
    setParams(updated);
  }
  function changeGame(value: string) {
    setRole(''); setRegion(''); setRank(''); setMaxRank(''); setServer(''); setLanguage(''); setQuery(''); setSavedOnly(false);
    change({ game: value, listing: null });
  }
  function select(id: string) { change({ listing: id }); setSheetOpen(window.matchMedia('(max-width: 1100px)').matches); }
  async function toggleSave(id: string, isSaved: boolean) {
    setSaveError('');
    try { await save.mutateAsync({ id, saved: !isSaved }); }
    catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not update saved listings.'); }
  }
  return <LfgWorkspace>
    <header className="lfg-heading"><div><div className="lfg-eyebrow">Esportra / Find a group</div><h1>Find your next team.</h1><p>Good people. Shared goals. A team worth showing up for.</p></div>
      <label className="lfg-field">Your game<select className="lfg-input" value={game} onChange={event => changeGame(event.target.value)} disabled={!catalog.games.length}>{!catalog.games.length && <option value="">Game catalog unavailable</option>}{catalog.games.map(item => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label>
    </header>
    <div className="lfg-layout">
      <aside className={`lfg-filters lfg-panel ${filterOpen ? 'open' : ''}`} aria-label="Listing filters"><h2>Narrow the search</h2>
        {roles.length > 0 && <label className="lfg-field">Role<select className="lfg-input" value={role} onChange={event => setRole(event.target.value)}><option value="">Any role</option>{roles.map(item => <option key={item.id} value={item.roleKey}>{item.displayName}</option>)}</select></label>}
        {ranks.length > 0 && <label className="lfg-field">Minimum rank<select className="lfg-input" value={rank} onChange={event => setRank(event.target.value)}><option value="">Any rank</option>{ranks.map(item => <option key={item.id} value={item.sortOrder}>{item.displayName}</option>)}</select></label>}
        {ranks.length > 0 && <label className="lfg-field">Maximum rank<select className="lfg-input" value={maxRank} onChange={event => setMaxRank(event.target.value)}><option value="">Any rank</option>{ranks.map(item => <option key={item.id} value={item.sortOrder}>{item.displayName}</option>)}</select></label>}
        {regions.length > 0 && <label className="lfg-field">Region<select className="lfg-input" value={region} onChange={event => { setRegion(event.target.value); setServer(''); }}><option value="">Any region</option>{regions.map(item => <option key={item.id} value={item.regionKey}>{item.displayName}</option>)}</select></label>}
        <label className="lfg-field">Server{serverOptions.length ? <select className="lfg-input" value={server} onChange={event => setServer(event.target.value)}><option value="">Any server</option>{serverOptions.map(item => <option key={item} value={item}>{item}</option>)}</select> : <input className="lfg-input" value={server} onChange={event => setServer(event.target.value)} placeholder="Any server" />}</label>
        <label className="lfg-field">Language<select className="lfg-input" value={language} onChange={event => setLanguage(event.target.value)}><option value="">Any language</option>{LFG_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <label className="lfg-field" style={{ flexDirection:'row', alignItems:'center' }}><input type="checkbox" checked={savedOnly} onChange={event => setSavedOnly(event.target.checked)} /> Saved listings</label>
        <button className="lfg-button" type="button" onClick={() => { setRole(''); setRegion(''); setRank(''); setMaxRank(''); setServer(''); setLanguage(''); setQuery(''); setSavedOnly(false); }}>Reset filters</button>
      </aside>
      <section className="lfg-results" aria-label="Discover listings">
        <div className="lfg-tools"><div className="lfg-segmented" aria-label="Listing type"><button type="button" aria-pressed={kind === 'players'} onClick={() => change({ kind:'players', listing:null })}>Find players</button><button type="button" aria-pressed={kind === 'teams'} onClick={() => change({ kind:'teams', listing:null })}>Find a team</button></div>
          <button type="button" className="lfg-button lfg-mobile-filter" onClick={() => setFilterOpen(!filterOpen)} aria-expanded={filterOpen}><SlidersHorizontal size={16} /> Filters</button>
          <input className="lfg-input lfg-search" aria-label="Search listings" placeholder="Search names and descriptions" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} />
          <div className="lfg-segmented" aria-label="View"><button type="button" aria-label="Card view" aria-pressed={!list} onClick={() => change({ view:null })}><LayoutGrid size={16} /></button><button type="button" aria-label="List view" aria-pressed={list} onClick={() => change({ view:'list' })}><List size={16} /></button></div>
        </div>
        {saveError && <p className="lfg-error" role="alert">{saveError}</p>}
        <div className="lfg-columns"><div><p className="lfg-count">{kind === 'players' ? 'Players looking for a team' : 'Teams recruiting'} · {activeGame?.name ?? game}</p>
          {feed.isLoading || catalog.isLoading ? <div className="lfg-panel lfg-empty" aria-live="polite">Loading listings…</div> : feed.isError ? <div className="lfg-panel lfg-empty"><strong>Listings could not load.</strong><button className="lfg-button" type="button" onClick={() => void feed.refetch()}>Try again</button></div> : listings.length === 0 ? <div className="lfg-panel lfg-empty"><strong>No listings found.</strong>Try another game or adjust your filters.</div> : <>
            <div className={`lfg-grid ${list ? 'list' : ''}`}>{listings.map(item => <LfgListingCard key={item.id} listing={item} roles={roles} artwork={activeGame?.banner || activeGame?.logo} selected={item.id === selectedId} onSelect={() => select(item.id)} onSave={() => void toggleSave(item.id, !!item.isSaved)} savePending={save.isPending} isOwn={item.userId === user?.id} />)}</div>
            {feed.hasNextPage && <button className="lfg-button" type="button" style={{ marginTop:16, width:'100%' }} disabled={feed.isFetchingNextPage} onClick={() => void feed.fetchNextPage()}>{feed.isFetchingNextPage ? 'Loading…' : 'Load more listings'}</button>}
          </>}
        </div><aside className="lfg-detail lfg-panel lfg-detail-desktop" aria-label="Listing details">{selected ? <LfgListingDetail key={selected.id} listing={selected} roles={roles} currentUserId={user?.id} /> : <div className="lfg-empty">Select a listing to see details.</div>}</aside></div>
      </section>
    </div>
    <Sheet open={sheetOpen && !!selected} onOpenChange={setSheetOpen}><SheetContent side="right" className="lfg-mobile-detail overflow-y-auto rounded-l-[20px] border-white/15 bg-[#15151bf2] p-0 text-white"><SheetTitle className="sr-only">Listing details</SheetTitle>{selected && <LfgListingDetail key={selected.id} listing={selected} roles={roles} currentUserId={user?.id} />}</SheetContent></Sheet>
  </LfgWorkspace>;
}
