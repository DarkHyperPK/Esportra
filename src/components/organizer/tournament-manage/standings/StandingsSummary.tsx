import { format, parseISO, isValid } from 'date-fns';
import { formatCurrency } from '@/utils/formatCurrency';
import type { StandingsRow } from '@/types/standings';
import { StatTile } from '../overview/StatTile';

interface StandingsSummaryProps {
  rows: StandingsRow[];
  isFinal: boolean;
  computedAt: string | null;
  prizePool: number;
  currency: string;
}

function updatedLabel(computedAt: string | null): string | null {
  if (!computedAt) return null;
  const d = parseISO(computedAt);
  return isValid(d) ? `Updated ${format(d, 'MMM d, h:mm a')}` : null;
}

/** Four numbers an organizer checks before touching the table. */
export function StandingsSummary({ rows, isFinal, computedAt, prizePool, currency }: StandingsSummaryProps) {
  const leader = rows.find((r) => r.rank === 1) ?? rows[0];
  const liveCount = rows.filter((r) => r.is_live).length;
  const provisional = rows.filter((r) => r.rank_status === 'provisional').length;
  const paidOut = rows.reduce((sum, r) => sum + (r.prize_amount > 0 ? r.prize_amount : 0), 0);
  const placesPaid = rows.filter((r) => r.prize_amount > 0).length;

  const statusHint = isFinal
    ? updatedLabel(computedAt) ?? 'Placings are final'
    : liveCount > 0
      ? `${liveCount} team${liveCount === 1 ? '' : 's'} playing now`
      : provisional > 0
        ? `${provisional} rank${provisional === 1 ? '' : 's'} provisional`
        : updatedLabel(computedAt) ?? 'Updates as results come in';

  return (
    <section
      aria-label="Standings summary"
      className="grid grid-cols-2 gap-px border border-white/[0.07] bg-white/[0.07] lg:grid-cols-[1fr_0.8fr_1.6fr_1.2fr]"
    >
      <StatTile className="bg-card" label="Status" value={isFinal ? 'Final' : 'In progress'} hint={statusHint} />
      <StatTile className="bg-card" label="Teams" value={rows.length} hint={isFinal ? 'Placed' : 'Ranked so far'} />
      <StatTile
        className="col-span-2 bg-card lg:col-span-1"
        label={isFinal ? 'Champion' : 'Leading'}
        value={<span className="block max-w-full truncate">{leader?.team_name ?? '—'}</span>}
        hint={leader ? `${leader.wins}–${leader.losses} record` : undefined}
      />
      <StatTile
        className="col-span-2 bg-card lg:col-span-1"
        label="Prize pool"
        value={prizePool > 0 ? formatCurrency(prizePool, currency) : 'None'}
        hint={
          prizePool <= 0
            ? 'No prizes set for this event'
            : isFinal
              ? `${formatCurrency(paidOut, currency)} across ${placesPaid} place${placesPaid === 1 ? '' : 's'}`
              : 'Prizes show here once placings are final'
        }
      />
    </section>
  );
}
