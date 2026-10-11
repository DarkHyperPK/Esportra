import { StatusPill } from '@/components/ui/kit';
import { PUBLIC_VETO_GAMES } from '@/pages/tools/publicMapVetoUtils';
import type { PublicVetoSession } from '@/types/publicVetoSessions';
import { formatVetoTimestamp, vetoStatus } from './publicVetoSessionRules';

export function PublicVetoSessionsTable({ sessions }: { sessions: PublicVetoSession[] }) {
  return (
    <div className="min-w-0">
      <p id="veto-table-scroll-hint" className="mb-2 text-xs text-zinc-400 lg:hidden">Scroll horizontally to see every column.</p>
      <div role="region" aria-label="Map veto sessions table" aria-describedby="veto-table-scroll-hint" tabIndex={0}
        className="min-w-0 overflow-x-auto border border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40" data-lenis-prevent>
        <table className="w-full min-w-[1000px] table-fixed text-left text-[13px] text-zinc-300">
          <caption className="sr-only">Public map veto sessions, newest first</caption>
          <colgroup><col className="w-[150px]" /><col className="w-[180px]" /><col className="w-[180px]" /><col className="w-[80px]" /><col className="w-[170px]" /><col className="w-[150px]" /><col className="w-[160px]" /></colgroup>
          <thead className="bg-white/[0.04] text-xs text-zinc-400"><tr>
            {['Game', 'Team 1', 'Team 2', 'Best Of', 'Status', 'Created', 'Overlay Used'].map((heading) => <th key={heading} scope="col" className="px-3 py-3 font-medium">{heading}</th>)}
          </tr></thead>
          <tbody>{sessions.map((session) => {
            const status = vetoStatus(session.status);
            const created = formatVetoTimestamp(session.createdAt);
            const overlay = formatVetoTimestamp(session.overlayAccessedAt);
            return <tr key={session.id} className="border-t border-white/[0.07] [@media(hover:hover)]:hover:bg-white/[0.03]">
              <td className="px-3 py-3">{PUBLIC_VETO_GAMES.find((game) => game.value === session.game)?.label ?? session.game}</td>
              <td className="break-words px-3 py-3 font-medium text-white">{session.team1Name?.trim() || 'Unnamed team'}</td>
              <td className="break-words px-3 py-3 font-medium text-white">{session.team2Name?.trim() || 'Unnamed team'}</td>
              <td className="px-3 py-3 tabular-nums"><abbr title={`Best of ${session.bestOf}`} className="no-underline">BO{session.bestOf}</abbr></td>
              <td className="px-3 py-3"><StatusPill {...status} /></td>
              <td className="px-3 py-3">{created ? <time dateTime={created.iso} className="block whitespace-nowrap font-mono text-xs tabular-nums">{created.date}<br />{created.time} {created.zone}</time> : 'Unavailable'}</td>
              <td className="px-3 py-3">{overlay ? <><span className="text-emerald-300">Yes</span><time dateTime={overlay.iso} className="mt-1 block whitespace-nowrap font-mono text-xs tabular-nums">{overlay.date}<br />{overlay.time} {overlay.zone}</time></> : 'No'}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
