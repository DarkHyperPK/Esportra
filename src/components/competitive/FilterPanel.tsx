import { ToggleRow } from '@/components/ui/kit';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoleChip } from './RoleChip';
import type { GameRole, GameRegion, RankTier, PlayerSearchFilters, LfgSearchFilters } from '@/types/competitive';
import type { LfgIntent } from '@/types/competitive';

interface PlayerFilterPanelProps {
  mode: 'players';
  filters: PlayerSearchFilters;
  onChange: (filters: PlayerSearchFilters) => void;
  gameRoles: GameRole[];
  regions: GameRegion[];
  rankTiers: RankTier[];
}

interface LfgFilterPanelProps {
  mode: 'lfg';
  filters: LfgSearchFilters;
  onChange: (filters: LfgSearchFilters) => void;
  regions: GameRegion[];
  rankTiers: RankTier[];
  gameRoles?: never;
}

type FilterPanelProps = PlayerFilterPanelProps | LfgFilterPanelProps;

const LFG_INTENTS: { slug: LfgIntent; label: string }[] = [
  { slug: 'ranked', label: 'RANKED' },
  { slug: 'scrims', label: 'SCRIMS' },
  { slug: 'casual', label: 'CASUAL' },
  { slug: 'coaching', label: 'COACHING' },
];

function FilterEyebrow() {
  return (
    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35 mb-4">
      FILTERS
    </p>
  );
}

function FilterDivider() {
  return <div className="border-t border-white/[0.08] my-4" />;
}

/**
 * Filter sidebar panel for the discovery page.
 * Desktop: sticky sidebar; Mobile: rendered inside a bottom sheet.
 * On desktop, filter changes apply immediately (no Apply button).
 */
export function FilterPanel(props: FilterPanelProps) {
  if (props.mode === 'players') {
    const { filters, onChange, gameRoles, regions, rankTiers } = props;

    function toggleRole(slug: string) {
      const current = filters.roles ?? [];
      const next = current.includes(slug) ? current.filter((r) => r !== slug) : [...current, slug];
      onChange({ ...filters, roles: next.length ? next : undefined });
    }

    const activeRoles = filters.roles ?? [];

    return (
      <div className="space-y-0">
        <FilterEyebrow />

        {/* Role filter */}
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-white/80">Role</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by role">
            {gameRoles.map((r) => (
              <RoleChip
                key={r.slug} role={r.slug} displayName={r.displayName}
                mode="toggle" active={activeRoles.includes(r.slug)}
                onClick={() => toggleRole(r.slug)}
              />
            ))}
          </div>
          <p className="text-[11px] text-white/35">Players with any matching role are shown.</p>
        </div>

        <FilterDivider />

        {/* Rank range */}
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-white/80">Rank range</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-white/35 mb-1">Min</p>
              <Select value={filters.minRank ?? ''} onValueChange={(v) => onChange({ ...filters, minRank: v || undefined })}>
                <SelectTrigger aria-label="Minimum rank" className="rounded-none border-white/10 bg-black/30 text-white h-9 text-[13px]">
                  <SelectValue placeholder="Any rank" />
                </SelectTrigger>
                <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
                  {rankTiers.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[11px] text-white/35 mb-1">Max</p>
              <Select value={filters.maxRank ?? ''} onValueChange={(v) => onChange({ ...filters, maxRank: v || undefined })}>
                <SelectTrigger aria-label="Maximum rank" className="rounded-none border-white/10 bg-black/30 text-white h-9 text-[13px]">
                  <SelectValue placeholder="Any rank" />
                </SelectTrigger>
                <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
                  {rankTiers.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <FilterDivider />

        {/* Region */}
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-white/80">Region</p>
          <Select value={filters.region ?? ''} onValueChange={(v) => onChange({ ...filters, region: v || undefined })}>
            <SelectTrigger className="rounded-none border-white/10 bg-black/30 text-white h-9 text-[13px]">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
              {regions.map((r) => <SelectItem key={r.slug} value={r.slug}>{r.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <FilterDivider />

        {/* LFT only */}
        <ToggleRow
          id="filter-lft"
          title="LFT only"
          description="Show only players looking for a team."
          checked={!!filters.lftOnly}
          onCheckedChange={(v) => onChange({ ...filters, lftOnly: v || undefined })}
        />

        <FilterDivider />

        {/* Clear */}
        <button
          type="button"
          onClick={() => onChange({ game: filters.game })}
          className="text-[13px] text-white/35 hover:underline"
        >
          Clear filters
        </button>
      </div>
    );
  }

  // LFG filters
  const { filters, onChange, regions, rankTiers } = props;
  const activeIntents = (filters.intent ?? []) as LfgIntent[];

  function toggleIntent(slug: LfgIntent) {
    const next = activeIntents.includes(slug)
      ? activeIntents.filter((i) => i !== slug)
      : [...activeIntents, slug];
    onChange({ ...filters, intent: next.length ? next : undefined });
  }

  return (
    <div className="space-y-0">
      <FilterEyebrow />

      {/* Intent filter */}
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-white/80">Intent</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by intent">
          {LFG_INTENTS.map((i) => (
            <RoleChip
              key={i.slug} role={i.slug} displayName={i.label}
              mode="toggle" active={activeIntents.includes(i.slug)}
              onClick={() => toggleIntent(i.slug)}
            />
          ))}
        </div>
      </div>

      <FilterDivider />

      {/* Rank range */}
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-white/80">Rank range</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[11px] text-white/35 mb-1">Min</p>
            <Select value={filters.minRank ?? ''} onValueChange={(v) => onChange({ ...filters, minRank: v || undefined })}>
              <SelectTrigger aria-label="Minimum rank" className="rounded-none border-white/10 bg-black/30 text-white h-9 text-[13px]">
                <SelectValue placeholder="Any rank" />
              </SelectTrigger>
              <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
                {rankTiers.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[11px] text-white/35 mb-1">Max</p>
            <Select value={filters.maxRank ?? ''} onValueChange={(v) => onChange({ ...filters, maxRank: v || undefined })}>
              <SelectTrigger aria-label="Maximum rank" className="rounded-none border-white/10 bg-black/30 text-white h-9 text-[13px]">
                <SelectValue placeholder="Any rank" />
              </SelectTrigger>
              <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
                {rankTiers.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <FilterDivider />

      <div className="space-y-2">
        <p className="text-[13px] font-medium text-white/80">Region</p>
        <Select value={filters.region ?? ''} onValueChange={(v) => onChange({ ...filters, region: v || undefined })}>
          <SelectTrigger className="rounded-none border-white/10 bg-black/30 text-white h-9 text-[13px]">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent className="rounded-none bg-[#1a1a1a] border-white/10">
            {regions.map((r) => <SelectItem key={r.slug} value={r.slug}>{r.displayName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <FilterDivider />

      <button
        type="button"
        onClick={() => onChange({ game: filters.game })}
        className="text-[13px] text-white/35 hover:underline"
      >
        Clear filters
      </button>
    </div>
  );
}
