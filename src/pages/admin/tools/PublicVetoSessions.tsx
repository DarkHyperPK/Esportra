import { useRef } from 'react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAdminPublicVetoSessions } from '@/hooks/useAdminPublicVetoSessions';
import { CommandButton } from '@/components/management/CommandSurface';
import { Field, InlineNotice, CONTROL_CLASS } from '@/components/ui/kit';
import { PUBLIC_VETO_GAMES } from '@/pages/tools/publicMapVetoUtils';
import { PublicVetoUsageSummary } from './PublicVetoUsageSummary';
import { PublicVetoSessionsTable } from './PublicVetoSessionsTable';
import { vetoPageDescription } from './publicVetoSessionRules';

export default function PublicVetoSessions() {
  const { isSuperAdmin, loading } = useAdminAccess();
  const { query, game, page, setGame, setPage } = useAdminPublicVetoSessions(isSuperAdmin && !loading);
  const resultSummary = useRef<HTMLParagraphElement>(null);
  if (loading) return <p className="p-4 text-sm text-zinc-400" role="status">Loading admin access</p>;
  if (!isSuperAdmin) return <div className="p-4 md:p-6"><InlineNotice title="Super admin access required">Only super admins can view public map veto sessions.</InlineNotice></div>;
  const data = query.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / 50));
  const changePage = (next: number) => {
    setPage(next);
    // The initiating button becomes disabled during fetch: intentionally retain focus on the result summary.
    resultSummary.current?.focus();
  };
  return (
    <div className="min-w-0 w-full space-y-6 p-4 md:p-6">
      <header><h1 className="font-heading text-[22px] font-bold tracking-tight text-white sm:text-2xl">Map veto usage</h1><p className="mt-1 text-sm text-zinc-400">Anonymous sessions, newest first.</p></header>
      <Field label="Game" htmlFor="veto-session-game" className="w-full sm:w-64">
        <select id="veto-session-game" value={game} onChange={(event) => {
          const value = event.target.value;
          setGame(value === 'valorant' || value === 'cs2' || value === 'r6s' ? value : 'all');
        }} className={`${CONTROL_CLASS} w-full border px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40`}>
          <option value="all">All games</option>{PUBLIC_VETO_GAMES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Field>
      <section aria-label="Map veto session results" aria-busy={query.isFetching} className="min-w-0 space-y-6">
        {query.isError ? <InlineNotice tone="critical" action={<CommandButton variant="ghost" size="sm" onClick={() => { void query.refetch(); }} className="min-h-11 touch-manipulation">Try again</CommandButton>}>Couldn't load map veto sessions. Check your connection and try again.</InlineNotice> : data ? <>
          <PublicVetoUsageSummary summary={data.summary} />
          {data.sessions.length ? <PublicVetoSessionsTable sessions={data.sessions} /> : <div className="border border-white/10 bg-card p-6"><p className="text-sm text-zinc-300">No public map veto sessions found.</p>{game !== 'all' && <CommandButton variant="ghost" className="mt-4 touch-manipulation" onClick={() => setGame('all')}>Show all games</CommandButton>}</div>}
        </> : <div aria-hidden="true" className="space-y-6"><div className="h-36 border border-white/10 bg-card sm:h-24" /><div className="h-64 border border-white/10 bg-white/[0.02]" /></div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p ref={resultSummary} tabIndex={-1} role="status" className="text-sm text-zinc-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/40">
            {query.isFetching ? 'Loading map veto sessions' : data && !query.isError ? `${vetoPageDescription(page, 50, data.total)} · Page ${page} of ${pageCount}` : ''}
          </p>
          {data && !query.isError && <div className="flex gap-2"><CommandButton variant="ghost" disabled={query.isFetching || page <= 1} onClick={() => changePage(page - 1)} className="touch-manipulation">Previous</CommandButton><CommandButton variant="ghost" disabled={query.isFetching || page >= pageCount} onClick={() => changePage(page + 1)} className="touch-manipulation">Next</CommandButton></div>}
        </div>
      </section>
    </div>
  );
}
