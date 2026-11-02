/**
 * DiscoveryToolbar
 *
 * Game, region, rank range and sort for the Find a scrim page. Inline on
 * desktop; behind a Filters button (bottom sheet) on phones. Applied filters
 * show as removable chips. Prop-driven; the page owns the state.
 */

import { SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { DiscoverySort } from '@/services/scrimListingView';
import { DiscoveryFilterSelect, type FilterOption } from './DiscoveryFilterSelect';

export interface FilterChip {
  key: string;
  label: string;
  iconUrl?: string | null;
  onDismiss: () => void;
}

interface DiscoveryToolbarProps {
  games: FilterOption[];
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
  chips: FilterChip[];
}

const SORT_OPTIONS: FilterOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'record', label: 'Best record' },
  { value: 'reliable', label: 'Most reliable' },
];

export function DiscoveryToolbar(p: DiscoveryToolbarProps) {
  const controls = (
    <>
      <DiscoveryFilterSelect label="Game" value={p.game} onChange={p.onGameChange} options={p.games} placeholder="Select game" allowAny={false} />
      <DiscoveryFilterSelect label="Region" value={p.region} onChange={p.onRegionChange} options={p.regions} placeholder="Any region" />
      <DiscoveryFilterSelect label="Min rank" value={p.minRank} onChange={p.onMinRankChange} options={p.ranks} placeholder="Any" />
      <DiscoveryFilterSelect label="Max rank" value={p.maxRank} onChange={p.onMaxRankChange} options={p.ranks} placeholder="Any" />
    </>
  );
  const sort = (
    <DiscoveryFilterSelect label="Sort by" value={p.sort} onChange={(v) => p.onSortChange((v || 'newest') as DiscoverySort)} options={SORT_OPTIONS} placeholder="Newest" allowAny={false} />
  );

  return (
    <div className="space-y-3">
      <div className="hidden flex-wrap items-end gap-3 lg:flex">
        {controls}
        <div className="ml-auto">{sort}</div>
      </div>

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center gap-2 border border-white/[0.14] px-4 text-[13px] text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filters
              {p.chips.length > 0 && (
                <span className="inline-flex h-4 min-w-[1rem] items-center justify-center bg-white px-1 font-mono text-[10px] font-semibold text-black">
                  {p.chips.length}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="space-y-4 border-t border-white/[0.08] bg-background p-6">
            <SheetHeader>
              <SheetTitle className="font-heading text-[16px] font-bold normal-case tracking-normal text-white">Filters</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">{controls}{sort}</div>
          </SheetContent>
        </Sheet>
        <div className="w-[160px]">{sort}</div>
      </div>

      {p.chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Applied filters">
          {p.chips.map((chip) => (
            <li key={chip.key} className="inline-flex items-center gap-1.5 border border-white/[0.1] bg-white/[0.05] py-1 pl-2.5 pr-1.5 text-[12px] text-white/70">
              {chip.iconUrl && <img src={chip.iconUrl} alt="" className="h-3.5 w-3.5 object-contain" />}
              {chip.label}
              <button
                type="button"
                onClick={chip.onDismiss}
                aria-label={`Remove ${chip.label} filter`}
                className="p-1 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
