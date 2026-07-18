import React, { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { useTournamentPlacements, type Placement } from '@/hooks/useAdminPlacements';
import { ZONE_META, type PlacementZone } from './types';
import { PlacementCard } from './PlacementCard';

interface Tournament {
  id: string;
  name: string;
}

interface Props {
  tournaments: Tournament[];
  onAssign: (zone: PlacementZone, tournamentId: string) => void;
  onEdit: (placement: Placement) => void;
  onDelete: (id: string) => void;
  onPreview: (tournamentId: string) => void;
}

const TOURNAMENT_ZONES: PlacementZone[] = ['sidebar_partner', 'wide_partner', 'partner_logo'];

export const TournamentView: React.FC<Props> = ({ tournaments, onAssign, onEdit, onDelete, onPreview }) => {
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? '');
  const { data: placements = [], isLoading } = useTournamentPlacements(selectedId);

  const placementsByZone = (zone: string) => placements.filter(p => p.placementZone === zone);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white"
        >
          <option value="">Select tournament...</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {selectedId && (
          <button
            onClick={() => onPreview(selectedId)}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
          >
            <Eye className="w-4 h-4" /> Preview Layout
          </button>
        )}
      </div>

      {!selectedId && (
        <div className="text-center py-16 text-zinc-600 text-sm">Select a tournament to manage its ad placements.</div>
      )}

      {selectedId && isLoading && (
        <div className="text-center py-16 text-zinc-600 text-sm">Loading placements...</div>
      )}

      {selectedId && !isLoading && TOURNAMENT_ZONES.map(zone => {
        const meta = ZONE_META[zone];
        const zonePlacements = placementsByZone(zone);
        const slotsRemaining = meta.maxSlots - zonePlacements.length;

        return (
          <div key={zone} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">{meta.label}</h4>
                <p className="text-xs text-zinc-500">{meta.description} · {zonePlacements.length}/{meta.maxSlots} slots filled</p>
              </div>
              {slotsRemaining > 0 && (
                <button
                  onClick={() => onAssign(zone, selectedId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Assign
                </button>
              )}
            </div>

            {zonePlacements.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {zonePlacements.map(p => (
                  <PlacementCard key={p.id} placement={p} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-zinc-800 rounded-lg py-8 text-center text-xs text-zinc-600">
                No sponsors assigned to this zone yet.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
