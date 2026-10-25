/**
 * RankSelector — visual rank picker used in CreateListingSheet and FindTeammatesFilterPanel.
 * Two buttons (Min / Max) that each open a popover list of rank tiers with icon + name.
 * Auto-corrects if min > max on selection.
 */
import { useState, useRef, useEffect } from 'react';
import type { CatalogRankTier } from '@/types/competitive';

// ─── Rank image with fallback ─────────────────────────────────────────────────

function RankImg({ iconUrl, displayName, className }: { iconUrl: string | null; displayName: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return <img src={iconUrl} alt={displayName} className={`shrink-0 object-contain ${className}`} onError={() => setFailed(true)} />;
  }
  return (
    <div className={`shrink-0 flex items-center justify-center bg-white/[0.06] font-mono text-[9px] text-white/35 ${className}`}>
      {displayName.slice(0, 2)}
    </div>
  );
}

// ─── Popover list ─────────────────────────────────────────────────────────────

interface RankPopoverProps {
  ranks: CatalogRankTier[];
  selected: number | undefined;
  onSelect: (sortOrder: number) => void;
  onClose: () => void;
}

function RankPopover({ ranks, selected, onSelect, onClose }: RankPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="listbox"
      className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#111111] border border-white/[0.08] overflow-y-auto max-h-56"
    >
      {ranks.map((r) => (
        <button
          key={r.id}
          type="button"
          role="option"
          aria-selected={selected === r.sortOrder}
          onClick={() => { onSelect(r.sortOrder); onClose(); }}
          className={`flex items-center gap-2 w-full px-3 h-9 text-left text-[13px] text-white/70 transition-colors ${selected === r.sortOrder ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]'}`}
        >
          <RankImg iconUrl={r.iconUrl} displayName={r.displayName} className="h-6 w-6" />
          {r.displayName}
        </button>
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RankSelectorProps {
  ranks: CatalogRankTier[];
  minValue: number | undefined;
  maxValue: number | undefined;
  onMinChange: (v: number | undefined) => void;
  onMaxChange: (v: number | undefined) => void;
  /** Stack vertically when true (mobile). Default: side-by-side. */
  stacked?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RankSelector({ ranks, minValue, maxValue, onMinChange, onMaxChange, stacked }: RankSelectorProps) {
  const [openFor, setOpenFor] = useState<'min' | 'max' | null>(null);

  function handleMinSelect(sortOrder: number) {
    onMinChange(sortOrder);
    if (maxValue !== undefined && sortOrder > maxValue) onMaxChange(sortOrder);
  }

  function handleMaxSelect(sortOrder: number) {
    onMaxChange(sortOrder);
    if (minValue !== undefined && sortOrder < minValue) onMinChange(sortOrder);
  }

  const minRank = ranks.find(r => r.sortOrder === minValue);
  const maxRank = ranks.find(r => r.sortOrder === maxValue);

  const btnBase = 'relative flex items-center gap-2 px-3 py-2 border border-white/[0.08] bg-white/[0.03] text-[13px] text-white hover:border-white/20 transition-colors';

  return (
    <div className={stacked ? 'flex flex-col gap-2' : 'flex gap-2'}>
      {/* Min rank */}
      <div className={`relative ${stacked ? 'w-full' : 'flex-1'}`}>
        <p className="text-[11px] font-mono uppercase text-white/40 mb-1">Min</p>
        <button type="button" aria-label="Minimum rank" onClick={() => setOpenFor(p => p === 'min' ? null : 'min')} className={`${btnBase} w-full`}>
          {minRank
            ? <><RankImg iconUrl={minRank.iconUrl} displayName={minRank.displayName} className="h-6 w-6" />{minRank.displayName}</>
            : <span className="text-white/35">Any</span>
          }
        </button>
        {openFor === 'min' && <RankPopover ranks={ranks} selected={minValue} onSelect={handleMinSelect} onClose={() => setOpenFor(null)} />}
      </div>

      {/* Max rank */}
      <div className={`relative ${stacked ? 'w-full' : 'flex-1'}`}>
        <p className="text-[11px] font-mono uppercase text-white/40 mb-1">Max</p>
        <button type="button" aria-label="Maximum rank" onClick={() => setOpenFor(p => p === 'max' ? null : 'max')} className={`${btnBase} w-full`}>
          {maxRank
            ? <><RankImg iconUrl={maxRank.iconUrl} displayName={maxRank.displayName} className="h-6 w-6" />{maxRank.displayName}</>
            : <span className="text-white/35">Any</span>
          }
        </button>
        {openFor === 'max' && <RankPopover ranks={ranks} selected={maxValue} onSelect={handleMaxSelect} onClose={() => setOpenFor(null)} />}
      </div>
    </div>
  );
}
