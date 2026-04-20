import React, { useState, useMemo } from 'react';
import { useBRGroups } from '@/hooks/useBRGroups';
import { GroupSetupPanel } from '@/components/organizer/br/GroupSetupPanel';
import { GroupCard } from '@/components/organizer/br/GroupCard';
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

interface TournamentStage {
  id: string;
  name: string;
  stage_order: number;
}

interface Participant {
  team_id?: string | null;
  status?: string;
}

interface GroupManagementTabProps {
  tournamentId: string;
  stages: TournamentStage[];
  participants: Participant[];
  onUpdate: () => void;
}

export const GroupManagementTab: React.FC<GroupManagementTabProps> = ({
  stages,
  participants,
  onUpdate,
}) => {
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.stage_order - b.stage_order),
    [stages]
  );

  const [selectedStageId, setSelectedStageId] = useState<string>(sortedStages[0]?.id ?? '');

  const {
    groups,
    isLoading,
    error,
    refetch,
    createGroups,
    assignTeams,
    deleteGroup,
  } = useBRGroups(selectedStageId || null);

  const registeredTeamCount = useMemo(() => {
    const teamIds = new Set<string>();
    for (const p of participants) {
      if (p.team_id && (p.status === 'accepted' || p.status === 'approved')) {
        teamIds.add(p.team_id);
      }
    }
    return teamIds.size;
  }, [participants]);

  // Detect if any group has rounds (locks modifications)
  const hasRounds = false; // Will be enhanced in Phase 3 when rounds are tracked

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
        onCreateGroups={async (params) => { await createGroups.mutateAsync(params); onUpdate(); }}
        onAssignTeams={async (params) => { await assignTeams.mutateAsync(params); onUpdate(); }}
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
                stageId={selectedStageId}
                onDelete={() => deleteGroup.mutate(group.id)}
                isDeleting={deleteGroup.isPending}
                isLocked={hasRounds}
              />
            ))}
          </div>
        </div>
      )}

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
