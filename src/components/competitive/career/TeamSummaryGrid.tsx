import { formatNumber, formatPct } from '@/services/career/format';
import type { TeamTotals } from '@/types/career';
import { StatTile } from './StatTile';

export function TeamSummaryGrid({ totals: t }: { totals: TeamTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatTile label="Games" value={String(t.matches)} hint={`${t.scrimMatches} scrim · ${t.tournamentMatches} tournament`} />
      <StatTile label="Win rate" value={formatPct(t.winRatePct)} hint={`${t.wins} won · ${t.losses} lost${t.draws ? ` · ${t.draws} drawn` : ''}`} />
      <StatTile label="Round win rate" value={formatPct(t.roundWinRatePct)} hint={`${t.roundsWon} won of ${t.roundsWon + t.roundsLost} rounds`} />
      <StatTile label="Rounds per game" value={`${formatNumber(t.avgRoundsWon, 1)}–${formatNumber(t.avgRoundsLost, 1)}`} hint="Average rounds won – lost" />
      <StatTile label="Kills per round" value={formatNumber(t.killsPerRound)} hint={`${formatNumber(t.deathsPerRound)} deaths per round`} />
      <StatTile label="Damage per round" value={formatNumber(t.damagePerRound, 0)} hint="Whole team, dealt" />
      <StatTile label="First kill rate" value={formatPct(t.firstKillRatePct)} hint="Rounds where the team got the first elimination" />
      <StatTile label="First death rate" value={formatPct(t.firstDeathRatePct)} hint="Rounds where the team lost the first player" />
    </div>
  );
}
