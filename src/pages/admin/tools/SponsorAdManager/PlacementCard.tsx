import React from 'react';
import { Pencil, Trash2, ExternalLink, RefreshCw, ImageMinus, UserX } from 'lucide-react';
import { type Placement } from '@/hooks/useAdminPlacements';

interface Props {
  placement: Placement;
  onEdit: (placement: Placement) => void;
  onDelete: (id: string) => void;
  onReplace?: (placement: Placement) => void;
  onRemove?: (placement: Placement) => void;
  onUnassign?: (placement: Placement) => void;
}

export const PlacementCard: React.FC<Props> = ({ placement, onEdit, onDelete, onReplace, onRemove, onUnassign }) => {
  const displayImage = placement.bannerUrl || placement.logoUrl || placement.sponsorLogoUrl;
  const hasCreative = !!(placement.bannerUrl || placement.logoUrl);

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
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${placement.lifecycle === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
            {placement.lifecycle}
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

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onReplace && (
          <button
            onClick={() => onReplace(placement)}
            title={hasCreative ? "Replace creative" : "Upload creative"}
            className="p-1.5 bg-zinc-800/90 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-zinc-300" />
          </button>
        )}
        {hasCreative && onRemove && (
          <button
            onClick={() => onRemove(placement)}
            title="Remove creative"
            className="p-1.5 bg-zinc-800/90 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <ImageMinus className="w-3 h-3 text-zinc-300" />
          </button>
        )}
        <button
          onClick={() => onEdit(placement)}
          title="Edit metadata"
          className="p-1.5 bg-zinc-800/90 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
        >
          <Pencil className="w-3 h-3 text-zinc-300" />
        </button>
        {onUnassign && (
          <button
            onClick={() => onUnassign(placement)}
            title="Unassign placement"
            className="p-1.5 bg-zinc-800/90 border border-zinc-700 rounded hover:bg-zinc-700 transition-colors"
          >
            <UserX className="w-3 h-3 text-amber-400" />
          </button>
        )}
        <button
          onClick={() => onDelete(placement.id)}
          title="Delete placement"
          className="p-1.5 bg-zinc-800/90 border border-red-900/50 rounded hover:bg-red-900/30 transition-colors"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>
    </div>
  );
};
