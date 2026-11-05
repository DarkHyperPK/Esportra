import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { InlineNotice } from '@/components/ui/kit';
import { useSquadUpAdminReports } from '@/hooks/competitive/useSquadUpAdmin';
import { reasonLabel } from '@/schemas/squadUpReport';
import { SquadUpReportSheet } from './SquadUpReportSheet';

const FILTERS = ['open', 'resolved', 'all'] as const;
const PAGE = 25;

export function SquadUpAdminReports({ canManage, canSuspend }: { canManage: boolean; canSuspend: boolean }) {
  const [status, setStatus] = useState<(typeof FILTERS)[number]>('open');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const reports = useSquadUpAdminReports(status, offset);
  const items = reports.data?.items ?? [];
  const total = reports.data?.total ?? 0;

  return (
    <section aria-label="Player reports" className="space-y-3">
      <div className="flex gap-1" role="group" aria-label="Report status">
        {FILTERS.map((filter) => (
          <button key={filter} type="button" aria-pressed={status === filter} onClick={() => { setStatus(filter); setOffset(0); }}
            className={`px-3 py-1.5 text-xs capitalize ${status === filter ? 'bg-white text-black' : 'border border-white/[0.12] text-zinc-300'}`}>{filter}</button>
        ))}
      </div>
      {reports.isError && <InlineNotice tone="critical" title="Reports could not load">Try again in a moment.</InlineNotice>}
      {reports.isLoading ? <p className="text-sm text-zinc-400" role="status">Loading reports…</p>
        : items.length === 0 ? <p className="text-sm text-zinc-400">{status === 'open' ? 'No open reports. Nothing needs review.' : 'No reports here.'}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-400"><tr>
                <th scope="col">Reported player</th><th scope="col">Reason</th><th scope="col">Reporter</th><th scope="col">Proof</th>
                <th scope="col">Prior actions</th><th scope="col">Sent</th><th scope="col">Status</th></tr></thead>
              <tbody>{items.map((row) => (
                <tr key={row.id} className="border-t border-white/[0.06]">
                  <td className="py-1.5"><button type="button" className="text-left text-rose-400 hover:underline" onClick={() => setSelected(row.id)}>{row.reportedUsername ?? row.reportedId.slice(0, 8)}</button></td>
                  <td>{reasonLabel(row.reason)}</td><td>{row.reporterUsername ?? '—'}</td><td>{row.evidenceCount ?? 0}</td>
                  <td>{row.priorActions ?? 0}</td><td>{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}</td>
                  <td>{row.status === 'open' ? 'Open' : row.resolution}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      {total > PAGE && (
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <button type="button" className="lfg-button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
          <span>{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
          <button type="button" className="lfg-button" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</button>
        </div>
      )}
      <SquadUpReportSheet reportId={selected} canManage={canManage} canSuspend={canSuspend} onClose={() => setSelected(null)} />
    </section>
  );
}
