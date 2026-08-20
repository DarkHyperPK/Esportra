import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { ZONE_META } from './types';

interface AuditEntry {
  id: string;
  placementId: string;
  placementZone: string;
  slotNumber: number | null;
  action: string;
  details: string | null;
  createdAt: string;
  sponsorName: string | null;
  tournamentName: string | null;
  performedByName: string | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Created', color: 'bg-emerald-500/10 text-emerald-400' },
  replaced: { label: 'Creative Replaced', color: 'bg-blue-500/10 text-blue-400' },
  removed_creative: { label: 'Creative Removed', color: 'bg-amber-500/10 text-amber-400' },
  removed: { label: 'Deleted', color: 'bg-red-500/10 text-red-400' },
  unassigned: { label: 'Unassigned', color: 'bg-red-500/10 text-red-400' },
  expired: { label: 'Expired', color: 'bg-zinc-500/10 text-zinc-400' },
  updated: { label: 'Updated', color: 'bg-zinc-500/10 text-zinc-300' },
};

export function AuditLog() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin', 'placement-audit-all'],
    queryFn: () => apiClient.get<AuditEntry[]>('/api/admin/placements/audit-log'),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-bold text-white">Placement Audit Log</h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">{entries.length} event{entries.length !== 1 ? 's' : ''} recorded</p>
      </div>

      {isLoading && <div className="p-10 text-center text-sm text-zinc-500">Loading...</div>}
      {!isLoading && entries.length === 0 && <div className="p-10 text-center text-sm text-zinc-500">No audit events yet.</div>}

      {entries.length > 0 && (
        <div className="divide-y divide-zinc-800/50">
          {entries.map(entry => {
            const actionMeta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'bg-zinc-800 text-zinc-400' };
            const zoneMeta = ZONE_META[entry.placementZone as keyof typeof ZONE_META];
            return (
              <div key={entry.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.01]">
                <div className="shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${actionMeta.color}`}>
                    {actionMeta.label}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-white">
                    <span className="font-medium">{entry.sponsorName || 'Unknown sponsor'}</span>
                    <span className="text-zinc-500"> · </span>
                    <span className="text-zinc-400">{zoneMeta?.label || entry.placementZone}</span>
                    {entry.slotNumber && <span className="text-zinc-600"> · Slot {entry.slotNumber}</span>}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {entry.tournamentName || 'Global'}
                    {entry.performedByName && <span> · by {entry.performedByName}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-[10px] text-zinc-600">
                  {new Date(entry.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
