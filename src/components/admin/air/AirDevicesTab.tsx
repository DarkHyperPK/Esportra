import { useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { useAirList, useAirRevokeDevice, type AirDevice } from '@/hooks/useAirAdmin';
import { AirListState } from './AirListState';
import { AirPager } from './AirPager';
import { AirReasonDialog } from './AirReasonDialog';
import { AirTable } from './AirTable';
import { ago } from './airFormat';

const ONLINE_MS = 90_000;

export function AirDevicesTab() {
  const [page, setPage] = useState(1);
  const list = useAirList<AirDevice>('devices', page);
  const revoke = useAirRevokeDevice();
  const [revoking, setRevoking] = useState<AirDevice | null>(null);
  const items = list.data?.items ?? [];

  return (
    <>
      <AirListState loading={list.isLoading} error={list.error} empty={items.length === 0} emptyText="No PC has signed in to Air yet." />
      {items.length > 0 ? (
        <AirTable head={['PC', 'Kind', 'Owner', 'Status', 'Last seen', '']}>
          {items.map((d) => {
            const online = d.status === 'active' && Date.now() - new Date(d.lastSeenAt).getTime() < ONLINE_MS;
            return (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                <td className="px-4 py-3 text-zinc-300">{d.mode === 'production' ? 'Production' : 'Capture'}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-zinc-500" title={d.userId}>{d.userId.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <span className={online ? 'text-emerald-300' : d.status === 'active' ? 'text-zinc-300' : 'text-zinc-500'}>
                    {d.status === 'active' ? (online ? 'Online' : 'Offline') : 'Revoked'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{ago(d.lastSeenAt)}</td>
                <td className="px-4 py-3 text-right">
                  {d.status === 'active' ? <CommandButton variant="ghost" size="sm" onClick={() => setRevoking(d)}>Revoke</CommandButton> : null}
                </td>
              </tr>
            );
          })}
        </AirTable>
      ) : null}
      <AirPager page={page} hasMore={!!list.data?.hasMore} onPage={setPage} />
      <AirReasonDialog
        open={!!revoking}
        title={`Revoke ${revoking?.name ?? 'this PC'}?`}
        description="Air on that PC stops working with Esportra and frees its place in the plan's PC limit."
        confirm="Revoke"
        onConfirm={(reason) => revoke.mutateAsync({ deviceId: revoking!.id, reason })}
        onClose={() => setRevoking(null)}
      />
    </>
  );
}
