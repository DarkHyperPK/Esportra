import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AdminSession } from '@/schemas/squadUpAdmin';

interface SquadUpAdminSessionsProps {
  sessions: AdminSession[];
  canManage: boolean;
  ending: boolean;
  onEnd: (userId: string) => void;
}

export function SquadUpAdminSessions({ sessions, canManage, ending, onEnd }: SquadUpAdminSessionsProps) {
  const [target, setTarget] = useState<AdminSession | null>(null);
  return (
    <section aria-label="Live sessions" className="rounded-xl border border-white/[0.08] p-4">
      <h2 className="mb-3 text-sm font-semibold text-white">Players in Squad Up now</h2>
      {sessions.length === 0 ? <p className="text-sm text-zinc-400">No active sessions.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-400">
              <tr><th scope="col">Player</th><th scope="col">Region</th><th scope="col">Tier</th><th scope="col">Mic</th><th scope="col">Needs</th>
                <th scope="col">Likes / passes</th><th scope="col">Started</th>{canManage && <th scope="col"><span className="sr-only">Actions</span></th>}</tr>
            </thead>
            <tbody>{sessions.map((row) => (
              <tr key={row.userId} className="border-t border-white/[0.06]">
                <td className="py-1.5">{row.username ?? row.userId.slice(0, 8)}</td>
                <td className="uppercase">{row.region}</td><td>{row.competitiveTier}</td>
                <td>{row.micOn ? 'On' : 'Off'}</td><td>{row.slotsNeeded}</td>
                <td>{row.likesSent} / {row.passesSent}</td>
                <td>{formatDistanceToNow(new Date(row.startedAt), { addSuffix: true })}</td>
                {canManage && <td><button type="button" className="text-rose-400 hover:text-rose-300" disabled={ending} onClick={() => setTarget(row)}>End session</button></td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <AlertDialog open={!!target} onOpenChange={(open) => { if (!open) setTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End this Squad Up session?</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.username ?? 'This player'} will be removed from Squad Up and lose their swipes for this session.
              They can start again. This action is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (target) onEnd(target.userId); setTarget(null); }}>End session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
