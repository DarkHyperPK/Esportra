import { useState } from 'react';
import { useAirList, type AirActivity } from '@/hooks/useAirAdmin';
import { AirListState } from './AirListState';
import { AirPager } from './AirPager';
import { AirTable } from './AirTable';
import { ACTION_LABELS, ago } from './airFormat';

export function AirActivityTab() {
  const [page, setPage] = useState(1);
  const list = useAirList<AirActivity>('activity', page);
  const items = list.data?.items ?? [];

  return (
    <>
      <AirListState loading={list.isLoading} error={list.error} empty={items.length === 0} emptyText="No Air admin changes yet." />
      {items.length > 0 ? (
        <AirTable head={['When', 'What', 'Reason', 'By', 'Subject']}>
          {items.map((a) => (
            <tr key={a.id}>
              <td className="whitespace-nowrap px-4 py-3 text-zinc-400" title={new Date(a.createdAt).toLocaleString()}>{ago(a.createdAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-white">{ACTION_LABELS[a.action] ?? a.action}</td>
              <td className="max-w-[360px] px-4 py-3 text-xs text-zinc-400">{a.reason}</td>
              <td className="px-4 py-3 font-mono text-[11px] text-zinc-500" title={a.actorId}>{a.actorId.slice(0, 8)}</td>
              <td className="px-4 py-3 font-mono text-[11px] text-zinc-500" title={a.subjectId}>{a.subjectId.slice(0, 8)}</td>
            </tr>
          ))}
        </AirTable>
      ) : null}
      <AirPager page={page} hasMore={!!list.data?.hasMore} onPage={setPage} />
    </>
  );
}
