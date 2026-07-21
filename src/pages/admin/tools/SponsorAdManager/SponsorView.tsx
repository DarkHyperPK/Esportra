import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useSponsorPlacements, type Placement } from '@/hooks/useAdminPlacements';
import { ZONE_META, displayTier, zonesForTier } from './types';
import { PlacementCard } from './PlacementCard';

interface Sponsor { id: string; name: string; tier: string; logo_url?: string; }

interface Props {
  sponsors: Sponsor[];
  onAssign: (sponsorId: string) => void;
  onEdit: (placement: Placement) => void;
  onDelete: (id: string) => void;
  onReplace?: (placement: Placement) => void;
  onRemove?: (placement: Placement) => void;
  onUnassign?: (placement: Placement) => void;
}

export const SponsorView: React.FC<Props> = ({ sponsors, onAssign, onEdit, onDelete, onReplace, onRemove, onUnassign }) => {
  const [selectedId, setSelectedId] = useState('');
  const { data: placements = [], isLoading } = useSponsorPlacements(selectedId);

  const selectedSponsor = sponsors.find(s => s.id === selectedId);
  const allowedZones = selectedSponsor ? zonesForTier(selectedSponsor.tier) : [];

  const globalPlacements = placements.filter(p => !p.tournamentId);
  const tournamentPlacements = placements.filter(p => p.tournamentId);

  const tournamentGroups = tournamentPlacements.reduce<Record<string, { name: string; placements: Placement[] }>>((acc, p) => {
    const key = p.tournamentId!;
    if (!acc[key]) acc[key] = { name: p.tournamentName || 'Unknown', placements: [] };
    acc[key].placements.push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white"
        >
          <option value="">Select sponsor...</option>
          {sponsors.map(s => <option key={s.id} value={s.id}>{s.name} ({displayTier(s.tier)})</option>)}
        </select>
        {selectedId && (
          <button
            onClick={() => onAssign(selectedId)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Placement
          </button>
        )}
      </div>

      {!selectedId && <div className="text-center py-16 text-zinc-600 text-sm">Select a sponsor to see all their placements.</div>}
      {selectedId && isLoading && <div className="text-center py-16 text-zinc-600 text-sm">Loading...</div>}

      {selectedId && !isLoading && selectedSponsor && (
        <>
          {/* Sponsor info bar */}
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            {selectedSponsor.logo_url && <img src={selectedSponsor.logo_url} alt="" className="h-6 w-auto" />}
            <span className="text-sm font-medium text-white">{selectedSponsor.name}</span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">{displayTier(selectedSponsor.tier)}</span>
            <span className="text-xs text-zinc-500 ml-2">Zones: {allowedZones.map(z => ZONE_META[z].label).join(', ')}</span>
            <span className="text-xs text-zinc-500 ml-auto">{placements.length} placement{placements.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Global placements */}
          {globalPlacements.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h4 className="text-sm font-bold text-white mb-4">Global Placements</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {globalPlacements.map(p => (
                  <PlacementCard key={p.id} placement={p} onEdit={onEdit} onDelete={onDelete} onReplace={onReplace} onRemove={onRemove} onUnassign={onUnassign} />
                ))}
              </div>
            </div>
          )}

          {/* Tournament placements grouped */}
          {Object.entries(tournamentGroups).map(([tid, group]) => (
            <div key={tid} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h4 className="text-sm font-bold text-white mb-1">{group.name}</h4>
              <p className="text-xs text-zinc-500 mb-4">
                {group.placements.map(p => ZONE_META[p.placementZone as keyof typeof ZONE_META]?.label || p.placementZone).join(', ')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.placements.map(p => (
                  <PlacementCard key={p.id} placement={p} onEdit={onEdit} onDelete={onDelete} onReplace={onReplace} onRemove={onRemove} onUnassign={onUnassign} />
                ))}
              </div>
            </div>
          ))}

          {placements.length === 0 && (
            <div className="border border-dashed border-zinc-800 rounded-lg py-12 text-center text-sm text-zinc-600">
              No placements yet. Click "New Placement" to assign this sponsor to a zone.
            </div>
          )}
        </>
      )}
    </div>
  );
};
