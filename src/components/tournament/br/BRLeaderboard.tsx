import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Trophy, Target, Crosshair } from 'lucide-react';
import type { BRLeaderboardEntry } from '@/types/battleRoyale';

interface BRLeaderboardProps {
  entries: BRLeaderboardEntry[];
  totalGames: number;
  gamesCompleted: number;
}

const BRLeaderboard: React.FC<BRLeaderboardProps> = ({ entries, totalGames, gamesCompleted }) => {
  const sorted = [...entries].sort((a, b) => b.totalPoints - a.totalPoints);

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
            <p className="text-sm">No results yet. Enter game results to see the leaderboard.</p>
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

            {sorted.map((entry, index) => (
              <div
                key={entry.teamId}
                className={cn(
                  "grid grid-cols-[40px_1fr_70px_70px_70px_50px_70px] gap-2 items-center px-3 py-2.5 rounded-lg transition-colors",
                  index === 0 ? "bg-amber-500/10 border border-amber-500/20" :
                  index === 1 ? "bg-gray-400/5 border border-gray-400/10" :
                  index === 2 ? "bg-amber-700/5 border border-amber-700/10" :
                  "hover:bg-white/[0.02]"
                )}
              >
                {/* Rank */}
                <div className={cn(
                  "text-sm font-bold",
                  index === 0 ? "text-amber-400" :
                  index === 1 ? "text-gray-300" :
                  index === 2 ? "text-amber-600" : "text-gray-500"
                )}>
                  {index + 1}
                </div>

                {/* Team */}
                <div className="flex items-center gap-2 min-w-0">
                  {entry.teamLogo && (
                    <img src={entry.teamLogo} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                  )}
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BRLeaderboard;
