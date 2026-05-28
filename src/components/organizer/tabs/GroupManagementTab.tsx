import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBRGroups } from '@/hooks/useBRGroups';
import { useBRRounds } from '@/hooks/useBRRounds';
import { apiClient } from '@/lib/apiClient';
import { GroupSetupPanel } from '@/components/organizer/br/GroupSetupPanel';
import { GroupCard } from '@/components/organizer/br/GroupCard';
import { RoundManagementPanel } from '@/components/organizer/br/RoundManagementPanel';
import AdvanceTeamsPanel from '@/components/organizer/br/AdvanceTeamsPanel';
import { useStageCompletion } from '@/hooks/useStageCompletion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertTriangle, LayoutGrid, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BRGroupTeam } from '@/types/brGroups';

interface TournamentStage {
  id: string;
  name: string;
  stage_order: number;
  advancement_count?: number;
  status?: string;
}

interface Participant {
  team_id?: string | null;
  status?: string;
}

interface ScoringPreset {
  placements: number[];
  killPoints: number;
  killCap: number | null;
}

interface GroupManagementTabProps {
  tournamentId: string;
  stages: TournamentStage[];
  participants: Participant[];
  scoringPreset: ScoringPreset;
  onUpdate: () => void;
}

export const GroupManagementTab: React.FC<GroupManagementTabProps> = ({
  stages,
  participants,
  scoringPreset,
  onUpdate,
}) => {
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.stage_order - b.stage_order),
    [stages]
  );

  const [selectedStageId, setSelectedStageId] = useState<string>(sortedStages[0]?.id ?? '');

  const { alreadyAdvanced } = useStageCompletion(selectedStageId || null);

  // Sync selectedStageId when stages load or change
  useEffect(() => {
    if (!selectedStageId && sortedStages.length > 0) {
      setSelectedStageId(sortedStages[0].id);
    }
  }, [sortedStages, selectedStageId]);

  const {
    groups,
    isLoading,
    error,
    refetch,
    createGroups,
    assignTeams,
    deleteGroup,
  } = useBRGroups(selectedStageId || null);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Check if the selected group has rounds for hasRounds lock detection
  const { rounds: selectedGroupRounds } = useBRRounds(
    selectedStageId || null,
    selectedGroupId
  );

  // Any group having rounds locks group setup modifications
  const hasRounds = selectedGroupRounds.length > 0;

  // Batch-fetch teams for ALL groups in one pass instead of N+1 queries per card
  const allGroupTeamsQueries = useQuery({
    queryKey: ['br-group-teams-batch', selectedStageId, groups.map(g => g.id).join(',')],
    queryFn: async () => {
      if (groups.length === 0) return {};
      const results = await Promise.all(
        groups.map(g =>
          apiClient.get<BRGroupTeam[]>(`/api/stages/${selectedStageId}/br/groups/${g.id}/teams`)
            .then(teams => ({ groupId: g.id, teams }))
        )
      );
      const map: Record<string, BRGroupTeam[]> = {};
      for (const r of results) map[r.groupId] = r.teams;
      return map;
    },
    enabled: !!selectedStageId && groups.length > 0,
    staleTime: 1000 * 60 * 2,
  });
  const teamsByGroup = allGroupTeamsQueries.data ?? {};

  const registeredTeamCount = useMemo(() => {
    const teamIds = new Set<string>();
    for (const p of participants) {
      if (p.team_id && (p.status === 'accepted' || p.status === 'approved')) {
        teamIds.add(p.team_id);
      }
    }
    return teamIds.size;
  }, [participants]);

  if (sortedStages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <LayoutGrid className="w-10 h-10 text-zinc-600 mb-3" />
        <p className="text-zinc-400 text-sm">No stages configured yet.</p>
        <p className="text-zinc-600 text-xs mt-1">Create stages in the Stages tab first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stage Selector */}
      {sortedStages.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="text-xs text-zinc-400 whitespace-nowrap">Stage</Label>
          <Select value={selectedStageId} onValueChange={setSelectedStageId}>
            <SelectTrigger className="w-64 bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {sortedStages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Setup + Distribution */}
      <GroupSetupPanel
        groups={groups}
        registeredTeamCount={registeredTeamCount}
        onCreateGroups={async (params) => {
          try { await createGroups.mutateAsync(params); onUpdate(); } catch { /* toast handled by hook */ }
        }}
        onAssignTeams={async (params) => {
          try { await assignTeams.mutateAsync(params); onUpdate(); } catch { /* toast handled by hook */ }
        }}
        isCreating={createGroups.isPending}
        isAssigning={assignTeams.isPending}
        hasRounds={hasRounds}
      />

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Group Cards */}
      {!isLoading && !error && groups.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">
            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'}
          </h3>
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
          stageId={selectedStageId}
          groupId={selectedGroupId}
          groupName={groups.find(g => g.id === selectedGroupId)?.name ?? ''}
          teams={teamsByGroup[selectedGroupId] ?? []}
          scoringPreset={scoringPreset}
        />
      )}

      {/* Stage Advancement Panel */}
      {(() => {
        if (isLoading || error || groups.length === 0) return null;
        const currentStage = sortedStages.find(s => s.id === selectedStageId);
        if (!currentStage || alreadyAdvanced) return null;
        const hasNextStage = sortedStages.some(s => s.stage_order > currentStage.stage_order);
        if (!hasNextStage) return null;
        return (
          <AdvanceTeamsPanel
            stageId={selectedStageId}
            advancementCount={currentStage.advancement_count ?? 4}
            onAdvanced={onUpdate}
          />
        );
      })()}

      {/* Empty State */}
      {!isLoading && !error && groups.length === 0 && selectedStageId && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <LayoutGrid className="w-10 h-10 text-zinc-600 mb-3" />
          <p className="text-zinc-400 text-sm">No groups created yet</p>
          <p className="text-zinc-600 text-xs mt-1">
            Configure the group count and lobby size above, then click Create Groups.
          </p>
        </div>
      )}
    </div>
  );
};
