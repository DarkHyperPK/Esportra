import { useState, useMemo } from 'react';
import { Crosshair, SlidersHorizontal, X } from 'lucide-react';
import { PageIntro, EYEBROW_CLASS } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDiscoverScrimsFiltered } from '@/hooks/competitive/useScrimDiscovery';
import { useCatalogRankTiers, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { ScrimOfferForm } from '@/components/competitive/scrims/ScrimOfferForm';
import { ScrimSlotCalendar } from '@/components/competitive/scrims/ScrimSlotCalendar';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { formatPreferredDays } from '@/services/scrimUtils';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import '@/components/competitive/lfg-glass.css';
import {
  gameAbbrev,
  formatTimeWindow,
  listingAge,
  type ScrimListingEnriched,
} from '@/services/scrimDiscoveryUtils';
import type { ScrimMemberPreview } from '@/types/competitive';

// ─── Member avatar (reuses LFG avatar resolution) ───────────────────────────

function MemberAvatar({ member }: { member: ScrimMemberPreview }) {
  const src = resolveLfgAvatar(null, member.avatar_seed, null);
  const initials = (member.username ?? '?').slice(0, 2).toUpperCase();
  return (
    <span className="lfg-roster-preview-member" title={member.username ?? 'Player'}>
      <span className="lfg-roster-avatar">
        {src ? <img src={src} alt="" /> : initials}
      </span>
      <span>{member.username ?? 'Player'}</span>
    </span>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="lfg-card lfg-panel overflow-hidden opacity-50 animate-pulse">
      <div className="lfg-compact-hero no-art" />
      <div className="lfg-compact-content space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/[0.06]" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-28 bg-white/[0.06] rounded" />
            <div className="h-3 w-16 bg-white/[0.04] rounded" />
          </div>
        </div>
        <div className="h-5 w-32 bg-white/[0.04] rounded" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-7 w-7 rounded-full bg-white/[0.04]" />)}
        </div>
        <div className="h-10 w-full bg-white/[0.04] rounded-xl" />
      </div>
    </div>
  );
}

// ─── ScrimCard ────────────────────────────────────────────────────────────────

interface ScrimCardProps {
  listing: ScrimListingEnriched;
  isOwner: boolean;
  isOfferOpen: boolean;
  hasTeam: boolean;
  onRequestScrim: () => void;
}

function ScrimCard({
  listing,
  isOwner,
  isOfferOpen,
  hasTeam,
  onRequestScrim,
}: ScrimCardProps) {
  const reduced = useReducedMotion() ?? false;
  const isOpen = listing.status === 'open';
  const dayAbbrevs = formatPreferredDays(listing.preferredDays);
  const hasSchedule =
    dayAbbrevs.length > 0 ||
    (!!listing.preferredTimeStart && !!listing.preferredTimeEnd);
  const age = listingAge(listing.createdAt);

  const rankRange =
    listing.minRankDisplayName && listing.maxRankDisplayName &&
    listing.minRankDisplayName !== listing.maxRankDisplayName
      ? `${listing.minRankDisplayName} – ${listing.maxRankDisplayName}`
      : listing.minRankDisplayName ?? listing.maxRankDisplayName ?? null;

  const initials = (listing.teamName ?? 'UT')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  const members: ScrimMemberPreview[] = useMemo(() => {
    if (!listing.membersPreview) return [];
    if (Array.isArray(listing.membersPreview)) return listing.membersPreview;
    try { return JSON.parse(listing.membersPreview as unknown as string) ?? []; }
    catch { return []; }
  }, [listing.membersPreview]);

  return (
    <article className={`lfg-card lfg-panel lfg-compact-card lfg-team-card${isOpen ? ' selected' : ''}`}>
      {/* Hero area — team logo as banner or gradient fallback */}
      <div className="lfg-compact-hero no-art">
        <div className="lfg-compact-top">
          <div className="lfg-identity">
            <span className="lfg-avatar team">
              {listing.teamLogoUrl ? (
                <img src={listing.teamLogoUrl} alt="" />
              ) : initials}
            </span>
            <div className="lfg-compact-name">
              <h2 className="lfg-name">{listing.teamName ?? 'Unknown Team'}</h2>
              <p className="lfg-sub">
                {listing.teamTag ?? ''}
                {listing.teamTag && listing.regionKey ? ' · ' : ''}
                {listing.regionKey?.toUpperCase() ?? ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className="lfg-compact-content">
        {/* Rank + game/mode summary */}
        <div className="lfg-compact-summary lfg-team-summary">
          {rankRange ? (
            <div className="flex items-center gap-1.5">
              {listing.minRankIconUrl && (
                <img src={listing.minRankIconUrl} alt="" className="h-5 w-5 object-contain" />
              )}
              <strong>{rankRange}</strong>
              {listing.maxRankIconUrl && listing.maxRankIconUrl !== listing.minRankIconUrl && (
                <img src={listing.maxRankIconUrl} alt="" className="h-5 w-5 object-contain" />
              )}
            </div>
          ) : (
            <span className="text-[10px] text-white/30">Any rank</span>
          )}
          {listing.modeKey && (
            <span className="lfg-compact-role">{listing.modeKey}</span>
          )}
          {listing.gameSlug && (
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#a1a1aa' }}>
              {gameAbbrev(listing.gameSlug)}
            </span>
          )}
        </div>

        {/* Roster preview */}
        {members.length > 0 && (
          <div className="lfg-roster-preview" aria-label="Team roster">
            <span className="lfg-roster-label">Roster</span>
            <div>
              {members.slice(0, 5).map((m, i) => (
                <MemberAvatar key={m.username ?? i} member={m} />
              ))}
              {(listing.activeMemberCount ?? 0) > 5 && (
                <span className="lfg-sub">+{(listing.activeMemberCount ?? 0) - 5}</span>
              )}
            </div>
          </div>
        )}

        {/* Schedule */}
        {hasSchedule && (
          <div className="flex flex-wrap items-center gap-1.5" style={{ margin: '8px 0' }}>
            {dayAbbrevs.map((day) => (
              <span
                key={day}
                style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.07)', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600, borderRadius: 7 }}
              >
                {day.toUpperCase()}
              </span>
            ))}
            {listing.preferredTimeStart && listing.preferredTimeEnd && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                {dayAbbrevs.length > 0 ? '· ' : ''}
                {formatTimeWindow(listing.preferredTimeStart, listing.preferredTimeEnd, listing.timezone ?? null)}
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        {listing.notes && (
          <p className="lfg-description lfg-compact-description">{listing.notes}</p>
        )}

        {/* Bottom row — meta + action */}
        <div className="lfg-compact-bottom">
          <span>
            {[
              (listing.activeMemberCount ?? 0) > 0 ? `${listing.activeMemberCount} players` : null,
              (listing.scrimsCompleted ?? 0) > 0 ? `${listing.scrimsCompleted} scrims` : null,
              age,
            ].filter(Boolean).join(' · ') || listing.regionKey?.toUpperCase() || ''}
          </span>

          {isOwner ? (
            <Link to="/competitive/scrims/workspace" className="lfg-compact-expand">
              Manage
            </Link>
          ) : isOpen && hasTeam ? (
            <motion.button
              type="button"
              whileTap={!reduced ? { scale: 0.97 } : undefined}
              transition={{ duration: 0.12 }}
              onClick={isOfferOpen ? undefined : onRequestScrim}
              aria-pressed={isOfferOpen}
              className="lfg-button lfg-button-primary"
              style={{ borderRadius: 10, fontSize: 12, minHeight: 36, padding: '6px 14px' }}
            >
              Request Scrim
            </motion.button>
          ) : isOpen && !hasTeam ? (
            <Link to="/teams" className="lfg-compact-expand">
              Join a team
            </Link>
          ) : (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Closed</span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── FilterSelectGroup ────────────────────────────────────────────────────────

const NONE = '_';

interface FilterSelectGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}

function FilterSelectGroup({ label, value, onChange, options, placeholder }: FilterSelectGroupProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <p className={EYEBROW_CLASS}>{label}</p>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
        <SelectTrigger className="h-9 text-[13px] rounded-none border-white/10 bg-black/30">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── ScrimDiscoveryPage ───────────────────────────────────────────────────────

export default function ScrimDiscoveryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = (target: string) => `/auth/signin?redirect=${encodeURIComponent(target)}`;

  const catalog = useGameCatalogContext();
  const firstGame = catalog.games[0]?.slug ?? '';

  const [gameSlug, setGameSlug] = useState<string>('');
  const [modeFilter, setModeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [minRankKey, setMinRankKey] = useState('');
  const [maxRankKey, setMaxRankKey] = useState('');
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [offerPrefilledAt, setOfferPrefilledAt] = useState<string | undefined>();

  const activeGame = gameSlug || firstGame;

  const rankTiersQuery = useCatalogRankTiers(activeGame);
  const regionsQuery = useCatalogRegions(activeGame);
  const teamsQuery = useMyTeamsSummary();

  const rankTiers = rankTiersQuery.data ?? [];
  const regions = regionsQuery.data ?? [];

  const rankTierMap = useMemo(
    () => new Map((rankTiersQuery.data ?? []).map((t) => [t.tierKey, t.displayName])),
    [rankTiersQuery.data],
  );

  const minRankSortOrder = minRankKey
    ? rankTiers.find((t) => t.tierKey === minRankKey)?.sortOrder
    : undefined;
  const maxRankSortOrder = maxRankKey
    ? rankTiers.find((t) => t.tierKey === maxRankKey)?.sortOrder
    : undefined;

  const discoverQuery = useDiscoverScrimsFiltered({
    game: activeGame,
    mode: modeFilter || undefined,
    region: regionFilter || undefined,
    minRankSortOrder,
    maxRankSortOrder,
  });

  const listings = (discoverQuery.data ?? []) as ScrimListingEnriched[];
  const myTeamIds = new Set(
    (teamsQuery.data ?? []).map((t: unknown) => (t as { id: string }).id),
  );

  const activeGameObj = catalog.games.find((g) => g.slug === activeGame);
  const gameModes = (activeGameObj?.modes ?? activeGameObj?.formats ?? []) as Array<{
    key?: string;
    value: string;
    name: string;
  }>;
  const reduced = useReducedMotion() ?? false;

  const hasFilters = !!(modeFilter || regionFilter || minRankKey || maxRankKey);
  const activeFilterCount = [modeFilter, regionFilter, minRankKey, maxRankKey].filter(Boolean).length;

  function handleGameChange(slug: string) {
    setGameSlug(slug);
    setModeFilter('');
    setRegionFilter('');
    setMinRankKey('');
    setMaxRankKey('');
    setActiveOfferId(null);
  }

  function clearFilters() {
    setModeFilter('');
    setRegionFilter('');
    setMinRankKey('');
    setMaxRankKey('');
  }

  const hasTeam = (teamsQuery.data ?? []).length > 0;

  function handleRequestScrim(listingId: string, prefilledAt?: string) {
    if (!user) { navigate(signIn(location.pathname + location.search)); return; }
    setActiveOfferId(activeOfferId === listingId ? null : listingId);
    setOfferPrefilledAt(prefilledAt);
  }

  const modeOptions = gameModes.map((m) => ({
    value: m.key ?? m.value,
    label: m.name,
  }));
  const regionOptions = regions.map((r) => ({
    value: r.regionKey,
    label: r.displayName,
  }));
  const rankOptions = rankTiers.map((t) => ({
    value: t.tierKey,
    label: t.displayName,
  }));
  const gameOptions = catalog.games.map((g) => ({
    value: g.slug,
    label: g.name,
  }));

  const filterSelects = (
    <>
      <FilterSelectGroup label="Game" value={activeGame} onChange={handleGameChange} options={gameOptions} placeholder="Select game" />
      <FilterSelectGroup label="Mode" value={modeFilter} onChange={setModeFilter} options={modeOptions} placeholder="Any mode" />
      <FilterSelectGroup label="Region" value={regionFilter} onChange={setRegionFilter} options={regionOptions} placeholder="Any region" />
      <FilterSelectGroup label="Min rank" value={minRankKey} onChange={setMinRankKey} options={rankOptions} placeholder="Any" />
      <FilterSelectGroup label="Max rank" value={maxRankKey} onChange={setMaxRankKey} options={rankOptions} placeholder="Any" />
    </>
  );

  interface ChipDef { key: string; label: string; onDismiss: () => void }
  const activeChips: ChipDef[] = [
    ...(modeFilter ? [{ key: 'mode', label: modeOptions.find((o) => o.value === modeFilter)?.label ?? modeFilter, onDismiss: () => setModeFilter('') }] : []),
    ...(regionFilter ? [{ key: 'region', label: regionOptions.find((o) => o.value === regionFilter)?.label ?? regionFilter, onDismiss: () => setRegionFilter('') }] : []),
    ...(minRankKey ? [{ key: 'min-rank', label: `Min: ${rankTierMap.get(minRankKey) ?? minRankKey}`, onDismiss: () => setMinRankKey('') }] : []),
    ...(maxRankKey ? [{ key: 'max-rank', label: `Max: ${rankTierMap.get(maxRankKey) ?? maxRankKey}`, onDismiss: () => setMaxRankKey('') }] : []),
  ];

  return (
    <CompetitivePageShell>
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <PageIntro
          eyebrow="Scrims"
          title="Find a scrim"
          className="mb-6"
          aside={
            <Link
              to="/competitive/scrims/workspace"
              className="hidden lg:inline-flex px-3 py-1.5 text-[13px] border border-white/[0.12] text-white/55 hover:text-white hover:border-white/25 transition-colors duration-150"
            >
              Post a listing
            </Link>
          }
        />
      </div>

      <main className="px-4 lg:px-8 pb-8">
        {/* Desktop filter bar */}
        <div className="hidden lg:flex flex-wrap gap-3 mb-4">{filterSelects}</div>

        {/* Mobile filter toggle */}
        <div className="flex lg:hidden items-center justify-between mb-4">
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/[0.12] text-[13px] text-white/55 hover:text-white hover:border-white/25 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-1 bg-rose-500 font-mono text-[10px] text-white font-semibold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-[#0f0f11] border-t border-white/[0.08] p-6 space-y-4">
              <SheetHeader>
                <SheetTitle className="font-heading text-[16px] font-bold text-white normal-case tracking-normal">
                  Filters
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">{filterSelects}</div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Applied chips */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeChips.map((chip) => (
              <span key={chip.key} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.07] text-[12px] text-white/60">
                {chip.label}
                <button type="button" onClick={chip.onDismiss} aria-label={`Remove ${chip.label} filter`} className="hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none">
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* States */}
        {discoverQuery.isLoading ? (
          <div className="lfg-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : discoverQuery.isError ? (
          <div className="py-8 space-y-3">
            <p className="text-[14px] text-white/55">Could not load scrim listings. Check your connection and try again.</p>
            <Button variant="outline" onClick={() => void discoverQuery.refetch()} className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]">
              Retry
            </Button>
          </div>
        ) : listings.length === 0 && !hasFilters ? (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <Crosshair className="h-8 w-8 text-white/20" aria-hidden="true" />
            <p className="text-[15px] font-medium text-white/50">
              No open listings for {activeGameObj?.name ?? activeGame}
            </p>
            <p className="text-[13px] text-white/35 max-w-xs">
              Post your schedule and teams will find you
            </p>
            <Link to="/competitive/scrims/workspace" className="px-4 py-2 text-[13px] font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors">
              Post a listing
            </Link>
          </div>
        ) : listings.length === 0 && hasFilters ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-[14px] text-white/40">No open slots at your rank</p>
            <p className="text-[13px] text-white/30">Try a wider rank range or another region</p>
            <Button variant="ghost" onClick={clearFilters} className="rounded-none border border-white/[0.08] text-[13px] text-white/55 hover:text-white mt-2">
              Clear filters
            </Button>
          </div>
        ) : (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="lfg-grid"
            role="list"
            aria-label="Scrim listings"
          >
            {listings.map((listing) => {
              const isOwner = listing.teamId ? myTeamIds.has(listing.teamId) : false;
              const isOfferOpen = activeOfferId === listing.id;

              return (
                <div key={listing.id} role="listitem" className="flex flex-col">
                  <ScrimCard
                    listing={listing}
                    isOwner={isOwner}
                    isOfferOpen={isOfferOpen}
                    hasTeam={hasTeam}
                    onRequestScrim={() => handleRequestScrim(listing.id)}
                  />

                  {/* Offer form — below the card */}
                  <AnimatePresence>
                    {isOfferOpen && hasTeam && listing.scheduleType === 'recurring' ? (
                      <motion.div
                        initial={reduced ? undefined : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduced ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="border border-white/10 bg-black/40 p-4 mt-1">
                          <ScrimSlotCalendar
                            listing={listing}
                            onSlotSelected={() => { setActiveOfferId(null); setOfferPrefilledAt(undefined); }}
                          />
                          <div className="mt-3 border-t border-white/[0.06] pt-3">
                            <button onClick={() => { setActiveOfferId(null); setOfferPrefilledAt(undefined); }} className="text-[13px] text-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : isOfferOpen && hasTeam ? (
                      <motion.div
                        initial={reduced ? undefined : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduced ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <ScrimOfferForm
                          listingId={listing.id}
                          gameSlug={listing.gameSlug}
                          prefilledProposedAt={offerPrefilledAt}
                          onClose={() => { setActiveOfferId(null); setOfferPrefilledAt(undefined); }}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}
      </main>
    </CompetitivePageShell>
  );
}
