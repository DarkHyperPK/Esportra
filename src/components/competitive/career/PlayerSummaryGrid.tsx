import { formatNumber, formatPct } from '@/services/career/format';
import type { PlayerTotals } from '@/types/career';
import { StatTile } from './StatTile';

export function PlayerSummaryGrid({ totals: t }: { totals: PlayerTotals }) {
  const m = t.multiKills;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatTile label="Games" value={String(t.matches)} hint={`${t.scrimMatches} scrim · ${t.tournamentMatches} tournament`} />
      <StatTile label="Win rate" value={formatPct(t.winRatePct)} hint={`${t.wins} won · ${t.losses} lost${t.draws ? ` · ${t.draws} drawn` : ''}`} />
      <StatTile label="K/D" value={formatNumber(t.kd)} hint="Kills ÷ deaths, all rounds" />
      <StatTile label="KDA" value={formatNumber(t.kda)} hint="(Kills + assists) ÷ deaths" />
      <StatTile label="ACS" value={formatNumber(t.acs, 0)} hint="Score ÷ rounds played" />
      <StatTile label="ADR" value={formatNumber(t.adr, 0)} hint="Damage ÷ rounds played" />
      <StatTile label="Headshot share" value={formatPct(t.headshotSharePct)} hint="Of hits that landed. Not aim accuracy: misses are not recorded" />
      <StatTile label="Kills per round" value={formatNumber(t.killsPerRound)} hint={`${formatNumber(t.deathsPerRound)} deaths · ${formatNumber(t.assistsPerRound)} assists per round`} />
      <StatTile label="First kills" value={String(t.firstKills)} hint={`${t.firstDeaths} first deaths. First elimination of a round`} />
      <StatTile label="Multi-kill rounds" value={String(m.k2 + m.k3 + m.k4 + m.k5)} hint={`2K ${m.k2} · 3K ${m.k3} · 4K ${m.k4} · 5K ${m.k5}`} />
      <StatTile label="Plants" value={String(t.plants)} hint="Spike plants" />
      <StatTile label="Defuses" value={String(t.defuses)} hint="Spike defuses" />
    </div>
  );
}
