import { useSearchParams } from 'react-router-dom';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { StatTile } from '@/components/competitive/scrims/data/StatTile';
import { MapPicksView } from '@/components/competitive/scrims/data/tabs/MapPicksView';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { useScrimOpponents } from '@/hooks/competitive/useScrimOpponents';
import { cn } from '@/lib/utils';
import { resolveAgent } from '@/lib/valorantAgents';
import { NO_VALUE, formatPct, gameDate, isSmallSample, scoreLine } from '@/services/scrimData/format';
import type { OpponentRow } from '@/schemas/scrimOpponents';
import { CHART } from './chartTheme';

function Meetings({ o }: { o: OpponentRow }) {
  const max = Math.max(1, ...o.meetings.map((m) => Math.abs((m.roundsWon ?? 0) - (m.roundsLost ?? 0))));
  return (
    <section aria-label="Meetings" className="border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>Meetings, newest first</h3>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">The bar is the round difference: right of the line you were ahead, left you were behind. Agents are what your team played.</p>
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {o.meetings.map((m) => {
          const diff = (m.roundsWon ?? 0) - (m.roundsLost ?? 0);
          return (
            <li key={`${m.sessionId}-${m.gameNumber}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4rem] items-center gap-3 py-2 text-[13px] sm:grid-cols-[5.5rem_8rem_minmax(0,1fr)_5rem_4rem]">
              <span className="text-[11px] text-zinc-500">{gameDate(m.playedAt)}</span>
              <span className="truncate text-white">{m.map ?? NO_VALUE}</span>
              <span className="hidden items-center gap-0.5 sm:flex">{m.agents.slice(0, 5).map((a, i) => { const ag = resolveAgent(a); return ag ? <img key={`${a}-${i}`} src={ag.iconUrl} alt={ag.displayName} title={ag.displayName} className="h-5 w-5" loading="lazy" /> : null; })}</span>
              <span className="relative hidden h-2 sm:block" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
                <span className="absolute inset-y-0" style={{ width: `${(Math.abs(diff) / max) * 50}%`, [diff >= 0 ? 'left' : 'right']: '50%', background: diff >= 0 ? CHART.you : CHART.them }} />
              </span>
              <span className="text-right tabular-nums text-zinc-200">{scoreLine(m.roundsWon, m.roundsLost)}</span>
              <span className={cn('text-right text-[11px] font-black uppercase', m.result === 'win' ? 'text-[#34d399]' : m.result === 'loss' ? 'text-[#f87171]' : 'text-zinc-400')}>{m.result}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Detail({ o }: { o: OpponentRow }) {
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-zinc-400">Based on {o.maps} {o.maps === 1 ? 'map' : 'maps'} against {o.name}{isSmallSample(o.maps) ? ' · small sample' : ''}. Team-level only: nothing about their players is shown.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Record" value={`${o.wins}–${o.losses}`} hint={`${formatPct(o.winRatePct)} of maps`} />
        <StatTile label="Rounds" value={formatPct(o.roundWinPct)} hint={`${o.roundsWon} won, ${o.roundsLost} lost`} />
        <StatTile label="First met" value={gameDate(o.firstPlayed)} hint="First map in the record" />
        <StatTile label="Last met" value={gameDate(o.lastPlayed)} hint="Most recent map" />
      </div>
      <Meetings o={o} />
      <section aria-label="Maps against them" className="border border-white/[0.06] bg-[#111114] p-4">
        <h3 className={EYEBROW_CLASS}>Maps against them</h3>
        <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {o.mapsPlayed.map((m) => <li key={m.map} className="flex justify-between border-b border-white/[0.06] py-1.5 text-[13px]"><span className="text-white">{m.map}</span><span className="tabular-nums text-zinc-300">{m.wins}–{m.games - m.wins}</span></li>)}
        </ul>
      </section>
      {o.veto.vetoes > 0 && <MapPicksView picks={o.veto} />}
    </div>
  );
}

/** Scrim partners as teams: the record against each, the meetings, the maps and the vetoes. Loads when opened. */
export default function OpponentsTab({ teamId }: { teamId: string }) {
  const [params, setParams] = useSearchParams();
  const { isLoading, isError, data, refetch } = useScrimOpponents(teamId);
  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;
  if (!data.hasData) return <PanelMessage>No confirmed scrim maps against a known opponent yet.</PanelMessage>;
  const chosen = data.opponents.find((o) => o.opponentId === params.get('opponent')) ?? data.opponents[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="Choose an opponent" className="border border-white/[0.06] bg-[#111114]">
        <ul className="divide-y divide-white/[0.06]">
          {data.opponents.map((o) => (
            <li key={o.opponentId}>
              <button type="button" aria-pressed={o.opponentId === chosen.opponentId}
                onClick={() => setParams((prev) => { const n = new URLSearchParams(prev); n.set('opponent', o.opponentId); return n; }, { replace: true })}
                className={cn('flex w-full items-baseline justify-between gap-3 border-l-2 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40',
                  o.opponentId === chosen.opponentId ? 'border-white bg-white/[0.04] text-white' : 'border-transparent text-zinc-400 hover:text-white')}>
                <span className="truncate text-[13px] font-semibold">{o.name}</span>
                <span className="shrink-0 text-[12px] tabular-nums">{o.wins}–{o.losses}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <Detail o={chosen} />
    </div>
  );
}
