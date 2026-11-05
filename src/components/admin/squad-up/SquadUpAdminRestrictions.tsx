import { useState } from 'react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InlineNotice } from '@/components/ui/kit';
import { useLiftSquadUpRestriction, useSquadUpAdminRestrictions } from '@/hooks/competitive/useSquadUpAdmin';
import { reasonLabel } from '@/schemas/squadUpReport';
import type { AdminRestriction } from '@/schemas/squadUpAdmin';

export function SquadUpAdminRestrictions({ canManage }: { canManage: boolean }) {
  const restrictions = useSquadUpAdminRestrictions();
  const lift = useLiftSquadUpRestriction();
  const [target, setTarget] = useState<AdminRestriction | null>(null);
  const rows = restrictions.data ?? [];
  return (
    <section aria-label="Active restrictions" className="space-y-3">
      {restrictions.isError && <InlineNotice tone="critical" title="Restrictions could not load">Try again in a moment.</InlineNotice>}
      {lift.isError && <InlineNotice tone="critical" title="Could not lift the restriction">{lift.error.message}</InlineNotice>}
      {rows.length === 0 ? <p className="text-sm text-zinc-400">No one is restricted from Squad Up.</p> : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-400"><tr><th scope="col">Player</th><th scope="col">Reason</th><th scope="col">Until</th><th scope="col">By</th>{canManage && <th scope="col"><span className="sr-only">Actions</span></th>}</tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id} className="border-t border-white/[0.06]">
              <td className="py-1.5">{row.username ?? row.userId.slice(0, 8)}</td><td>{reasonLabel(row.reasonCategory)}</td>
              <td>{row.until ? format(new Date(row.until), 'PPp') : 'Permanent'}</td><td>{row.createdByUsername ?? '—'}</td>
              {canManage && <td><button type="button" className="text-rose-400 hover:text-rose-300" disabled={lift.isPending} onClick={() => setTarget(row)}>Lift</button></td>}
            </tr>
          ))}</tbody>
        </table>
      )}
      <AlertDialog open={!!target} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lift this restriction?</AlertDialogTitle>
            <AlertDialogDescription>{target?.username ?? 'This player'} will be able to use Squad Up again right away. This is recorded in the audit log.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (target) lift.mutate(target.id); setTarget(null); }}>Lift restriction</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
