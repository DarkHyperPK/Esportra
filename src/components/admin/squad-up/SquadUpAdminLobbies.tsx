import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { InlineNotice } from '@/components/ui/kit';
import { useCloseSquadUpLobbyAdmin, useSquadUpAdminLobbies } from '@/hooks/competitive/useSquadUpAdmin';
import type { AdminLobby } from '@/schemas/squadUpAdmin';

/** Open lobbies (and ones that filled in the last 6 hours). Managers can close a lobby; members are told it closed. */
export function SquadUpAdminLobbies({ canManage }: { canManage: boolean }) {
  const lobbies = useSquadUpAdminLobbies();
  const close = useCloseSquadUpLobbyAdmin();
  const [target, setTarget] = useState<AdminLobby | null>(null);
  const rows = lobbies.data ?? [];
  return (
    <section aria-label="Squad Up lobbies" className="space-y-3">
      {lobbies.isError && <InlineNotice tone="critical" title="Lobbies could not load">Try again in a moment.</InlineNotice>}
      {close.isError && <InlineNotice tone="critical" title="Could not close the lobby">{close.error.message}</InlineNotice>}
      {rows.length === 0 ? <p className="text-sm text-zinc-400">No open lobbies right now.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-400">
              <tr><th scope="col">Lobby</th><th scope="col">Host</th><th scope="col">Mode</th><th scope="col">Shard</th><th scope="col">Country</th>
                <th scope="col">Filled</th><th scope="col">Requests</th><th scope="col">Status</th><th scope="col">Opened</th>
                {canManage && <th scope="col"><span className="sr-only">Actions</span></th>}</tr>
            </thead>
            <tbody>{rows.map((row) => (
              <tr key={row.id} className="border-t border-white/[0.06]">
                <td className="py-1.5">{row.title || 'Untitled lobby'}</td>
                <td>{row.hostUsername ?? row.hostId.slice(0, 8)}</td>
                <td className="capitalize">{row.mode}</td><td className="uppercase">{row.region}</td><td>{row.countryCode ?? '—'}</td>
                <td className="tabular-nums">{row.acceptedCount} / {row.openSlots}</td><td className="tabular-nums">{row.pendingCount}</td>
                <td className="capitalize">{row.status}</td>
                <td>{formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}</td>
                {canManage && <td>{row.status !== 'closed' && (
                  <button type="button" className="text-rose-400 hover:text-rose-300" disabled={close.isPending} onClick={() => setTarget(row)}>Close</button>
                )}</td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <AlertDialog open={!!target} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this lobby?</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.hostUsername ?? 'The host'}&apos;s lobby will disappear from Squad Up and pending requests are dropped.
              The group chat stays. This action is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (target) close.mutate(target.id); setTarget(null); }}>Close lobby</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
