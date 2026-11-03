/**
 * Find a scrim filters. DiscoveryFilterPanel is the vertical panel (desktop left rail, and the phone sheet);
 * DiscoveryToolbar is the phone Filters button plus the applied-filter chips. Prop-driven; the page owns the state.
 */

import { SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { DiscoverySort } from '@/services/scrimListingView';
import { DiscoveryFilterSelect, type FilterOption } from './DiscoveryFilterSelect';

export interface FilterChip {
  key: string;
  label: string;
  iconUrl?: string | null;
  onDismiss: () => void;
}

export interface DiscoveryFilterProps {
  games: FilterOption[];
  /** "" = all games. */
  game: string;
  onGameChange: (v: string) => void;
  regions: FilterOption[];
  region: string;
  onRegionChange: (v: string) => void;
  ranks: FilterOption[];
  minRank: string;
  onMinRankChange: (v: string) => void;
  maxRank: string;
  onMaxRankChange: (v: string) => void;
  sort: DiscoverySort;
  onSortChange: (v: DiscoverySort) => void;
}

const SORT_OPTIONS: FilterOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'record', label: 'Best record' },
  { value: 'reliable', label: 'Most reliable' },
];

function Caption({ children }: { children: string }) {
  return <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-white/40">{children}</p>;
}

function GameChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('min-h-[40px] border px-3 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        active ? 'border-white/30 bg-white text-[#08080a]' : 'border-white/[0.08] text-white/55 hover:border-white/20 hover:text-white')}>
      {children}
    </button>
  );
}

/** Game, region, rank range and sort, stacked. Rank filters only appear once one game is chosen, since each game has its own ladder. */
export function DiscoveryFilterPanel(p: DiscoveryFilterProps) {
  return (
    <div role="search" aria-label="Scrim filters" className="space-y-5">
      <div>
        <Caption>Game</Caption>
        <div role="group" aria-label="Game" className="flex flex-wrap gap-1.5">
          <GameChip active={!p.game} onClick={() => p.onGameChange('')}>All games</GameChip>
          {p.games.map((g) => <GameChip key={g.value} active={p.game === g.value} onClick={() => p.onGameChange(g.value)}>{g.label}</GameChip>)}
        </div>
      </div>
      <DiscoveryFilterSelect label="Region" value={p.region} onChange={p.onRegionChange} options={p.regions} placeholder="Any region" />
      {p.game && (
        <>
          <DiscoveryFilterSelect label="Min rank" value={p.minRank} onChange={p.onMinRankChange} options={p.ranks} placeholder="Any" />
          <DiscoveryFilterSelect label="Max rank" value={p.maxRank} onChange={p.onMaxRankChange} options={p.ranks} placeholder="Any" />
        </>
      )}
      <DiscoveryFilterSelect label="Sort by" value={p.sort} onChange={(v) => p.onSortChange((v || 'newest') as DiscoverySort)} options={SORT_OPTIONS} placeholder="Newest" allowAny={false} />
    </div>
  );
}

/** Phone Filters button (opens the same panel in a sheet) and the applied-filter chips, removable one by one. */
export function DiscoveryToolbar({ chips, ...filters }: DiscoveryFilterProps & { chips: FilterChip[] }) {
  return (
    <div className="space-y-3">
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button type="button"
              className="inline-flex min-h-[44px] items-center gap-2 border border-white/[0.14] px-4 text-[13px] text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filters
              {chips.length > 0 && <span className="inline-flex h-4 min-w-[1rem] items-center justify-center bg-white px-1 font-mono text-[10px] font-semibold text-black">{chips.length}</span>}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="space-y-4 border-t border-white/[0.08] bg-background p-6">
            <SheetHeader><SheetTitle className="font-heading text-[16px] font-bold normal-case tracking-normal text-white">Filters</SheetTitle></SheetHeader>
            <DiscoveryFilterPanel {...filters} />
          </SheetContent>
        </Sheet>
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Applied filters">
          {chips.map((chip) => (
            <li key={chip.key} className="inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.05] py-1 pl-2.5 pr-1.5 text-[12px] text-white/70">
              {chip.iconUrl && <img src={chip.iconUrl} alt="" className="h-3.5 w-3.5 object-contain" />}
              {chip.label}
              <button type="button" onClick={chip.onDismiss} aria-label={`Remove ${chip.label} filter`} className="p-1 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
