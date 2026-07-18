import React from 'react';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { type Placement } from '@/hooks/useAdminPlacements';

interface Props {
  placement: Placement;
  onEdit: (placement: Placement) => void;
  onDelete: (id: string) => void;
}

export const PlacementCard: React.FC<Props> = ({ placement, onEdit, onDelete }) => {
  const displayImage = placement.bannerUrl || placement.logoUrl || placement.sponsorLogoUrl;

  return (
    <div className="relative group bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={placement.sponsorName}
            className="w-full h-full object-contain p-4"
          />
        ) : (
          <div className="text-zinc-700 text-xs font-mono uppercase">No Creative</div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white truncate">{placement.sponsorName}</span>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${placement.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
            {placement.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        {placement.headline && (
          <p className="text-xs text-zinc-500 truncate">{placement.headline}</p>
        )}
        {placement.ctaUrl && (
          <a href={placement.ctaUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 mt-1">
            <ExternalLink className="w-3 h-3" /> {placement.ctaText || 'Link'}
          </a>
        )}
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={() => onEdit(placement)}
          className="p-1.5 bg-zinc-800/90 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
        >
          <Pencil className="w-3 h-3 text-zinc-300" />
        </button>
        <button
          onClick={() => onDelete(placement.id)}
          className="p-1.5 bg-zinc-800/90 border border-red-900/50 rounded hover:bg-red-900/30 transition-colors"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>
    </div>
  );
};
