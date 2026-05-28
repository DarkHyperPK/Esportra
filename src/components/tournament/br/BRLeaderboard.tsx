import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { cn } from '@/lib/utils';
import { Trophy, Target, Crosshair } from 'lucide-react';
import type { BRLeaderboardEntry } from '@/types/battleRoyale';

interface BRLeaderboardProps {
  entries: BRLeaderboardEntry[];
  totalGames: number;
  gamesCompleted: number;
  /** If set, draws a qualification cutoff line after this rank */
  qualificationCutoff?: number;
  pageSize?: number;
}

const BRLeaderboard: React.FC<BRLeaderboardProps> = ({
  entries,
  totalGames,
  gamesCompleted,
  qualificationCutoff,
  pageSize,
}) => {
  const [page, setPage] = React.useState(1);
  const sorted = React.useMemo(() => [...entries].sort((a, b) => b.totalPoints - a.totalPoints), [entries]);
  const hasQualificationCutoff =
    typeof qualificationCutoff === 'number' && qualificationCutoff > 0;
  const totalPages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const pageStartIndex = pageSize ? (page - 1) * pageSize : 0;
  const visibleEntries = pageSize ? sorted.slice(pageStartIndex, pageStartIndex + pageSize) : sorted;
  const rangeStart = sorted.length === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = pageSize ? Math.min(pageStartIndex + pageSize, sorted.length) : sorted.length;

  React.useEffect(() => {
    setPage(1);
  }, [sorted.length, pageSize, qualificationCutoff]);

  React.useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  return (
    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Leaderboard
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {gamesCompleted} / {totalGames} Games
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {totalGames > 0 ? 'No results recorded yet' : 'Waiting for first round to start'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[40px_1fr_70px_70px_70px_50px_70px] gap-2 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <div>#</div>
              <div>Team</div>
              <div className="text-center">Points</div>
              <div className="text-center">Place Pts</div>
              <div className="text-center">Kill Pts</div>
              <div className="text-center">Kills</div>
              <div className="text-center">Wins</div>
            </div>

            {visibleEntries.map((entry, index) => {
              const absoluteIndex = pageStartIndex + index;
              return (
              <React.Fragment key={entry.teamId}>
                <div
                  className={cn(
                    "grid grid-cols-[40px_1fr_70px_70px_70px_50px_70px] gap-2 items-center px-3 py-2.5 rounded-lg transition-colors",
                    absoluteIndex === 0 ? "bg-amber-500/10 border border-amber-500/20" :
                    absoluteIndex === 1 ? "bg-gray-400/5 border border-gray-400/10" :
                    absoluteIndex === 2 ? "bg-amber-700/5 border border-amber-700/10" :
                    qualificationCutoff != null && hasQualificationCutoff && absoluteIndex < qualificationCutoff ? "bg-emerald-500/[0.03]" :
                    "hover:bg-white/[0.02]"
                  )}
                >
                {/* Rank */}
                <div className={cn(
                  "text-sm font-bold",
                  absoluteIndex === 0 ? "text-amber-400" :
                  absoluteIndex === 1 ? "text-gray-300" :
                  absoluteIndex === 2 ? "text-amber-600" : "text-gray-500"
                )}>
                  {absoluteIndex + 1}
                </div>

                {/* Team */}
                <div className="flex items-center gap-2 min-w-0">
                  <EntityAvatar
                    type="team"
                    name={entry.teamName}
                    src={entry.teamLogo || undefined}
                    size="w-6 h-6"
                    className="flex-shrink-0"
                    fallbackClassName="text-[10px]"
                  />
                  <span className="text-sm text-white font-medium truncate">{entry.teamName}</span>
                </div>

                {/* Total Points */}
                <div className="text-center">
                  <span className="text-sm font-bold text-white">{entry.totalPoints}</span>
                </div>

                {/* Placement Points */}
                <div className="text-center text-xs text-emerald-400">{entry.totalPlacementPoints}</div>

                {/* Kill Points */}
                <div className="text-center text-xs text-rose-400">{entry.totalKillPoints}</div>

                {/* Total Kills */}
                <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  {entry.totalKills}
                </div>

                {/* Wins */}
                <div className="text-center">
                  <Badge variant="outline" className={cn(
                    "text-[10px] px-1.5",
                    entry.wins > 0 ? "border-amber-500/30 text-amber-400" : "border-white/10 text-gray-500"
                  )}>
                    {entry.wins}
                  </Badge>
                </div>
              </div>

              {/* Qualification cutoff line */}
              {hasQualificationCutoff && absoluteIndex + 1 === qualificationCutoff && absoluteIndex < sorted.length - 1 && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-emerald-500/40" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70 whitespace-nowrap">
                    Top {qualificationCutoff} Qualify
                  </span>
                  <div className="flex-1 h-px bg-emerald-500/40" />
                </div>
              )}
            </React.Fragment>
              );
            })}
          </div>
        )}
        {sorted.length > 0 && totalPages > 1 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Showing {rangeStart}-{rangeEnd} of {sorted.length}
            </p>
            <Pagination className="mx-0 w-auto justify-start sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#br-leaderboard"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) {
                        setPage((current) => current - 1);
                      }
                    }}
                    className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    href="#br-leaderboard"
                    isActive
                    onClick={(event) => event.preventDefault()}
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    {page} / {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#br-leaderboard"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < totalPages) {
                        setPage((current) => current + 1);
                      }
                    }}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BRLeaderboard;
