import { useEffect, useState } from 'react';
import { Pencil, Trash2, RefreshCw, ImageMinus, UserX } from 'lucide-react';

const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
import { useAdminPlacements, type Placement, type PlacementLifecycle } from '@/hooks/useAdminPlacements';
import { PLACEMENT_ZONES, ZONE_META } from './types';

interface Props { onEdit: (placement: Placement) => void; onDelete: (id: string) => void; onReplace?: (placement: Placement) => void; onRemove?: (placement: Placement) => void; onUnassign?: (placement: Placement) => void; }
const statuses: Array<{ value: PlacementLifecycle | ''; label: string }> = [
  { value: 'live', label: 'Live' }, { value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' },
  { value: 'inactive', label: 'Inactive' }, { value: 'expired', label: 'Expired' }, { value: 'review', label: 'Needs Review' }, { value: '', label: 'All statuses' },
];

export function PlacementInventory({ onEdit, onDelete, onReplace, onRemove, onUnassign }: Props) {
  const [status, setStatus] = useState<PlacementLifecycle | ''>('live');
  const [scope, setScope] = useState<'all' | 'global' | 'tournament'>('all');
  const [zone, setZone] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  useEffect(() => { const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300); return () => window.clearTimeout(timeout); }, [searchInput]);
  const query = useAdminPlacements({ status: status || undefined, scope, zone: zone || undefined, search: search || undefined, page, pageSize });
  const result = query.data;
  const placements = result?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / pageSize));

  return <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
    <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 p-4">
      <input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search sponsor or tournament" className="min-w-64 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white" />
      <select value={status} onChange={event => { setStatus(event.target.value as PlacementLifecycle | ''); setPage(1); }} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white">{statuses.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <select value={scope} onChange={event => { setScope(event.target.value as typeof scope); setPage(1); }} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"><option value="all">All scopes</option><option value="global">Global</option><option value="tournament">Tournament</option></select>
      <select value={zone} onChange={event => { setZone(event.target.value); setPage(1); }} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"><option value="">All zones</option>{PLACEMENT_ZONES.map(value => <option key={value} value={value}>{ZONE_META[value].label}</option>)}</select>
      <span className="text-xs text-zinc-500">{result?.total ?? 0} placements</span>
    </div>
    {query.isLoading && <div className="p-10 text-center text-sm text-zinc-500">Loading placements…</div>}
    {query.isError && <div className="p-10 text-center text-sm text-red-400">Placements could not be loaded.</div>}
    {!query.isLoading && !query.isError && placements.length === 0 && <div className="p-10 text-center text-sm text-zinc-500">No placements match these filters.</div>}
    {placements.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-xs"><thead className="sticky top-0 bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500"><tr><th className="px-4 py-3">Creative</th><th className="px-4 py-3">Sponsor</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Placement</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Impr. (30d)</th><th className="px-4 py-3">Clicks</th><th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-zinc-800">{placements.map(placement => { const image = placement.bannerUrl || placement.logoUrl || placement.sponsorLogoUrl; const ctr = placement.totalImpressions > 0 ? ((placement.totalClicks / placement.totalImpressions) * 100).toFixed(1) : null; return <tr key={placement.id} className="text-zinc-300 hover:bg-white/[0.02]"><td className="px-4 py-2">{image ? <img src={image} alt="" className="h-9 w-16 rounded border border-zinc-800 object-contain" /> : <span className="text-zinc-600">No creative</span>}</td><td className="px-4 py-2 font-medium text-white">{placement.sponsorName}</td><td className="px-4 py-2">{placement.tournamentName || 'Global'}</td><td className="px-4 py-2">{ZONE_META[placement.placementZone]?.label || placement.placementZone} · {placement.slotNumber ? `Slot ${placement.slotNumber}` : 'Review'}</td><td className="px-4 py-2"><span className="rounded bg-zinc-800 px-2 py-1 font-mono uppercase">{placement.lifecycle}</span>{placement.reviewReason && <div className="mt-1 text-[10px] text-amber-400">{placement.reviewReason.replace('_', ' ')}</div>}</td><td className="px-4 py-2 tabular-nums">{placement.totalImpressions > 0 ? <span className="text-white">{fmt(placement.totalImpressions)}{ctr && <span className="ml-1 text-zinc-500 text-[10px]">{ctr}%</span>}</span> : <span className="text-zinc-600">—</span>}</td><td className="px-4 py-2 tabular-nums">{placement.totalClicks > 0 ? <span className="text-white">{fmt(placement.totalClicks)}</span> : <span className="text-zinc-600">—</span>}</td><td className="px-4 py-2 text-zinc-500">{placement.startsAt ? new Date(placement.startsAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Now'} → {placement.endsAt ? new Date(placement.endsAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Open'}</td><td className="px-4 py-2 text-zinc-500">{new Date(placement.updatedAt).toLocaleDateString()}</td><td className="px-4 py-2"><div className="flex justify-end gap-1">{onReplace && <button onClick={() => onReplace(placement)} className="rounded p-2 hover:bg-zinc-800" aria-label={placement.bannerUrl || placement.logoUrl ? "Replace creative" : "Upload creative"}><RefreshCw className="h-3.5 w-3.5" /></button>}{(placement.bannerUrl || placement.logoUrl) && onRemove && <button onClick={() => onRemove(placement)} className="rounded p-2 hover:bg-zinc-800" aria-label="Remove creative"><ImageMinus className="h-3.5 w-3.5" /></button>}<button onClick={() => onEdit(placement)} className="rounded p-2 hover:bg-zinc-800" aria-label="Edit placement"><Pencil className="h-3.5 w-3.5" /></button>{onUnassign && <button onClick={() => onUnassign(placement)} className="rounded p-2 text-amber-400 hover:bg-amber-950/40" aria-label="Unassign placement"><UserX className="h-3.5 w-3.5" /></button>}<button onClick={() => onDelete(placement.id)} className="rounded p-2 text-red-400 hover:bg-red-950/40" aria-label="Delete placement"><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>; })}</tbody></table></div>}
    <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="rounded border border-zinc-700 px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page >= totalPages} onClick={() => setPage(value => value + 1)} className="rounded border border-zinc-700 px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
  </div>;
}
