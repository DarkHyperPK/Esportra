import { useEffect, useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { useAirList, type AirCustomer } from '@/hooks/useAirAdmin';
import { AirGiveByEmail } from './AirGiveByEmail';
import type { AirGrantTarget } from './AirGrantSheet';
import { AirListState } from './AirListState';
import { AirPager } from './AirPager';
import { AirTable } from './AirTable';
import { AirWho } from './AirWho';
import { accessLine, ago, fieldClass, limitText } from './airFormat';

function targetOf(c: AirCustomer): AirGrantTarget {
  return {
    userId: c.userId, email: c.email, name: c.name, status: c.status, planId: c.planId, validUntil: c.validUntil,
    trialEndsAt: c.trialEndsAt, overrideDeviceLimits: c.overrideDeviceLimits, productionLimit: c.productionLimit, captureLimit: c.captureLimit,
  };
}

export function AirCustomersTab({ onGrant }: { onGrant: (target: AirGrantTarget) => void }) {
  const [page, setPage] = useState(1);
  const [typed, setTyped] = useState('');
  const [search, setSearch] = useState('');
  const list = useAirList<AirCustomer>('customers', page, search);
  const items = list.data?.items ?? [];

  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(typed); setPage(1); }, 300);
    return () => window.clearTimeout(t);
  }, [typed]);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-2">
        <input className={fieldClass} type="search" placeholder="Search by email or name" maxLength={120} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Search customers" />
        <AirGiveByEmail onGrant={onGrant} />
      </div>
      <AirListState loading={list.isLoading} error={list.error} empty={items.length === 0} emptyText={search ? 'No one matches that search.' : 'No one has opened Air yet.'} />
      {items.length > 0 ? (
        <AirTable head={['Who', 'Plan', 'Access', 'Production PCs', 'Last seen', '']}>
          {items.map((c) => {
            const limit = c.overrideDeviceLimits ? c.productionLimit : null;
            return (
              <tr key={c.userId}>
                <td className="px-4 py-3"><AirWho email={c.email} name={c.name} fallback={c.userId} /></td>
                <td className="px-4 py-3 text-zinc-300">{c.plan}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-400">{accessLine(c.status, c.validUntil, c.trialEndsAt)}</td>
                <td className="px-4 py-3 text-zinc-300">{c.productionDevices}{c.overrideDeviceLimits ? ` of ${limitText(limit)}` : ''}</td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{ago(c.lastSeenAt)}</td>
                <td className="px-4 py-3 text-right"><CommandButton size="sm" variant="secondary" onClick={() => onGrant(targetOf(c))}>Change</CommandButton></td>
              </tr>
            );
          })}
        </AirTable>
      ) : null}
      <AirPager page={page} hasMore={!!list.data?.hasMore} onPage={setPage} />
    </div>
  );
}
