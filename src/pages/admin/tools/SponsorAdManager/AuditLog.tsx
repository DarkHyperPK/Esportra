import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAdminPlacements } from '@/hooks/useAdminPlacements';

interface AuditEntry {
  id: string;
  placementId: string;
  sponsorId: string;
  tournamentId: string | null;
  placementZone: string;
  slotNumber: number | null;
  action: string;
  performedBy: string | null;
  details: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Created', color: 'text-emerald-400' },
  replaced: { label: 'Creative Replaced', color: 'text-blue-400' },
  removed_creative: { label: 'Creative Removed', color: 'text-amber-400' },
  removed: { label: 'Deleted', color: 'text-red-400' },
  unassigned: { label: 'Unassigned', color: 'text-red-400' },
  expired: { label: 'Expired', color: 'text-zinc-400' },
  updated: { label: 'Updated', color: 'text-zinc-300' },
};

export function AuditLog() {
  const [selectedPlacementId, setSelectedPlacementId] = useState('');
  const query = useAdminPlacements({ pageSize: 100 });
  const placements = query.data?.items ?? [];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin', 'placement-audit', selectedPlacementId],
    queryFn: () => apiClient.get<AuditEntry[]>(`/api/admin/placements/${selectedPlacementId}/audit-log`),
    enabled: !!selectedPlacementId,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-3 border-b border-zinc-800 p-4">
        <select
          value={selectedPlacementId}
          onChange={e => setSelectedPlacementId(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
        >
          <option value="">Select a placement to view its history...</option>
          {placements.map(p => (
            <option key={p.id} value={p.id}>
              {p.sponsorName} — {p.placementZone} Slot {p.slotNumber ?? '?'} ({p.tournamentName || 'Global'})
            </option>
          ))}
        </select>
      </div>

      {!selectedPlacementId && (
        <div className="p-10 text-center text-sm text-zinc-500">Select a placement above to view its audit history.</div>
      )}
      {selectedPlacementId && isLoading && (
        <div className="p-10 text-center text-sm text-zinc-500">Loading audit log...</div>
      )}
      {selectedPlacementId && !isLoading && entries.length === 0 && (
        <div className="p-10 text-center text-sm text-zinc-500">No audit entries for this placement.</div>
      )}
      {entries.length > 0 && (
        <div className="divide-y divide-zinc-800">
          {entries.map(entry => {
            const actionMeta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'text-zinc-400' };
            return (
              <div key={entry.id} className="flex items-start gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase ${actionMeta.color}`}>{actionMeta.label}</span>
                    <span className="text-[10px] text-zinc-600">{entry.placementZone} · Slot {entry.slotNumber ?? '—'}</span>
                  </div>
                  {entry.tournamentId && <p className="text-[10px] text-zinc-500 mt-0.5">Tournament: {entry.tournamentId}</p>}
                  {entry.details && entry.details !== '{}' && <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">{entry.details}</p>}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-zinc-500">{new Date(entry.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                  {entry.performedBy && <div className="text-[9px] text-zinc-600 mt-0.5">by {entry.performedBy.slice(0, 8)}…</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
