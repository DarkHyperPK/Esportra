import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { StatTile } from '@/components/competitive/scrims/data/StatTile';
import { useScrimPlayerReport, useScrimTeamReport } from '@/hooks/competitive/useScrimReports';
import { cn } from '@/lib/utils';
import { resolveAgent } from '@/lib/valorantAgents';
import { formatNumber, formatPct, gameDate, isSmallSample } from '@/services/scrimData/format';
import type { PlayerReportBody } from '@/types/scrimReport';
import { BarList, type BarItem } from './BarList';
import { ChartCard } from './ChartCard';
import { CHART } from './chartTheme';
import { HighlightCards } from './HighlightCards';
import TrendChart from './TrendChart';

function HitBar({ hits }: { hits: PlayerReportBody['hits'] }) {
  const parts = [{ k: 'Head', v: hits.headPct, c: CHART.you }, { k: 'Body', v: hits.bodyPct, c: CHART.third }, { k: 'Legs', v: hits.legPct, c: CHART.them }];
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-none-none" aria-hidden>
        {parts.map((p) => p.v ? <div key={p.k} style={{ width: `${p.v}%`, background: p.c }} /> : null)}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-zinc-300">
        {parts.map((p) => <li key={p.k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-none-none" style={{ background: p.c }} aria-hidden />{p.k} {formatPct(p.v)}</li>)}
      </ul>
    </div>
  );
}

function View({ r }: { r: PlayerReportBody }) {
  const s = r.summary;
  const trend = r.series.map((p) => ({ label: `${p.index}. ${p.map ?? 'Map'}`, acs: p.acs, adr: p.adr }));
  const maps: BarItem[] = r.byMap.filter((m) => m.acs != null).map((m) => ({ label: m.key, value: m.acs, valueText: `${formatNumber(m.acs, 0)} ACS`, sub: `${m.wins}–${m.maps - m.wins} · K/D ${formatNumber(m.kd)}` }));
  const agents: BarItem[] = r.byAgent.map((a) => ({ label: resolveAgent(a.key)?.displayName ?? 'Unknown agent', value: a.maps, valueText: `${a.maps} ${a.maps === 1 ? 'map' : 'maps'}`, sub: `${formatNumber(a.acs, 0)} ACS`, icon: resolveAgent(a.key)?.iconUrl }));
  const c = r.comparison;
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-zinc-400">
        Based on {s.maps} verified {s.maps === 1 ? 'map' : 'maps'}, {s.rounds} rounds{isSmallSample(s.maps) ? ' · small sample' : ''}.
        {c.acsVsTeam != null ? ` ACS is ${Math.abs(c.acsVsTeam)} ${c.acsVsTeam >= 0 ? 'above' : 'below'} the team average (${formatNumber(c.teamAcs, 0)}).` : ''}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Opening duels" value={r.coach?.entryDuels ? `${r.coach.entryWins} of ${r.coach.entryDuels}` : '—'} hint="Won, of the first fights of rounds they were in" />
        <StatTile label="Untraded openers" value={r.coach ? String(r.coach.untradedFirstDeaths) : '—'} hint="First deaths no teammate avenged" />
        <StatTile label="Deaths traded" value={r.coach?.deaths ? `${r.coach.traded} of ${r.coach.deaths}` : '—'} hint="Killer killed within 5 s by a teammate" />
        <StatTile label="Clutches" value={r.coach?.clutchAttempts ? `${r.coach.clutchWins} of ${r.coach.clutchAttempts}` : '—'} hint="Last alive against one or more enemies" />
        <StatTile label="KAST" value={formatPct(s.kast)} hint="rounds with a kill, assist, survival or trade" />
        <StatTile label="ACS · ADR" value={`${formatNumber(s.acs, 0)} · ${formatNumber(s.adr, 0)}`} hint={s.acsSd != null ? `ACS varies by about ${s.acsSd} per map` : 'combat score · damage per round'} />
      </div>
      <HighlightCards highlights={r.highlights} />
      <div className="grid gap-4 lg:grid-cols-2">
        {trend.length >= 3 && (
          <ChartCard title="ACS and ADR by map" note="Oldest map first." summary={`ACS and ADR over ${trend.length} maps.`} table={{ columns: ['Map', 'ACS', 'ADR'], rows: trend.map((t) => [t.label, t.acs, t.adr]) }}>
            <TrendChart data={trend} lines={[{ key: 'acs', name: 'ACS', color: CHART.you }, { key: 'adr', name: 'ADR', color: CHART.third }]} />
            <p className="mt-1 flex gap-4 text-[11px] text-zinc-400"><span><span className="mr-1 inline-block h-2 w-2 rounded-none-none" style={{ background: CHART.you }} />ACS</span><span><span className="mr-1 inline-block h-2 w-2 rounded-none-none" style={{ background: CHART.third }} />ADR</span></p>
          </ChartCard>
        )}
        {maps.length > 0 && <ChartCard title="By map" note="ACS on each map, with the record and K/D." summary="ACS by map." table={{ columns: ['Map', 'ACS'], rows: maps.map((m) => [m.label, m.valueText]) }}><BarList items={maps} max={Math.max(300, ...maps.map((m) => m.value ?? 0))} /></ChartCard>}
        {agents.length > 0 && <ChartCard title="Agents played" summary="Maps played on each agent." table={{ columns: ['Agent', 'Maps'], rows: agents.map((a) => [a.label, a.valueText]) }}><BarList items={agents} max={Math.max(...agents.map((a) => a.value ?? 0), 1)} /></ChartCard>}
        <ChartCard title="Where shots land" note="Head, body and legs as a share of every located hit." summary={`Head ${formatPct(r.hits.headPct)}, body ${formatPct(r.hits.bodyPct)}, legs ${formatPct(r.hits.legPct)}.`} table={{ columns: ['Part', 'Share'], rows: [['Head', r.hits.headPct], ['Body', r.hits.bodyPct], ['Legs', r.hits.legPct]] }}><HitBar hits={r.hits} /></ChartCard>
        <ChartCard title="Multi-kills and objective" summary={`${s.multi2} double, ${s.multi3} triple, ${s.multi4} quadra, ${s.multi5} ace kills; ${s.plants} plants, ${s.defuses} defuses.`}>
          <dl className="grid grid-cols-3 gap-3 text-center">
            {[['2K', s.multi2], ['3K', s.multi3], ['4K', s.multi4], ['5K', s.multi5], ['Plants', s.plants], ['Defuses', s.defuses]].map(([k, v]) => (
              <div key={k as string}><dd className="font-heading text-xl font-bold tabular-nums text-white">{v}</dd><dt className="text-[11px] text-zinc-500">{k}</dt></div>
            ))}
          </dl>
        </ChartCard>
      </div>
    </div>
  );
}

/** One player's report, picked from the roster. Staff see everyone; a member sees only themselves (the API enforces it). Loads when opened. */
export default function PlayerReportsTab({ teamId }: { teamId: string }) {
  const [params, setParams] = useSearchParams();
  const team = useScrimTeamReport(teamId);
  const players = useMemo(() => team.data?.report.players ?? [], [team.data]);
  const wanted = params.get('player');
  const chosen = players.find((p) => p.userId === wanted) ?? players.find((p) => p.userId === team.data?.viewerUserId) ?? players[0];
  const report = useScrimPlayerReport(teamId, chosen?.userId);

  if (team.isLoading) return <PanelSkeleton />;
  if (team.isError || !team.data) return <PanelError onRetry={() => void team.refetch()} />;
  if (!team.data.hasData || players.length === 0) return <PanelMessage>No player has verified Riot maps yet. Player reports fill in once auto-fetched maps are confirmed.</PanelMessage>;
  return (
    <div className="space-y-4">
      {players.length > 1 && (
        <nav aria-label="Choose a player" className="flex flex-wrap gap-2">
          {players.map((p) => (
            <button key={p.userId} type="button" aria-pressed={p.userId === chosen?.userId}
              onClick={() => setParams((prev) => { const n = new URLSearchParams(prev); n.set('player', p.userId); return n; }, { replace: true })}
              className={cn('inline-flex h-9 items-center gap-2 rounded-none-none border px-3 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                p.userId === chosen?.userId ? 'border-white/40 text-white' : 'border-white/[0.14] text-white/60 hover:text-white')}>
              {resolveAgent(p.agents[0]?.agent)?.iconUrl && <img src={resolveAgent(p.agents[0]?.agent)!.iconUrl} alt="" className="h-5 w-5 rounded-none-none" loading="lazy" />}
              {p.name ?? 'Player'}
            </button>
          ))}
        </nav>
      )}
      {!team.data.staff && <p className="text-[12px] text-zinc-500">You can see your own report. Captains, managers and coaches can open every player’s.</p>}
      {report.isLoading ? <PanelSkeleton /> : report.isError || !report.data ? <PanelError onRetry={() => void report.refetch()} /> : !report.data.report ? <PanelMessage>{report.data.reason ?? 'No report for this player yet.'}</PanelMessage> : (
        <>
          <h2 className="font-heading text-[18px] font-bold text-white">{chosen?.name ?? 'Player'}{report.data.report.sample.from ? <span className="ml-2 text-[12px] font-normal text-zinc-500">since {gameDate(report.data.report.sample.from)}</span> : null}</h2>
          <View r={report.data.report} />
        </>
      )}
    </div>
  );
}
