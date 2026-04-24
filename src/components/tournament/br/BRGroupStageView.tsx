import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, Swords, Copy, Loader2, AlertCircle, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useBRGroupStage, useBRGroupLeaderboard, useBRGroupRounds } from '@/hooks/useBRGroupLeaderboard';
import { useBRGroupParticipants } from '@/hooks/useBRGroups';
import BRLeaderboard from '@/components/tournament/br/BRLeaderboard';

interface BRGroupStageViewProps {
  stageId: string;
  /** Number of teams that qualify from each group (for cutoff line) */
  qualificationCount?: number;
  /** If provided, renders a "Match Room" CTA button */
  tournamentSlug?: string;
}

const BRGroupStageView: React.FC<BRGroupStageViewProps> = ({
  stageId,
  qualificationCount,
  tournamentSlug,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { groups, isLoading, error, refetch } = useBRGroupStage(stageId);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const requestedGroupId = searchParams.get('brGroup');

  // Reset group selection when stage changes
  useEffect(() => {
    setSelectedGroupId(null);
  }, [stageId, requestedGroupId]);

  // Validate that the selected group still exists in the loaded list (guards against stale state after group deletion)
  const activeGroupId = (selectedGroupId && groups.some(g => g.id === selectedGroupId))
    ? selectedGroupId
    : (requestedGroupId && groups.some(g => g.id === requestedGroupId))
      ? requestedGroupId
      : groups[0]?.id ?? null;

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
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Groups haven't been set up yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tournamentSlug && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(`/tournaments/${tournamentSlug}/br-game-room`)}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold px-3 py-1.5 rounded-lg bg-rose-500/8 border border-rose-500/20 hover:bg-rose-500/12 transition-colors"
          >
            <Swords className="w-3.5 h-3.5" />
            Match Room
          </button>
        </div>
      )}

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
  const { leaderboard, isLoading: lbLoading, error: lbError, refetch: refetchLb } = useBRGroupLeaderboard(stageId, groupId);
  const { totalRounds, completedRounds, activeRound, isLoading: roundsLoading } = useBRGroupRounds(stageId, groupId);
  const { data: participants = [], isLoading: participantsLoading } = useBRGroupParticipants(stageId, groupId);

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
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetchLb()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* No rounds state */}
      {!roundsLoading && totalRounds === 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 bg-white/[0.01]">
          <Clock className="w-4 h-4 text-zinc-600 flex-shrink-0" />
          <p className="text-xs text-zinc-500">No rounds have been created yet. The organizer will start rounds soon.</p>
        </div>
      )}

      {/* All rounds complete, none active */}
      {!roundsLoading && totalRounds > 0 && !activeRound && completedRounds < totalRounds && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04]">
          <Clock className="w-4 h-4 text-amber-500/60 flex-shrink-0" />
          <p className="text-xs text-amber-300/70">Waiting for the next round to start. {completedRounds}/{totalRounds} rounds completed.</p>
        </div>
      )}

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
                  aria-label="Copy lobby code"
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

      {/* Group participants */}
      <Card className="bg-black/20 border border-white/10 rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <h3 className="text-sm font-semibold text-white">Participants</h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {participants.length}
            </Badge>
          </div>

          {participantsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : participants.length === 0 ? (
            <p className="text-xs text-zinc-500">No participants assigned to this group yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {participants.map((participant) => (
                <div
                  key={participant.team_id}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                >
                    {participant.logo_url ? (
                      <img
                        src={participant.logo_url}
                        alt={participant.team_name}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                      />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{participant.team_name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Seed {participant.seed_order}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <BRLeaderboard
        entries={leaderboard}
        totalGames={totalRounds}
        gamesCompleted={completedRounds}
        qualificationCutoff={qualificationCount}
        pageSize={20}
      />
    </div>
  );
};

export default BRGroupStageView;
