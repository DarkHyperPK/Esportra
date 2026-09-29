/**
 * StandingsPanel.tsx
 *
 * Placings for the whole event: one header (with the recalculate action),
 * a summary strip, then the table. Replaces the old tab that repeated the
 * "Standings" heading inside the panel.
 */

import { Lock, RefreshCw, Trophy } from 'lucide-react';
import { CommandButton, CommandEmptyState, CommandHeader } from '@/components/management/CommandSurface';
import { InlineNotice, StatusPill } from '@/components/ui/kit';
import { useTournamentPlacements, useResolvePlacements } from '@/hooks/useTournamentPlacements';
import { useTournamentStandings } from '@/hooks/useTournamentStandings';
import { useToast } from '@/hooks/use-toast';
import type { Tournament } from '@/types/tournament';
import { StandingsSummary } from '../standings/StandingsSummary';
import { StandingsTable } from '../standings/StandingsTable';

interface StandingsPanelProps {
  tournament: Pick<Tournament, 'id' | 'prize_pool' | 'currency'>;
  locked?: boolean;
}

function StandingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading standings" className="space-y-6">
      <div className="grid grid-cols-2 gap-px border border-white/[0.07] bg-white/[0.07] lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 bg-card p-5">
            <div className="h-2 w-16 bg-white/[0.06]" />
            <div className="h-6 w-24 bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <div className="border border-white/[0.07]">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-12 items-center gap-4 border-b border-white/[0.05] px-5 last:border-b-0">
            <div className="h-3 w-5 bg-white/[0.06]" />
            <div className="h-3 w-40 bg-white/[0.06]" />
            <div className="ml-auto h-3 w-48 bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StandingsPanel({ tournament, locked = false }: StandingsPanelProps) {
  const { toast } = useToast();
  const prizePool = parseFloat(tournament.prize_pool ?? '0') || 0;
  const currency = tournament.currency ?? 'USD';

  const { isLoading: placementsLoading } = useTournamentPlacements(tournament.id);
  const standings = useTournamentStandings(tournament.id);
  const resolve = useResolvePlacements();

  const rows = standings.data?.rows ?? [];
  const columns = standings.data?.columns ?? [];
  const isFinal = standings.data?.is_complete ?? false;
  const isLoading = placementsLoading || standings.isLoading;

  const recalculate = async () => {
    try {
      await resolve.mutateAsync({ tournamentId: tournament.id, force: true });
      await standings.refetch();
      toast({ title: 'Standings recalculated', description: 'Placings now match the latest bracket results.' });
    } catch {
      toast({ title: 'Couldn’t recalculate standings', description: 'Check your connection and try again.', variant: 'destructive' });
    }
  };

  const action = locked ? (
    <StatusPill tone="neutral" label="Results locked" />
  ) : (
    <CommandButton variant="secondary" size="sm" slide onClick={recalculate} disabled={resolve.isPending || isLoading}>
      <RefreshCw className={resolve.isPending ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} aria-hidden />
      {resolve.isPending ? 'Recalculating' : 'Recalculate'}
    </CommandButton>
  );

  return (
    <>
      <CommandHeader
        eyebrow="Run"
        title="Standings"
        description={
          isFinal
            ? 'Final placings. Prize payouts are based on this order.'
            : 'Live placings from the bracket. They become final when the last match is reported.'
        }
        actions={action}
      />

      <div className="space-y-6 px-5 py-6 sm:px-6">
        {isLoading ? (
          <StandingsSkeleton />
        ) : standings.isError ? (
          <InlineNotice
            tone="critical"
            title="Couldn’t load standings"
            action={<CommandButton variant="ghost" size="sm" onClick={() => standings.refetch()}>Try again</CommandButton>}
          >
            Check your connection and try again.
          </InlineNotice>
        ) : rows.length === 0 ? (
          <CommandEmptyState
            icon={<Trophy className="h-5 w-5" />}
            title="No standings yet"
            description="Placings appear here once the first match result is reported. If results are already in, recalculate to build them from the bracket."
            action={locked ? undefined : (
              <CommandButton variant="primary" size="sm" slide onClick={recalculate} disabled={resolve.isPending}>
                Recalculate now
              </CommandButton>
            )}
          />
        ) : (
          <>
            <StandingsSummary
              rows={rows}
              isFinal={isFinal}
              computedAt={standings.data?.computed_at ?? null}
              prizePool={prizePool}
              currency={currency}
            />
            <StandingsTable rows={rows} columns={columns} isFinal={isFinal} showPrize={isFinal && prizePool > 0} currency={currency} />
            {locked && (
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                <Lock className="h-3 w-3" aria-hidden />
                The tournament is complete, so placings can’t be recalculated.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
