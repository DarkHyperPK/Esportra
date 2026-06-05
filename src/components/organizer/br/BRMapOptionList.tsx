import React from 'react';
import { cn } from '@/lib/utils';
import type { BRMapCatalogItem } from '@/types/battleRoyale';

interface BRMapOptionListProps {
  items: BRMapCatalogItem[];
  selected: string[];
  onToggle: (mapName: string, checked: boolean) => void;
  selectable?: boolean;
  columns?: 2 | 3;
}

export const BRMapOptionList: React.FC<BRMapOptionListProps> = ({
  items,
  selected,
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
