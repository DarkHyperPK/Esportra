import { useState, useMemo } from 'react';
import { ChevronRight, Crosshair, SlidersHorizontal, X } from 'lucide-react';
import { PageIntro, EYEBROW_CLASS } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useDiscoverScrimsFiltered } from '@/hooks/competitive/useScrimDiscovery';
import { useScrimUpNext } from '@/hooks/competitive/useScrimUpNext';
import { UpNextStrip } from '@/components/competitive/scrims/UpNextStrip';
import { pickLead } from '@/services/scrimUpNext';
import { useCatalogRankTiers, useCatalogRegions } from '@/hooks/competitive/useCatalog';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { ScrimDetailModal } from '@/components/competitive/scrims/ScrimDetailModal';
import { TeamRecordStrip } from '@/components/competitive/scrims/TeamRecordStrip';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { bestOfLabel, formatPreferredDays } from '@/services/scrimUtils';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import '@/components/competitive/lfg-glass.css';
import {
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
      <div className="h-[132px] bg-white/[0.04]" />
      <div className="lfg-compact-content space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/[0.06]" />
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
  hasTeam: boolean;
  onOpen: () => void;
}

function ScrimCard({ listing, isOwner, hasTeam, onOpen }: ScrimCardProps) {
  const reduced = useReducedMotion() ?? false;
  const catalog = useGameCatalogContext();
  const isOpen = listing.status === 'open';
  const dayAbbrevs = formatPreferredDays(listing.preferredDays);
  const hasSchedule =
    dayAbbrevs.length > 0 ||
    (!!listing.preferredTimeStart && !!listing.preferredTimeEnd);
  const age = listingAge(listing.createdAt);

  const catalogGame = catalog.games.find((g) => g.slug === listing.gameSlug);

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

  const bannerUrl = listing.captainCardUrl ?? listing.teamLogoUrl ?? null;
  const isCaptainCard = !!listing.captainCardUrl;

  return (
    <article className={`lfg-card lfg-panel lfg-compact-card lfg-team-card${isOpen ? ' selected' : ''}`}>
      {/* Hero — art-forward, game crest top-left, larger team crest */}
      <div className="relative h-[132px] overflow-hidden bg-[#1b1b21]">
        {bannerUrl && (
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={bannerUrl}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              filter: isCaptainCard ? 'brightness(0.62) saturate(1.15)' : 'blur(8px) brightness(0.55)',
              transform: isCaptainCard ? undefined : 'scale(1.15)',
              opacity: isCaptainCard ? 0.6 : 0.85,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#16161b] via-[#16161b]/55 to-transparent" />

        {/* Game crest */}
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-white/[0.12] bg-black/55 px-2 py-1.5 backdrop-blur-md">
          {listing.gameSlug ? (
            <GameLogoImage
              gameName={listing.gameSlug}
              catalogLogo={catalogGame?.logo}
              catalogIcon={catalogGame?.icon}
              className="h-5 w-5 object-contain"
            />
          ) : (
            <span className="h-5 w-5" />
          )}
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/70">
            {catalogGame?.name ?? listing.gameSlug ?? 'Scrim'}
          </span>
        </div>

        {/* Status */}
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] backdrop-blur-md ${
            isOpen
              ? 'border-rose-500/30 bg-black/50 text-rose-300'
              : listing.status === 'paused'
                ? 'border-amber-500/25 bg-black/50 text-amber-300/80'
                : 'border-white/10 bg-black/50 text-white/35'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOpen ? 'bg-rose-500' : listing.status === 'paused' ? 'bg-amber-500/70' : 'bg-white/25'
            }`}
          />
          {listing.status}
        </span>

        {/* Team identity */}
        <div className="absolute inset-x-3.5 bottom-2.5 flex items-end gap-2.5">
          <span
            className="lfg-avatar team shrink-0 border border-white/[0.16] bg-white/[0.06]"
            style={{ width: 48, height: 48, borderRadius: 13 }}
          >
            {listing.teamLogoUrl ? <img src={listing.teamLogoUrl} alt="" /> : initials}
          </span>
          <div className="min-w-0 pb-0.5">
            <h2 className="lfg-name truncate text-[15px] font-bold text-white">
              {listing.teamName ?? 'Unknown Team'}
            </h2>
            <p className="lfg-sub truncate">
              {[listing.teamTag, listing.regionKey?.toUpperCase()].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className="lfg-compact-content">
        {/* Rank + fixed 5v5 + series format */}
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
          <span className="rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.12em] text-white/55">
            5v5
          </span>
          <span
            className="rounded-md border border-white/[0.07] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-[0.12em] text-white/55"
            aria-label={`Best of ${listing.bestOf ?? 1} series`}
          >
            {bestOfLabel(listing.bestOf)}
          </span>
        </div>

        <TeamRecordStrip record={listing.record} className="mb-2" />

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
          <div className="my-2 flex flex-wrap items-center gap-1.5">
            {dayAbbrevs.map((day) => (
              <span
                key={day}
                className="rounded-md border border-white/[0.07] bg-white/[0.045] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              >
                {day}
              </span>
            ))}
            {listing.preferredTimeStart && listing.preferredTimeEnd && (
              <span className="text-[11px] font-medium tabular-nums text-white/60">
                {dayAbbrevs.length > 0 ? '· ' : ''}
                {formatTimeWindow(listing.preferredTimeStart, listing.preferredTimeEnd, listing.timezone ?? null)}
              </span>
            )}
            {listing.scheduleType === 'recurring' && (
              <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">
                Recurring
              </span>
            )}
          </div>
        )}

        {/* Notes */}
        {listing.notes && (
          <p className="lfg-description lfg-compact-description line-clamp-2 overflow-hidden break-words">
            {listing.notes}
          </p>
        )}

        {/* Meta + details */}
        <div className="lfg-compact-bottom">
          <span>
            {[
              (listing.activeMemberCount ?? 0) > 0 ? `${listing.activeMemberCount} players` : null,
              (listing.scrimsCompleted ?? 0) > 0 ? `${listing.scrimsCompleted} scrims` : null,
              age,
            ].filter(Boolean).join(' · ') || listing.regionKey?.toUpperCase() || ''}
          </span>

          <button type="button" className="lfg-compact-expand" onClick={onOpen}>
            More details <ChevronRight size={15} />
          </button>
        </div>

        {/* CTA row */}
        <div className="mt-2.5">
          {isOwner ? (
            <Link
              to="/competitive/scrims/workspace"
              className="lfg-button"
              style={{ width: '100%', borderRadius: 10, fontSize: 12, justifyContent: 'center' }}
            >
              Manage
            </Link>
          ) : isOpen && hasTeam ? (
            <motion.button
              type="button"
              whileTap={!reduced ? { scale: 0.97 } : undefined}
              transition={{ duration: 0.12 }}
              onClick={onOpen}
              className="lfg-button lfg-button-primary"
              style={{ width: '100%', borderRadius: 10, fontSize: 12, minHeight: 40, justifyContent: 'center' }}
            >
              Request scrim
            </motion.button>
          ) : isOpen && !hasTeam ? (
            <Link
              to="/teams"
              className="lfg-button"
              style={{ width: '100%', borderRadius: 10, fontSize: 12, justifyContent: 'center' }}
            >
              Join a team to request
            </Link>
          ) : (
            <span
              className="lfg-button"
              style={{ width: '100%', borderRadius: 10, fontSize: 12, justifyContent: 'center', opacity: 0.3, cursor: 'default' }}
            >
              Closed
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── FilterSelectGroup ────────────────────────────────────────────────────────

const NONE = '_';

interface FilterOption {
  value: string;
  label: string;
  iconUrl?: string | null;
}

interface FilterSelectGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder: string;
}

function FilterSelectGroup({ label, value, onChange, options, placeholder }: FilterSelectGroupProps) {
  const selected = options.find((o) => o.value === value);
  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <p className={EYEBROW_CLASS}>{label}</p>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
        <SelectTrigger className="h-9 text-[13px] rounded-none border-white/10 bg-black/30">
          {selected?.iconUrl ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <img src={selected.iconUrl} alt="" className="h-4 w-4 object-contain shrink-0" />
              <span className="truncate">{selected.label}</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.iconUrl ? (
                <div className="flex items-center gap-2">
                  <img src={o.iconUrl} alt="" className="h-4 w-4 object-contain shrink-0" />
                  <span>{o.label}</span>
                </div>
              ) : o.label}
            </SelectItem>
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
  const [regionFilter, setRegionFilter] = useState('');
  const [minRankKey, setMinRankKey] = useState('');
  const [maxRankKey, setMaxRankKey] = useState('');
  const [detailListing, setDetailListing] = useState<ScrimListingEnriched | null>(null);

  const activeGame = gameSlug || firstGame;

  const rankTiersQuery = useCatalogRankTiers(activeGame);
  const regionsQuery = useCatalogRegions(activeGame);
  const teamsQuery = useMyTeamsSummary();
  const upNextQuery = useScrimUpNext();
  const { lead: upNextLead, more: upNextMore } = pickLead(upNextQuery.data);

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
    region: regionFilter || undefined,
    minRankSortOrder,
    maxRankSortOrder,
  });

  const listings = (discoverQuery.data ?? []) as ScrimListingEnriched[];
  const myTeamIds = new Set(
    (teamsQuery.data ?? []).map((t: unknown) => (t as { id: string }).id),
  );

  const activeGameObj = catalog.games.find((g) => g.slug === activeGame);
  const reduced = useReducedMotion() ?? false;

  const hasFilters = !!(regionFilter || minRankKey || maxRankKey);
  const activeFilterCount = [regionFilter, minRankKey, maxRankKey].filter(Boolean).length;

  function handleGameChange(slug: string) {
    setGameSlug(slug);
    setRegionFilter('');
    setMinRankKey('');
    setMaxRankKey('');
  }

  function clearFilters() {
    setRegionFilter('');
    setMinRankKey('');
    setMaxRankKey('');
  }

  const hasTeam = (teamsQuery.data ?? []).length > 0;

  function openListing(listing: ScrimListingEnriched) {
    if (!user) { navigate(signIn(location.pathname + location.search)); return; }
    setDetailListing(listing);
  }

  const regionOptions = regions.map((r) => ({
    value: r.regionKey,
    label: r.displayName,
  }));
  const rankOptions = rankTiers.map((t) => ({
    value: t.tierKey,
    label: t.displayName,
    iconUrl: t.iconUrl,
  }));
  const gameOptions = catalog.games.map((g) => ({
    value: g.slug,
    label: g.name,
  }));

  const filterSelects = (
    <>
      <FilterSelectGroup label="Game" value={activeGame} onChange={handleGameChange} options={gameOptions} placeholder="Select game" />
      <FilterSelectGroup label="Region" value={regionFilter} onChange={setRegionFilter} options={regionOptions} placeholder="Any region" />
      <FilterSelectGroup label="Min rank" value={minRankKey} onChange={setMinRankKey} options={rankOptions} placeholder="Any" />
      <FilterSelectGroup label="Max rank" value={maxRankKey} onChange={setMaxRankKey} options={rankOptions} placeholder="Any" />
    </>
  );

  interface ChipDef { key: string; label: string; iconUrl?: string | null; onDismiss: () => void }
  const activeChips: ChipDef[] = [
    ...(regionFilter ? [{ key: 'region', label: regionOptions.find((o) => o.value === regionFilter)?.label ?? regionFilter, onDismiss: () => setRegionFilter('') }] : []),
    ...(minRankKey ? [{ key: 'min-rank', label: `Min: ${rankTierMap.get(minRankKey) ?? minRankKey}`, iconUrl: rankTiers.find((t) => t.tierKey === minRankKey)?.iconUrl, onDismiss: () => setMinRankKey('') }] : []),
    ...(maxRankKey ? [{ key: 'max-rank', label: `Max: ${rankTierMap.get(maxRankKey) ?? maxRankKey}`, iconUrl: rankTiers.find((t) => t.tierKey === maxRankKey)?.iconUrl, onDismiss: () => setMaxRankKey('') }] : []),
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
        <UpNextStrip
          lead={upNextLead}
          more={upNextMore}
          onDeadlinePassed={() => void upNextQuery.refetch()}
          className="mb-6"
        />

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
                {chip.iconUrl && <img src={chip.iconUrl} alt="" className="h-3.5 w-3.5 object-contain shrink-0" />}
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

              return (
                <div key={listing.id} role="listitem" className="flex flex-col">
                  <ScrimCard
                    listing={listing}
                    isOwner={isOwner}
                    hasTeam={hasTeam}
                    onOpen={() => openListing(listing)}
                  />
                </div>
              );
            })}
          </motion.div>
        )}
      </main>

      <ScrimDetailModal
        listingId={detailListing?.id ?? null}
        teamName={detailListing?.teamName}
        teamLogoUrl={detailListing?.teamLogoUrl}
        gameSlug={detailListing?.gameSlug}
        isOwner={detailListing?.teamId ? myTeamIds.has(detailListing.teamId) : false}
        onClose={() => setDetailListing(null)}
      />
    </CompetitivePageShell>
  );
}
