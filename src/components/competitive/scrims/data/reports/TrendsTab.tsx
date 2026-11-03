import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { useScrimTrends } from '@/hooks/competitive/useScrimReports';
import { cn } from '@/lib/utils';
import { gameDate, isSmallSample, NO_VALUE } from '@/services/scrimData/format';
import type { ScrimTrends } from '@/schemas/scrimTrends';
import { ChartCard } from './ChartCard';
import { CHART } from './chartTheme';
import TrendChart from './TrendChart';

type Window = ScrimTrends['trends']['windows'][number];

const VERDICT = { up: { word: 'Up', cls: 'text-[#34d399]' }, down: { word: 'Down', cls: 'text-[#f87171]' }, flat: { word: 'No clear change', cls: 'text-zinc-400' } } as const;

const num = (n: number | null) => (n == null ? NO_VALUE : String(n));

function Comparison({ w }: { w: Window }) {
  return (
    <section aria-label={w.label} className="border border-white/[0.06] bg-[#111114] p-4">
      <h3 className={EYEBROW_CLASS}>{w.label}</h3>
      {!w.enough ? (
        <p className="mt-2 text-[12px] leading-relaxed text-zinc-500">Not enough maps in both periods yet ({w.currentMaps} and {w.previousMaps}).</p>
      ) : (
        <>
          <p className="mt-2 text-[12px] text-zinc-500">{w.currentMaps} maps against {w.previousMaps}. A change inside the usual swing is called “no clear change”.</p>
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {w.metrics.map((m) => {
              const v = VERDICT[m.verdict];
              return (
                <li key={m.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2 text-[13px]">
                  <span className="text-zinc-200">{m.label}</span>
                  <span className="text-right tabular-nums text-zinc-400">{num(m.previous)} → <span className="font-bold text-white">{num(m.current)}</span></span>
                  <span className={cn('col-span-2 text-[11px] font-black uppercase tracking-wide', v.cls)}>{v.word}{m.change != null && m.verdict !== 'flat' ? ` · ${m.change > 0 ? '+' : ''}${m.change}` : ''}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function Charts({ t }: { t: ScrimTrends['trends'] }) {
  const data = t.series.map((p) => ({ label: `${p.index}. ${p.map ?? 'Map'}`, round_win: p.roundWinPct, rolling_round_win: p.rollingRoundWinPct, acs: p.teamAcs, rolling_acs: p.rollingAcs, first_kill: p.firstKillPct, traded: p.tradedPct }));
  if (data.length < 3) return null;
  const key = (a: string, b: string, ca: string, cb: string) => (
    <p className="mt-1 flex gap-4 text-[11px] text-zinc-400"><span><span className="mr-1 inline-block h-2 w-2" style={{ background: ca }} />{a}</span><span><span className="mr-1 inline-block h-2 w-2" style={{ background: cb }} />{b}</span></p>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Round win rate" note="Each map, and the average of the last five maps once there are three." summary={`Round win rate over ${data.length} maps.`} table={{ columns: ['Map', 'Round win %', 'Last-5 average'], rows: data.map((d) => [d.label, d.round_win, d.rolling_round_win]) }}>
        <TrendChart data={data} lines={[{ key: 'round_win', name: 'Round win %', color: CHART.you }, { key: 'rolling_round_win', name: 'Last-5 average', color: CHART.third }]} domain={[0, 100]} reference={50} unit="%" />
        {key('Each map', 'Last-5 average', CHART.you, CHART.third)}
      </ChartCard>
      <ChartCard title="Team ACS" note="Your five players combined, weighted by rounds." summary={`Team ACS over ${data.length} maps.`} table={{ columns: ['Map', 'ACS', 'Last-5 average'], rows: data.map((d) => [d.label, d.acs, d.rolling_acs]) }}>
        <TrendChart data={data} lines={[{ key: 'acs', name: 'ACS', color: CHART.you }, { key: 'rolling_acs', name: 'Last-5 average', color: CHART.third }]} />
        {key('Each map', 'Last-5 average', CHART.you, CHART.third)}
      </ChartCard>
      <ChartCard title="Opening and trading" note="Rounds you got the first kill, and deaths a teammate avenged within 5 seconds." summary="First-kill rounds and traded deaths over the maps." table={{ columns: ['Map', 'First kill %', 'Traded %'], rows: data.map((d) => [d.label, d.first_kill, d.traded]) }}>
        <TrendChart data={data} lines={[{ key: 'first_kill', name: 'Rounds you got the first kill %', color: CHART.you }, { key: 'traded', name: 'Deaths avenged %', color: CHART.them }]} domain={[0, 100]} reference={50} unit="%" />
        {key('First kill rounds', 'Deaths avenged', CHART.you, CHART.them)}
      </ChartCard>
    </div>
  );
}

/** How the team is moving: the latest maps against the ones before, and the series behind it. Loads when opened. */
export default function TrendsTab({ teamId }: { teamId: string }) {
  const { isLoading, isError, data, refetch } = useScrimTrends(teamId);
  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;
  if (!data.hasData) return <PanelMessage>No verified Riot maps yet. Trends appear once auto-fetched maps are confirmed.</PanelMessage>;
  const t = data.trends;
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-zinc-400">
        Based on the last {t.sample.maps} verified {t.sample.maps === 1 ? 'map' : 'maps'}{t.sample.from && t.sample.to ? ` · ${gameDate(t.sample.from)} – ${gameDate(t.sample.to)}` : ''}
        {isSmallSample(t.sample.maps) ? ' · small sample' : ''}{t.sample.capped ? ` · older maps beyond the latest ${data.maxMaps} are not included` : ''}.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">{t.windows.map((w) => <Comparison key={w.label} w={w} />)}</div>
      <Charts t={t} />
    </div>
  );
}
