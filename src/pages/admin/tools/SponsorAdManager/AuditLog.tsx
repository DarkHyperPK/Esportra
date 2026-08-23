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
  created: { label: 'Created', color: 'border-white/40 text-white' },
  replaced: { label: 'Creative Replaced', color: 'border-white/20 text-zinc-200' },
  removed_creative: { label: 'Creative Removed', color: 'border-rose-500/30 text-rose-300' },
  removed: { label: 'Deleted', color: 'border-red-500/30 text-red-300' },
  unassigned: { label: 'Unassigned', color: 'border-red-500/30 text-red-300' },
  expired: { label: 'Expired', color: 'border-white/10 text-zinc-500' },
  updated: { label: 'Updated', color: 'border-white/10 text-zinc-300' },
};

export function AuditLog() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['admin', 'placement-audit-all'],
    queryFn: () => apiClient.get<AuditEntry[]>('/api/admin/placements/audit-log'),
  });

  return (
    <div className="border border-white/10 bg-[#0a0a0c]/92">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-zinc-400">Placement Audit Log</h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">{entries.length} event{entries.length !== 1 ? 's' : ''} recorded</p>
      </div>

      {isLoading && <div className="p-10 text-center text-sm text-zinc-500">Loading...</div>}
      {!isLoading && entries.length === 0 && <div className="p-10 text-center text-sm text-zinc-500">No audit events yet.</div>}

      {entries.length > 0 && (
        <div className="divide-y divide-white/5">
          {entries.map(entry => {
            const actionMeta = ACTION_LABELS[entry.action] ?? { label: entry.action, color: 'border-white/10 text-zinc-400' };
            const zoneMeta = ZONE_META[entry.placementZone as keyof typeof ZONE_META];
            return (
              <div key={entry.id} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.02]">
                <div className="shrink-0">
                  <span className={`inline-block border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${actionMeta.color}`}>
                    {actionMeta.label}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-white">
                    <span className="font-medium">{entry.sponsorName || 'Unknown sponsor'}</span>
                    <span className="text-zinc-600"> · </span>
                    <span className="text-zinc-400">{zoneMeta?.label || entry.placementZone}</span>
                    {entry.slotNumber && <span className="text-zinc-600"> · Slot {entry.slotNumber}</span>}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                    {entry.tournamentName || 'Global'}
                    {entry.performedByName && <span> · by {entry.performedByName}</span>}
                  </div>
                </div>
                <div className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-600">
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
