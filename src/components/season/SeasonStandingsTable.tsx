import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SeasonStanding } from '@/types/season';
import { Trophy } from 'lucide-react';

interface SeasonStandingsTableProps {
  standings: SeasonStanding[];
  className?: string;
}

const SeasonStandingsTable = ({ standings, className }: SeasonStandingsTableProps) => {
  if (standings.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-400', className)}>
        No standings yet. Recalculate the season after linked tournaments or stages are completed.
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl', className)}>
      <div className="grid grid-cols-[80px_minmax(0,1fr)_120px_120px] gap-3 border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
        <span>Rank</span>
        <span>Entry</span>
        <span>Points</span>
        <span>Ledger</span>
      </div>

      <div className="divide-y divide-white/5">
        {standings.map((standing) => (
          <div
            key={standing.entityId}
            className="grid grid-cols-[80px_minmax(0,1fr)_120px_120px] items-center gap-3 px-5 py-4"
          >
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10">
                #{standing.rank}
              </Badge>
              {standing.rank <= 3 && <Trophy className="h-4 w-4 text-amber-400" />}
            </div>

            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{standing.displayName}</p>
            </div>

            <p className="text-sm font-semibold text-white">{standing.totalPoints}</p>
            <p className="text-sm text-zinc-400">{standing.ledgerEntries}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeasonStandingsTable;

