import React, { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { BRMapCatalogItem } from '@/types/battleRoyale';

interface BRMapOptionListProps {
  items: BRMapCatalogItem[];
  /** Selected map names — defaults to [] when omitted. */
  selected?: string[];
  onToggle: (mapName: string, checked: boolean) => void;
  selectable?: boolean;
  columns?: 2 | 3;
}

export const BRMapOptionList: React.FC<BRMapOptionListProps> = ({
  items,
  selected = [],
  onToggle,
  selectable = true,
  columns = 3,
}) => {
  if (items.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        No maps in the backend game catalog for this game.
      </p>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-2',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {items.map((item) => {
        const isSelected = selected.includes(item.name);
        return (
          <button
            key={item.name}
            type="button"
            disabled={!selectable}
            onClick={() => selectable && onToggle(item.name, !isSelected)}
            className={cn(
              'rounded-xl border overflow-hidden text-left transition-all',
              selectable && 'hover:border-rose-500/40',
              isSelected
                ? 'border-rose-500/50 ring-1 ring-rose-500/30'
                : 'border-white/10 bg-white/[0.02]',
            )}
          >
            <div className="aspect-video bg-black/40 relative">
              <img
                src={item.imageUrl ?? undefined}
                alt={item.name}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <span className="absolute bottom-2 left-2 right-2 text-xs font-semibold text-white truncate">
                {item.name}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

interface BRMapBadgeProps {
  mapName: string;
  imageUrl?: string | null;
  className?: string;
}

interface BRMapHeroProps {
  mapName: string;
  imageUrl?: string | null;
  className?: string;
}

/** Player-facing map card — prominent in match room. */
export const BRMapHero: React.FC<BRMapHeroProps> = ({ mapName, imageUrl, className }) => (
  <div className={cn('relative rounded-xl overflow-hidden border border-white/10', className)}>
    {imageUrl ? (
      <div className="aspect-[21/9] relative bg-black/40">
        <img
          src={imageUrl}
          alt={mapName}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-0.5">Map</p>
          <p className="text-lg sm:text-xl font-bold text-white tracking-tight">{mapName}</p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03]">
        <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Map</p>
          <p className="text-base font-bold text-white truncate">{mapName}</p>
        </div>
      </div>
    )}
  </div>
);

/** Compact map strip for match room — tap to expand full preview. */
export const BRMapCompact: React.FC<BRMapBadgeProps> = ({ mapName, imageUrl, className }) => {
  const [expanded, setExpanded] = useState(false);
  const canExpand = Boolean(imageUrl);

  return (
    <div className={cn('rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => canExpand && setExpanded((open) => !open)}
        disabled={!canExpand}
        aria-expanded={expanded}
        aria-label={canExpand ? `${expanded ? 'Collapse' : 'Expand'} ${mapName} map` : mapName}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 text-left min-h-[44px] transition-colors',
          canExpand && 'hover:bg-white/[0.04] cursor-pointer',
          !canExpand && 'cursor-default',
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            className="h-12 w-20 rounded-lg object-cover border border-white/10 flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="h-12 w-20 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Map</p>
          <p className="text-sm font-bold text-white truncate">{mapName}</p>
        </div>
        {canExpand && (
          <ChevronDown
            className={cn(
              'w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && imageUrl && (
          <motion.div
            key="map-preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                <img
                  src={imageUrl}
                  alt={mapName}
                  className="w-full aspect-video object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                <p className="absolute bottom-2 left-3 right-3 text-sm font-bold text-white truncate">
                  {mapName}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const BRMapBadge: React.FC<BRMapBadgeProps> = ({ mapName, imageUrl, className }) => (
  <div className={cn('flex items-center gap-2 min-w-0', className)}>
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={mapName}
        className="h-8 w-12 rounded-md object-cover border border-white/10 flex-shrink-0"
        loading="lazy"
      />
    ) : null}
    <span className="text-sm font-semibold text-white truncate">{mapName}</span>
  </div>
);
