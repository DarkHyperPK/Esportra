import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBRGroups } from '@/hooks/useBRGroups';
import { useBRRounds } from '@/hooks/useBRRounds';
import { apiClient } from '@/lib/apiClient';
import { GroupCard } from '@/components/organizer/br/GroupCard';
import { RoundManagementPanel } from '@/components/organizer/br/RoundManagementPanel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, LayoutGrid, RefreshCw, Shuffle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { BRGroupTeam, BRDistributionMethod } from '@/types/brGroups';

interface ScoringPreset {
  placements: number[];
  killPoints: number;
  killCap: number | null;
}

interface BRStageGroupSectionProps {
  stageId: string;
  stageCapacity: number | null;
  registeredTeamCount: number;
  scoringPreset: ScoringPreset;
  hasNextStage: boolean;
  advancementCount: number | null;
  stageStatus: string | null;
  onUpdate: () => void;
}

const BRStageGroupSection: React.FC<BRStageGroupSectionProps> = ({
  stageId,
  stageCapacity,
  registeredTeamCount,
  scoringPreset,
  onUpdate,
}) => {
  const {
    groups,
    isLoading,
    error,
    refetch,
    assignTeams,
    deleteGroup,
  } = useBRGroups(stageId);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [method, setMethod] = useState<BRDistributionMethod>('random');
  const [confirmDistribute, setConfirmDistribute] = useState(false);

  // Check if ANY group in this stage has rounds — parallel fetch instead of sequential N+1
  const { rounds: selectedGroupRounds } = useBRRounds(stageId, selectedGroupId);
  const anyGroupHasRounds = useQuery({
    queryKey: ['br-any-rounds', stageId, groups.map(g => g.id).join(',')],
    queryFn: async () => {
      if (groups.length === 0) return false;
      const results = await Promise.all(
        groups.map(g =>
          apiClient.get<any[]>(`/api/stages/${stageId}/br/groups/${g.id}/rounds`)
            .then(rounds => rounds.length > 0)
            .catch(() => false)
        )
      );
      return results.some(Boolean);
    },
    enabled: groups.length > 0,
    staleTime: 1000 * 60,
  });
  const hasRounds = anyGroupHasRounds.data === true;

  // Batch-fetch teams for all groups
  const allGroupTeamsQueries = useQuery({
    queryKey: ['br-group-teams-batch', stageId, groups.map(g => g.id).join(',')],
    queryFn: async () => {
      if (groups.length === 0) return {};
      const results = await Promise.all(
        groups.map(g =>
          apiClient.get<BRGroupTeam[]>(`/api/stages/${stageId}/br/groups/${g.id}/teams`)
            .then(teams => ({ groupId: g.id, teams }))
            .catch(() => ({ groupId: g.id, teams: [] as BRGroupTeam[] }))
        )
      );
      const map: Record<string, BRGroupTeam[]> = {};
      for (const r of results) map[r.groupId] = r.teams;
      return map;
    },
    enabled: groups.length > 0,
    staleTime: 1000 * 60 * 2,
  });
  const teamsByGroup = allGroupTeamsQueries.data ?? {};

  const totalAssigned = groups.reduce((sum, g) => sum + g.team_count, 0);

  const handleDistribute = async () => {
    try {
      await assignTeams.mutateAsync({ method });
      onUpdate();
    } catch { /* toast handled by hook */ }
    finally { setConfirmDistribute(false); }
  };

  return (
    <div className="space-y-4 mt-4 border-t border-white/5 pt-4">
      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-300">Failed to load groups</p>
            <p className="text-xs text-red-400/60">{(error as Error).message}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-red-300 hover:text-red-200 hover:bg-red-500/10">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {/* Group Cards + Distribution */}
      {!isLoading && !error && groups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">
              {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
              <span className="text-zinc-600 ml-2">·</span>
              <span className="text-zinc-500 ml-2">{totalAssigned}/{registeredTeamCount} teams assigned</span>
            </h3>
            <div className="flex items-center gap-2">
              <Select value={method} onValueChange={(v) => setMethod(v as BRDistributionMethod)}>
                <SelectTrigger className="h-7 w-[140px] text-[11px] bg-white/5 border-white/10 text-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="snake">Snake Draft</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={() => totalAssigned > 0 ? setConfirmDistribute(true) : handleDistribute()}
                disabled={assignTeams.isPending || registeredTeamCount === 0}
                className="h-7 text-[11px] bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/20"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                {assignTeams.isPending ? 'Distributing...' : totalAssigned > 0 ? 'Redistribute' : 'Distribute'}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                teams={teamsByGroup[group.id] ?? []}
                teamsLoading={allGroupTeamsQueries.isLoading}
                onDelete={() => deleteGroup.mutate(group.id)}
                isDeleting={deleteGroup.isPending}
                isLocked={hasRounds}
                isSelected={selectedGroupId === group.id}
                onSelect={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Round Management Panel */}
      {!isLoading && !error && selectedGroupId && groups.some(g => g.id === selectedGroupId) && (
        <RoundManagementPanel
          stageId={stageId}
          groupId={selectedGroupId}
          groupName={groups.find(g => g.id === selectedGroupId)?.name ?? ''}
          teams={teamsByGroup[selectedGroupId] ?? []}
          scoringPreset={scoringPreset}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LayoutGrid className="w-8 h-8 text-zinc-600 mb-2" />
          <p className="text-zinc-400 text-sm">No groups created yet</p>
          <p className="text-zinc-600 text-xs mt-1">
            Apply a stage template to auto-create groups, or use Reset Stages to reconfigure.
          </p>
        </div>
      )}

      {/* Redistribute Confirmation */}
      <AlertDialog open={confirmDistribute} onOpenChange={setConfirmDistribute}>
        <AlertDialogContent className="bg-[#121214] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Redistribute Teams?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will reassign all {registeredTeamCount} teams across {groups.length} groups.
              Current assignments will be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDistribute}
              className="bg-rose-600 hover:bg-rose-500"
            >
              Redistribute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BRStageGroupSection;
