import { useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { useAirList, type AirPlan } from '@/hooks/useAirAdmin';
import { AirListState } from './AirListState';
import { AirPlanDialog } from './AirPlanDialog';
import { AirTable } from './AirTable';
import { limitText } from './airFormat';

export function AirPlansTab() {
  const list = useAirList<AirPlan>('plans');
  const [open, setOpen] = useState<AirPlan | 'new' | null>(null);
  const items = list.data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <CommandButton size="sm" variant="secondary" onClick={() => setOpen('new')}>New plan</CommandButton>
      </div>
      <AirListState loading={list.isLoading} error={list.error} empty={items.length === 0} emptyText="No Air plans yet." />
      {items.length > 0 ? (
        <AirTable head={['Plan', 'Production PCs', 'Capture PCs', 'Can be granted', '']}>
          {items.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium text-white">{p.name}</td>
              <td className="px-4 py-3 text-zinc-300">{limitText(p.productionLimit)}</td>
              <td className="px-4 py-3 text-zinc-300">{limitText(p.captureLimit)}</td>
              <td className="px-4 py-3 text-zinc-400">{p.enabled ? 'On' : 'Off'}</td>
              <td className="px-4 py-3 text-right"><CommandButton variant="ghost" size="sm" onClick={() => setOpen(p)}>Edit</CommandButton></td>
            </tr>
          ))}
        </AirTable>
      ) : null}
      <AirPlanDialog plan={open} onClose={() => setOpen(null)} />
    </div>
  );
}
