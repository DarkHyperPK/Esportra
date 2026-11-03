import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { StatTile } from '@/components/competitive/scrims/data/StatTile';
import { useScrimTeamReport } from '@/hooks/competitive/useScrimReports';
import { formatNumber, formatPct, gameDate, isSmallSample } from '@/services/scrimData/format';
import { fromTeam } from '@/services/scrimInsights/coach';
import { BUY_LABEL, BUY_MEANING, rateText } from '@/services/scrimInsights/present';
import type { Rate, TeamReportBody } from '@/types/scrimReport';
import { BarList, type BarItem } from './BarList';
import { ChartCard } from './ChartCard';
import { CHART } from './chartTheme';
import { CoachPanel } from './CoachPanel';
import { CoachPlayersTable } from './CoachPlayersTable';
import { HighlightCards } from './HighlightCards';
import TrendChart from './TrendChart';

const rate = (r: Rate): BarItem['value'] => r.pct;

function Sample({ r, max }: { r: TeamReportBody; max: number }) {
  const s = r.sample;
  return (
    <p className="text-[12px] text-zinc-400">
      Based on the last {s.maps} verified {s.maps === 1 ? 'map' : 'maps'}{s.from && s.to ? ` · ${gameDate(s.from)} – ${gameDate(s.to)}` : ''}
      {isSmallSample(s.maps) ? ' · small sample' : ''}{s.capped ? ` · older maps beyond the latest ${max} are not included` : ''}.
    </p>
  );
}

function Charts({ r }: { r: TeamReportBody }) {
  const label = (p: { index: number; map: string | null }) => `${p.index}. ${p.map ?? 'Map'}`;
  const trend = r.series.map((p) => ({ label: label(p), round_win: p.roundWinPct, acs: p.teamAcs, adr: p.teamAdr }));
  const mapItems: BarItem[] = r.maps.map((m) => ({ label: m.map, value: m.games ? (100 * m.wins) / m.games : null, valueText: `${m.wins}–${m.games - m.wins}`, sub: `${formatPct(m.roundWinPct)} of rounds` }));
  const sides: BarItem[] = [{ label: 'Attack', value: rate(r.attack), valueText: rateText(r.attack) }, { label: 'Defense', value: rate(r.defense), valueText: rateText(r.defense), color: CHART.third }];
  const opening: BarItem[] = [
    { label: 'Rounds you got the first kill', value: rate(r.firstBloodRounds), valueText: rateText(r.firstBloodRounds) },
    { label: 'Won after the first kill', value: rate(r.winAfterFirstBlood), valueText: rateText(r.winAfterFirstBlood) },
    { label: 'Won after losing the first duel', value: rate(r.winAfterFirstDeath), valueText: rateText(r.winAfterFirstDeath), color: CHART.them },
  ];
  const buys: BarItem[] = r.buys.map((b) => ({ label: BUY_LABEL[b.buy] ?? b.buy, value: rate(b.roundsWon), valueText: rateText(b.roundsWon) }));
  const players: BarItem[] = r.players.filter((p) => p.acs != null).map((p) => ({ label: p.name ?? 'Player', value: p.acs, valueText: `${formatNumber(p.acs, 0)} ACS`, sub: `${formatNumber(p.adr, 0)} ADR · ${p.maps} maps` }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {r.series.length >= 3 ? (
        <ChartCard title="Round win rate by map" note="Each point is one map, oldest first. The dashed line is 50%." summary={`Round win rate over ${r.series.length} maps, from ${trend[0].round_win}% to ${trend[trend.length - 1].round_win}%.`}
          table={{ columns: ['Map', 'Round win %'], rows: trend.map((t) => [t.label, t.round_win]) }}>
          <TrendChart data={trend} lines={[{ key: 'round_win', name: 'Round win %', color: CHART.you }]} domain={[0, 100]} reference={50} unit="%" />
        </ChartCard>
      ) : null}
      {r.series.length >= 3 ? (
        <ChartCard title="Team ACS and ADR by map" note="Your five players combined, weighted by rounds." summary={`Team ACS and ADR over ${r.series.length} maps.`}
          table={{ columns: ['Map', 'ACS', 'ADR'], rows: trend.map((t) => [t.label, t.acs, t.adr]) }}>
          <TrendChart data={trend} lines={[{ key: 'acs', name: 'ACS', color: CHART.you }, { key: 'adr', name: 'ADR', color: CHART.third }]} />
          <p className="mt-1 flex gap-4 text-[11px] text-zinc-400"><span><span className="mr-1 inline-block h-2 w-2 rounded-none-none" style={{ background: CHART.you }} />ACS</span><span><span className="mr-1 inline-block h-2 w-2 rounded-none-none" style={{ background: CHART.third }} />ADR</span></p>
        </ChartCard>
      ) : null}
      {mapItems.length > 0 && <ChartCard title="Results by map" note="Wins and losses on each map, with the share of rounds won." summary={`Results on ${mapItems.length} maps.`} table={{ columns: ['Map', 'Record'], rows: mapItems.map((m) => [m.label, m.valueText]) }}><BarList items={mapItems} reference={50} /></ChartCard>}
      <ChartCard title="Attack and defense" note="Rounds won on each side, over every map." summary={`Attack ${rateText(r.attack)}, defense ${rateText(r.defense)}.`} table={{ columns: ['Side', 'Rounds won'], rows: sides.map((s) => [s.label, s.valueText]) }}><BarList items={sides} reference={50} /></ChartCard>
      <ChartCard title="Opening duels" note="The first kill of a round, and how rounds went after it." summary="Opening duel results." table={{ columns: ['Measure', 'Result'], rows: opening.map((o) => [o.label, o.valueText]) }}><BarList items={opening} reference={50} /></ChartCard>
      {buys.length > 0 && <ChartCard title="Rounds won by buy" note={BUY_MEANING} summary="Rounds won at each buy level." table={{ columns: ['Buy', 'Rounds won'], rows: buys.map((b) => [b.label, b.valueText]) }}><BarList items={buys} reference={50} /></ChartCard>}
      {players.length > 0 && <ChartCard title="Players by ACS" note="Average combat score over the maps each player was in." summary="ACS by player." table={{ columns: ['Player', 'ACS'], rows: players.map((p) => [p.label, p.valueText]) }}><BarList items={players} max={Math.max(300, ...players.map((p) => p.value ?? 0))} /></ChartCard>}
    </div>
  );
}

/** The team report: what stands out, then the charts, over the team's recent verified scrim maps. Loads when opened. */
export default function TeamReportTab({ teamId }: { teamId: string }) {
  const { isLoading, isError, data, refetch } = useScrimTeamReport(teamId);
  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError onRetry={() => void refetch()} />;
  if (!data.hasData) return <PanelMessage>No verified Riot maps yet. The team report fills in once auto-fetched maps are confirmed.</PanelMessage>;
  const r = data.report;
  return (
    <div className="space-y-4">
      <Sample r={r} max={data.maxMaps} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Record" value={`${r.wins}–${r.losses}`} hint={`${formatPct(r.winRatePct)} of maps · ${formatPct(r.roundWinPct)} of rounds`} />
        <StatTile label="After the first kill" value={rateText(r.winAfterFirstBlood)} hint="Rounds won when you got the first kill" />
        <StatTile label="Deaths avenged" value={r.coach.trades.deaths ? `${r.coach.trades.traded} of ${r.coach.trades.deaths}` : '—'} hint="Killer killed within 5 s by a teammate" />
        <StatTile label="Won when planted" value={rateText(r.coach.postPlant)} hint="Rounds you planted the spike" />
      </div>
      <HighlightCards highlights={r.highlights} />
      <CoachPanel view={fromTeam(r.coach)} />
      <CoachPlayersTable rows={r.coach.players} />
      <Charts r={r} />
    </div>
  );
}
