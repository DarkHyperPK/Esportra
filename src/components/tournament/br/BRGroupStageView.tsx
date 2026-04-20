import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, Swords, Copy, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBRGroupStage, useBRGroupLeaderboard, useBRGroupRounds } from '@/hooks/useBRGroupLeaderboard';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';
import type { BRScoringPreset } from '@/types/battleRoyale';

interface BRGroupStageViewProps {
  stageId: string;
  scoringPreset: BRScoringPreset;
  /** Number of teams that qualify from each group (for cutoff line) */
  qualificationCount?: number;
}

const BRGroupStageView: React.FC<BRGroupStageViewProps> = ({
  stageId,
  scoringPreset,
  qualificationCount,
}) => {
  const { groups, isLoading, error } = useBRGroupStage(stageId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Auto-select first group
  const activeGroupId = selectedGroupId ?? groups[0]?.id ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Failed to load group stage data.</p>
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Group tab selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setSelectedGroupId(group.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border',
              activeGroupId === group.id
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            {group.name}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {group.team_count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Selected group content */}
      {activeGroupId && (
        <GroupContent
          stageId={stageId}
          groupId={activeGroupId}
          qualificationCount={qualificationCount}
        />
      )}
    </div>
  );
};

interface GroupContentProps {
  stageId: string;
  groupId: string;
  qualificationCount?: number;
}

const GroupContent: React.FC<GroupContentProps> = ({ stageId, groupId, qualificationCount }) => {
  const { toast } = useToast();
  const { leaderboard, isLoading: lbLoading, error: lbError } = useBRGroupLeaderboard(stageId, groupId);
  const { totalRounds, completedRounds, activeRound, isLoading: roundsLoading } = useBRGroupRounds(stageId, groupId);

  const isLoading = lbLoading || roundsLoading;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (lbError) {
    return (
      <Card className="bg-black/20 border border-white/10 rounded-2xl">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
          <p className="text-sm text-zinc-400">Failed to load leaderboard.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active round banner */}
      {activeRound && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 animate-pulse-slow">
          <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Swords className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">Round {activeRound.round_number} is Live</h3>
            {activeRound.lobby_code && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-zinc-400">Lobby Code:</span>
                <span className="text-sm font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {activeRound.lobby_code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeRound.lobby_code) {
                      navigator.clipboard.writeText(activeRound.lobby_code);
                      toast({ title: 'Lobby code copied!' });
                    }
                  }}
                  className="text-zinc-400 hover:text-white p-0.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <BRLeaderboard
        entries={leaderboard}
        totalGames={totalRounds}
        gamesCompleted={completedRounds}
        qualificationCutoff={qualificationCount}
      />
    </div>
  );
};

export default BRGroupStageView;
