/**
 * FindTeammatesFilterPanel — filter controls for FindTeammatesPage.
 * Used in the desktop left rail and the mobile bottom sheet.
 * Receives catalog data as props (no data fetching).
 */
import { cn } from '@/lib/utils';
import { RankSelector } from './RankSelector';
import { ALL_LFG_INTENTS } from '@/lib/lfgIntentOptions';
import type { CatalogRankTier, CatalogGameRole, CatalogRegion, LfgIntent } from '@/types/competitive';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  minRank: number | undefined;
  maxRank: number | undefined;
  roles: string[];
  regionKey: string | undefined;
  intents: LfgIntent[];
}

export const INITIAL_FILTER: FilterState = {
  minRank: undefined,
  maxRank: undefined,
  roles: [],
  regionKey: undefined,
  intents: [],
};

export function activeFilterCount(filters: FilterState, showIntents: boolean): number {
  let n = 0;
  if (filters.minRank != null) n++;
  if (filters.maxRank != null) n++;
  if (filters.roles.length) n++;
  if (filters.regionKey) n++;
  if (showIntents && filters.intents.length) n++;
  return n;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface FilterPanelProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  ranks: CatalogRankTier[];
  gameRoles: CatalogGameRole[];
  regions: CatalogRegion[];
  showIntents: boolean;
}

// ─── Caption ──────────────────────────────────────────────────────────────────

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">{children}</p>;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 border text-[12px] transition-colors min-h-[44px]',
        active
          ? 'border-white/30 bg-white text-[#08080a]'
          : 'border-white/[0.08] bg-transparent text-white/55 hover:border-white/20',
      )}
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FindTeammatesFilterPanel({ filters, onChange, ranks, gameRoles, regions, showIntents }: FilterPanelProps) {
  function toggle<K extends 'roles' | 'intents'>(key: K, value: string) {
    const arr = filters[key] as string[];
    onChange({ ...filters, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] });
  }

  const filterCount = activeFilterCount(filters, showIntents);

  return (
    <div role="search" aria-label="Player filters" className="space-y-5">

      {/* RANK RANGE */}
      <div>
        <Caption>Rank Range</Caption>
        <RankSelector
          ranks={ranks}
          minValue={filters.minRank}
          maxValue={filters.maxRank}
          onMinChange={(v) => onChange({ ...filters, minRank: v })}
          onMaxChange={(v) => onChange({ ...filters, maxRank: v })}
        />
        {(filters.minRank != null || filters.maxRank != null) && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, minRank: undefined, maxRank: undefined })}
            className="text-[12px] text-white/35 hover:text-white/60 mt-1 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ROLE */}
      <div>
        <Caption>Role</Caption>
        <div className="flex flex-wrap gap-2">
          {gameRoles.map(r => (
            <Chip key={r.roleKey} active={filters.roles.includes(r.roleKey)} onClick={() => toggle('roles', r.roleKey)}>
              {r.iconUrl && <img src={r.iconUrl} alt={r.displayName} width={16} height={16} />}
              {r.displayName}
            </Chip>
          ))}
        </div>
      </div>

      {/* REGION */}
      <div>
        <Caption>Region</Caption>
        <div className="flex flex-wrap gap-2">
          {regions.map(rg => (
            <Chip key={rg.regionKey} active={filters.regionKey === rg.regionKey} onClick={() => onChange({ ...filters, regionKey: filters.regionKey === rg.regionKey ? undefined : rg.regionKey })}>
              {rg.displayName}
            </Chip>
          ))}
        </div>
      </div>

      {/* INTENT (LF Team tab only) */}
      {showIntents && (
        <div>
          <Caption>Intent</Caption>
          <div className="flex flex-wrap gap-2">
            {ALL_LFG_INTENTS.map(o => (
              <Chip key={o.value} active={filters.intents.includes(o.value)} onClick={() => toggle('intents', o.value)}>
                {o.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Clear all */}
      {filterCount > 0 && (
        <button
          type="button"
          onClick={() => onChange(INITIAL_FILTER)}
          className="text-[12px] text-white/35 hover:text-white transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
