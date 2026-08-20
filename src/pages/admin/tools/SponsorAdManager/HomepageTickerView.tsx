import { Ticket, Plus, ExternalLink } from 'lucide-react';
import { useAdminPlacements, type Placement } from '@/hooks/useAdminPlacements';
import { ZONE_META } from './types';
import { PlacementCard } from './PlacementCard';

interface Props {
  onAssignSlot: (slotNumber: number) => void;
  onEdit: (placement: Placement) => void;
  onDelete: (id: string) => void;
  onReplace?: (placement: Placement) => void;
  onRemove?: (placement: Placement) => void;
  onUnassign?: (placement: Placement) => void;
}

const meta = ZONE_META['homepage_ticker'];

export const HomepageTickerView: React.FC<Props> = ({
  onAssignSlot,
  onEdit,
  onDelete,
  onReplace,
  onRemove,
  onUnassign,
}) => {
  const { data, isLoading } = useAdminPlacements({ zone: 'homepage_ticker', scope: 'global' });
  const placements = data?.items ?? [];

  const validPlacements = placements.filter(
    p => p.lifecycle !== 'review' && p.slotNumber !== null && p.slotNumber >= 1 && p.slotNumber <= meta.maxSlots,
  );
  const reviewPlacements = placements.filter(p => !validPlacements.includes(p));
  const occupiedSlots = new Map(validPlacements.map(p => [p.slotNumber, p]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <Ticket className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Homepage Ticker</h3>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                / <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {meta.description} · {validPlacements.length}/{meta.maxSlots} occupied ·{' '}
              <span className="text-emerald-400 font-medium">All tiers</span>
            </p>
          </div>
        </div>
      </div>

      {/* Slot grid */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-zinc-600">Loading slots…</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: meta.maxSlots }, (_, i) => {
              const slotNumber = i + 1;
              const placement = occupiedSlots.get(slotNumber);
              return (
                <div key={slotNumber} className="min-w-0">
                  <div className="mb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                    Slot {slotNumber}
                  </div>
                  {placement ? (
                    <PlacementCard
                      placement={placement}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onReplace={onReplace}
                      onRemove={onRemove}
                      onUnassign={onUnassign}
                    />
                  ) : (
                    <button
                      onClick={() => onAssignSlot(slotNumber)}
                      className="flex aspect-square w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/50 text-xs text-zinc-500 transition-colors hover:border-rose-500/50 hover:text-rose-400"
                    >
                      <Plus className="h-3.5 w-3.5" /> Assign
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review queue */}
      {reviewPlacements.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">
            Needs Review ({reviewPlacements.length})
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {reviewPlacements.map(p => (
              <PlacementCard
                key={p.id}
                placement={p}
                onEdit={onEdit}
                onDelete={onDelete}
                onReplace={onReplace}
                onRemove={onRemove}
                onUnassign={onUnassign}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
