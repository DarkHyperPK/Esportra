import { useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { useAirDecline, useAirList, type AirRequest } from '@/hooks/useAirAdmin';
import type { AirGrantTarget } from './AirGrantSheet';
import { AirListState } from './AirListState';
import { AirPager } from './AirPager';
import { AirReasonDialog } from './AirReasonDialog';
import { AirTable } from './AirTable';
import { AirWho } from './AirWho';
import { accessLine, ago } from './airFormat';

const DONE: Record<AirRequest['status'], string> = { pending: '', granted: 'Granted', declined: 'Declined', withdrawn: 'Withdrawn' };

export function AirRequestsTab({ onGrant }: { onGrant: (target: AirGrantTarget) => void }) {
  const [page, setPage] = useState(1);
  const list = useAirList<AirRequest>('requests', page);
  const decline = useAirDecline();
  const [declining, setDeclining] = useState<AirRequest | null>(null);
  const items = list.data?.items ?? [];

  return (
    <>
      <AirListState loading={list.isLoading} error={list.error} empty={items.length === 0} emptyText="No one is waiting for Air access." />
      {items.length > 0 ? (
        <AirTable head={['Who', 'Note', 'Asked', 'Access now', '']}>
          {items.map((r) => (
            <tr key={r.id} className={r.status === 'pending' ? '' : 'opacity-60'}>
              <td className="px-4 py-3"><AirWho email={r.email} name={r.name} fallback={r.userId} /></td>
              <td className="max-w-[320px] px-4 py-3 text-xs text-zinc-400">
                {r.note || '—'}
                {r.status === 'declined' && r.reason ? <div className="mt-1 text-rose-300/80">Declined: {r.reason}</div> : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-zinc-300">{ago(r.createdAt)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-400">{accessLine(r.accountStatus, r.validUntil, r.trialEndsAt)}</td>
              <td className="px-4 py-3">
                {r.status === 'pending' ? (
                  <div className="flex justify-end gap-2">
                    <CommandButton variant="ghost" size="sm" onClick={() => setDeclining(r)}>Decline</CommandButton>
                    <CommandButton
                      size="sm"
                      onClick={() => onGrant({ userId: r.userId, email: r.email, name: r.name, status: r.accountStatus, validUntil: r.validUntil, trialEndsAt: r.trialEndsAt })}
                    >
                      Grant
                    </CommandButton>
                  </div>
                ) : (
                  <span className="block text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">{DONE[r.status]}</span>
                )}
              </td>
            </tr>
          ))}
        </AirTable>
      ) : null}
      <AirPager page={page} hasMore={!!list.data?.hasMore} onPage={setPage} />
      <AirReasonDialog
        open={!!declining}
        title={`Decline ${declining?.email ?? 'this request'}?`}
        description="The person sees this reason in Air and can ask again after 24 hours."
        confirm="Decline"
        onConfirm={(reason) => decline.mutateAsync({ requestId: declining!.id, reason })}
        onClose={() => setDeclining(null)}
      />
    </>
  );
}
