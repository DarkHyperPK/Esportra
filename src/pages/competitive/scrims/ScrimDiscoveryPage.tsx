import { useState, useMemo } from 'react';
import { Crosshair, SlidersHorizontal, CalendarDays, ChevronDown, X } from 'lucide-react';
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
import { GlowCard, StatusPill } from '@/components/competitive/GlowCard';
import { ScrimOfferForm } from '@/components/competitive/scrims/ScrimOfferForm';
import { ScrimSlotCalendar } from '@/components/competitive/scrims/ScrimSlotCalendar';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { formatPreferredDays } from '@/services/scrimUtils';
import {
  gameAbbrev,
  formatTimeWindow,
  listingAge,
  deriveUpcomingSlots,
  type ScrimListingEnriched,
} from '@/services/scrimDiscoveryUtils';

// ─── Status maps ──────────────────────────────────────────────────────────────

const SCRIM_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  paused: 'Paused',
  closed: 'Closed',
};

const SCRIM_STATUS_TONE: Record<string, 'accent' | 'neutral'> = {
  open: 'accent',
  paused: 'neutral',
  closed: 'neutral',
};

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="border border-white/[0.06] bg-[#0f0f11] p-4 space-y-3 opacity-50 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-white/[0.06]" />
          <div className="h-4 w-36 bg-white/[0.06]" />
        </div>
        <div className="h-5 w-14 bg-white/[0.04]" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-3 w-12 bg-white/[0.04]" />
        <div className="h-3 w-20 bg-white/[0.04]" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 w-12 bg-white/[0.04]" />
        <div className="h-5 w-12 bg-white/[0.04]" />
        <div className="h-5 w-12 bg-white/[0.04]" />
        <div className="h-3 w-24 bg-white/[0.04]" />
      </div>
      <div className="h-3 w-24 bg-white/[0.04]" />
    </div>
  );
}

// ─── ScrimCard ────────────────────────────────────────────────────────────────

interface ScrimCardProps {
  listing: ScrimListingEnriched;
  isOwner: boolean;
  rankTierMap: Map<string, string>;
  isOfferOpen: boolean;
  slotExpanded: boolean;
  hasTeam: boolean;
  onRequestScrim: () => void;
  onToggleSlots: () => void;
}

function ScrimCard({
  listing,
  isOwner,
  rankTierMap,
  isOfferOpen,
  slotExpanded,
  hasTeam,
  onRequestScrim,
  onToggleSlots,
}: ScrimCardProps) {
  const reduced = useReducedMotion() ?? false;
  const isOpen = listing.status === 'open';
  const dayAbbrevs = formatPreferredDays(listing.preferredDays);
  const hasSchedule =
    dayAbbrevs.length > 0 ||
    (!!listing.preferredTimeStart && !!listing.preferredTimeEnd);
  const isRecurring = listing.scheduleType === 'recurring';
  const upcomingSlots = isRecurring ? deriveUpcomingSlots(listing) : [];
  const age = listingAge(listing.createdAt);

  const minRankDisplay = listing.minRankKey
    ? (rankTierMap.get(listing.minRankKey) ?? listing.minRankKey)
    : null;
  const maxRankDisplay = listing.maxRankKey
    ? (rankTierMap.get(listing.maxRankKey) ?? listing.maxRankKey)
    : null;
  const rankRange =
    minRankDisplay && maxRankDisplay && minRankDisplay !== maxRankDisplay
      ? `${minRankDisplay} – ${maxRankDisplay}`
      : minRankDisplay ?? maxRankDisplay ?? null;

  const initials = (listing.teamName ?? 'UT')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <GlowCard accentTop={isOpen}>
      {/* Row 1 — identity + status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          {listing.teamLogoUrl ? (
            <img
              src={listing.teamLogoUrl}
              alt=""
              className="h-8 w-8 object-cover shrink-0"
              aria-hidden="true"
            />
          ) : (
            <span
              className="h-8 w-8 flex items-center justify-center bg-white/[0.08] font-mono text-[11px] text-white/55 shrink-0"
              aria-hidden="true"
            >
              {initials}
            </span>
          )}
          <span className="font-heading text-[15px] font-bold text-white truncate">
            {listing.teamName ?? 'Unknown Team'}
          </span>
          {listing.teamTag && (
            <span className="text-[12px] text-white/45 shrink-0">
              [{listing.teamTag}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {listing.regionKey && (
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 bg-white/[0.05] px-1.5 py-0.5">
              {listing.regionKey.toUpperCase()}
            </span>
          )}
          <StatusPill
            label={SCRIM_STATUS_LABELS[listing.status] ?? listing.status.toUpperCase()}
            tone={SCRIM_STATUS_TONE[listing.status] ?? 'neutral'}
          />
        </div>
      </div>

      {/* Row 2 — game + mode + rank range */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        {listing.gameSlug && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
            {gameAbbrev(listing.gameSlug)}
          </span>
        )}
        {listing.modeKey && (
          <span className="text-[12px] text-white/40">{listing.modeKey}</span>
        )}
        {rankRange && (
          <span className="text-[12px] text-white/55 font-medium">{rankRange}</span>
        )}
      </div>

      {/* Row 3 — schedule hero */}
      {hasSchedule && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {dayAbbrevs.map((day) => (
            <span
              key={day}
              className="inline-flex px-2 py-0.5 bg-white/[0.07] font-mono text-[11px] text-white/80 font-semibold"
            >
              {day.toUpperCase()}
            </span>
          ))}
          {listing.preferredTimeStart && listing.preferredTimeEnd && (
            <span className="text-[13px] text-white/85 font-medium">
              {dayAbbrevs.length > 0 ? '· ' : ''}
              {formatTimeWindow(
                listing.preferredTimeStart,
                listing.preferredTimeEnd,
                listing.timezone ?? null,
              )}
            </span>
          )}
        </div>
      )}

      {/* Row 4 — recurring slot indicator */}
      {isRecurring && upcomingSlots.length > 0 && (
        <div className="mb-3">
          <button
            type="button"
            onClick={onToggleSlots}
            className="inline-flex items-center gap-1.5 px-2 py-1 border border-white/[0.08] bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            aria-expanded={slotExpanded}
          >
            <CalendarDays className="h-3 w-3 text-white/35" aria-hidden="true" />
            <span className="font-mono text-[11px] text-white/50">
              {upcomingSlots.length} open slot
              {upcomingSlots.length !== 1 ? 's' : ''} this week
            </span>
            <motion.span
              animate={reduced ? undefined : { rotate: slotExpanded ? 180 : 0 }}
              transition={{ duration: 0.18 }}
              className="inline-flex"
            >
              <ChevronDown className="h-3 w-3 text-white/35" aria-hidden="true" />
            </motion.span>
          </button>
        </div>
      )}

      {/* Row 5 — meta strip */}
      <div className="flex items-center gap-3 mb-2">
        {age && (
          <span className="text-[11px] text-white/30">Listed {age}</span>
        )}
        {(listing.scrimsCompleted ?? 0) > 0 && (
          <span className="text-[11px] text-white/30">
            {listing.scrimsCompleted} scrims
          </span>
        )}
        {!hasSchedule && listing.notes && (
          <span className="text-[13px] text-white/45 line-clamp-1">
            {listing.notes}
          </span>
        )}
      </div>

      {/* Row 6 — action strip */}
      <div className="flex items-center justify-end gap-3">
        {isOwner ? (
          <Link
            to="/competitive/scrims/workspace"
            className="px-3 py-1.5 text-[13px] border border-white/[0.12] text-white/55 hover:text-white hover:border-white/25 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            Manage
          </Link>
        ) : isOpen && hasTeam ? (
          <motion.button
            type="button"
            whileTap={!reduced ? { scale: 0.97 } : undefined}
            transition={{ duration: 0.12 }}
            onClick={isOfferOpen ? undefined : onRequestScrim}
            aria-pressed={isOfferOpen}
            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[13px] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            Request Scrim
          </motion.button>
        ) : isOpen && !hasTeam ? (
          <Link
            to="/teams"
            className="px-3 py-1.5 text-[12px] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors duration-150"
          >
            Join a team to request
          </Link>
        ) : (
          <span className="text-[12px] text-white/30">Closed</span>
        )}
      </div>
    </GlowCard>
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
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);

  // Resolve active game slug: state > catalog first > empty (catalog loading)
  const activeGame = gameSlug || firstGame;

  const rankTiersQuery = useCatalogRankTiers(activeGame);
  const regionsQuery = useCatalogRegions(activeGame);
  const teamsQuery = useMyTeamsSummary();

  const rankTiers = rankTiersQuery.data ?? [];
  const regions = regionsQuery.data ?? [];

  // Build rankTierMap: tierKey → displayName (for card rank labels)
  const rankTierMap = useMemo(
    () => new Map((rankTiersQuery.data ?? []).map((t) => [t.tierKey, t.displayName])),
    [rankTiersQuery.data],
  );

  // Resolve sort orders from selected keys
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
    setExpandedSlotId(null);
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

  function handleToggleSlots(listingId: string) {
    setExpandedSlotId(expandedSlotId === listingId ? null : listingId);
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
      <FilterSelectGroup
        label="Game"
        value={activeGame}
        onChange={handleGameChange}
        options={gameOptions}
        placeholder="Select game"
      />
      <FilterSelectGroup
        label="Mode"
        value={modeFilter}
        onChange={setModeFilter}
        options={modeOptions}
        placeholder="Any mode"
      />
      <FilterSelectGroup
        label="Region"
        value={regionFilter}
        onChange={setRegionFilter}
        options={regionOptions}
        placeholder="Any region"
      />
      <FilterSelectGroup
        label="Min rank"
        value={minRankKey}
        onChange={setMinRankKey}
        options={rankOptions}
        placeholder="Any"
      />
      <FilterSelectGroup
        label="Max rank"
        value={maxRankKey}
        onChange={setMaxRankKey}
        options={rankOptions}
        placeholder="Any"
      />
    </>
  );

  // Applied filter chips
  interface ChipDef {
    key: string;
    label: string;
    onDismiss: () => void;
  }
  const activeChips: ChipDef[] = [
    ...(modeFilter
      ? [
          {
            key: 'mode',
            label: modeOptions.find((o) => o.value === modeFilter)?.label ?? modeFilter,
            onDismiss: () => setModeFilter(''),
          },
        ]
      : []),
    ...(regionFilter
      ? [
          {
            key: 'region',
            label: regionOptions.find((o) => o.value === regionFilter)?.label ?? regionFilter,
            onDismiss: () => setRegionFilter(''),
          },
        ]
      : []),
    ...(minRankKey
      ? [
          {
            key: 'min-rank',
            label: `Min: ${rankTierMap.get(minRankKey) ?? minRankKey}`,
            onDismiss: () => setMinRankKey(''),
          },
        ]
      : []),
    ...(maxRankKey
      ? [
          {
            key: 'max-rank',
            label: `Max: ${rankTierMap.get(maxRankKey) ?? maxRankKey}`,
            onDismiss: () => setMaxRankKey(''),
          },
        ]
      : []),
  ];

  return (
    <CompetitivePageShell>
      {/* Page intro */}
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
            <SheetContent
              side="bottom"
              className="bg-[#0f0f11] border-t border-white/[0.08] p-6 space-y-4"
            >
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
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.07] text-[12px] text-white/60"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onDismiss}
                  aria-label={`Remove ${chip.label} filter`}
                  className="hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* States */}
        {discoverQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : discoverQuery.isError ? (
          <div className="py-8 space-y-3">
            <p className="text-[14px] text-white/55">
              Could not load scrim listings. Check your connection and try again.
            </p>
            <Button
              variant="outline"
              onClick={() => void discoverQuery.refetch()}
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
            >
              Retry
            </Button>
          </div>
        ) : listings.length === 0 && !hasFilters ? (
          <div className="py-16 flex flex-col items-center gap-4 text-center">
            <Crosshair className="h-8 w-8 text-white/20" aria-hidden="true" />
            <p className="text-[15px] font-medium text-white/50">
              No open listings for {activeGameObj?.name ?? activeGame}.
            </p>
            <p className="text-[13px] text-white/35 max-w-xs">
              Post your schedule and teams will find you.
            </p>
            <Link
              to="/competitive/scrims/workspace"
              className="px-4 py-2 text-[13px] font-medium bg-rose-500 hover:bg-rose-600 text-white transition-colors"
            >
              Post a listing
            </Link>
          </div>
        ) : listings.length === 0 && hasFilters ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-[14px] text-white/40">No open slots at your rank.</p>
            <p className="text-[13px] text-white/30">
              Try a wider rank range or another region.
            </p>
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="rounded-none border border-white/[0.08] text-[13px] text-white/55 hover:text-white mt-2"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="list"
            aria-label="Scrim listings"
          >
            {listings.map((listing) => {
              const isOwner = listing.teamId
                ? myTeamIds.has(listing.teamId)
                : false;
              const isOfferOpen = activeOfferId === listing.id;
              const isSlotExpanded = expandedSlotId === listing.id;
              const upcomingSlots =
                listing.scheduleType === 'recurring'
                  ? deriveUpcomingSlots(listing)
                  : [];

              return (
                <div key={listing.id} role="listitem" className="mb-2">
                  <ScrimCard
                    listing={listing}
                    isOwner={isOwner}
                    rankTierMap={rankTierMap}
                    isOfferOpen={isOfferOpen}
                    slotExpanded={isSlotExpanded}
                    hasTeam={hasTeam}
                    onRequestScrim={() => handleRequestScrim(listing.id)}
                    onToggleSlots={() => handleToggleSlots(listing.id)}
                  />

                  {/* Slot timeline — below card, outside GlowCard */}
                  <AnimatePresence>
                    {isSlotExpanded && upcomingSlots.length > 0 && (
                      <motion.div
                        initial={reduced ? undefined : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduced ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="border border-white/[0.06] bg-black/30 p-3 space-y-0 mt-1">
                          {upcomingSlots.map((slot, idx) => (
                            <div
                              key={slot.proposedAt}
                              className={`flex items-center justify-between gap-3 py-2 ${
                                idx < upcomingSlots.length - 1
                                  ? 'border-b border-white/[0.04]'
                                  : ''
                              }`}
                            >
                              <div>
                                <p className="text-[13px] text-white/80 font-medium">
                                  {slot.dateLabel}
                                </p>
                                {slot.timeLabel && (
                                  <p className="text-[12px] text-white/50">
                                    {slot.timeLabel}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleToggleSlots(listing.id);
                                  handleRequestScrim(listing.id, slot.proposedAt);
                                }}
                                className="px-2.5 py-1 text-[12px] text-white/55 hover:text-white border border-white/[0.08] transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                              >
                                Select
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Offer form / slot calendar — below card / below slot timeline */}
                  {isOfferOpen && hasTeam && listing.scheduleType === 'recurring' ? (
                    <div className="border border-white/10 bg-black/40 p-4 mt-1">
                      <ScrimSlotCalendar
                        listing={listing}
                        onSlotSelected={() => {
                          setActiveOfferId(null);
                          setOfferPrefilledAt(undefined);
                        }}
                      />
                      <div className="mt-3 border-t border-white/[0.06] pt-3">
                        <button
                          onClick={() => {
                            setActiveOfferId(null);
                            setOfferPrefilledAt(undefined);
                          }}
                          className="text-[13px] text-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : isOfferOpen && hasTeam ? (
                    <ScrimOfferForm
                      listingId={listing.id}
                      gameSlug={listing.gameSlug}
                      prefilledProposedAt={offerPrefilledAt}
                      onClose={() => {
                        setActiveOfferId(null);
                        setOfferPrefilledAt(undefined);
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </motion.div>
        )}
      </main>
    </CompetitivePageShell>
  );
}
