import React, { useEffect, useState } from 'react';
import { useBRGroupTeams, useBRGroupsDetail, useBRGroupsMutations } from '@/hooks/useBRGroups';
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
import type { BRDistributionMethod } from '@/types/brGroups';

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
  const { data, isLoading, error, refetch } = useBRGroupsDetail(stageId, { includeTeams: false });
  const groups = data?.groups ?? [];
  const hasRounds = data?.has_rounds === true;

  const { assignTeams, bootstrapLobby, deleteGroup } = useBRGroupsMutations(stageId);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [method, setMethod] = useState<BRDistributionMethod>('random');
  const [confirmDistribute, setConfirmDistribute] = useState(false);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    if (selectedGroupId && !selectedGroup) {
      setSelectedGroupId(null);
    }
  }, [selectedGroup, selectedGroupId]);

  const {
    data: selectedGroupTeams = [],
    isLoading: selectedGroupTeamsLoading,
  } = useBRGroupTeams(stageId, selectedGroup?.id ?? null);

  const totalAssigned = groups.reduce((sum, g) => sum + g.team_count, 0);
  const isSingleLobby = groups.length === 1;
  const hasGroups = groups.length > 0;
  const hasTeamsToSeed = registeredTeamCount > 0;
  const hasUnassignedTeams = totalAssigned < registeredTeamCount;
  const canManageRounds = hasGroups && (!hasTeamsToSeed || !hasUnassignedTeams);
  const remainingTeams = Math.max(registeredTeamCount - totalAssigned, 0);

  const handleDistribute = async () => {
    try {
      await assignTeams.mutateAsync({ method });
      onUpdate();
    } catch { /* toast handled by hook */ }
    finally { setConfirmDistribute(false); }
  };

  return (
    <div className="space-y-4 mt-4 border-t border-white/5 pt-4">
      {!isLoading && !error && (
        <div className="grid gap-2 md:grid-cols-3">
          <div className={`rounded-xl border px-3 py-3 ${hasGroups ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Step 1</p>
            <p className="mt-1 text-sm font-semibold text-white">{isSingleLobby ? 'Main Lobby Ready' : 'Lobbies Ready'}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {hasGroups ? `${groups.length} ${isSingleLobby ? 'lobby' : 'groups'} configured.` : 'Create the playable lobby structure first.'}
            </p>
          </div>
          <div className={`rounded-xl border px-3 py-3 ${canManageRounds ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : hasGroups ? 'border-amber-500/20 bg-amber-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Step 2</p>
            <p className="mt-1 text-sm font-semibold text-white">Seed Participants</p>
            <p className="mt-1 text-xs text-zinc-400">
              {!hasTeamsToSeed
                ? 'No accepted participants yet.'
                : hasUnassignedTeams
                  ? `${remainingTeams} ${remainingTeams === 1 ? 'participant remains' : 'participants remain'} unassigned.`
                  : 'All participants have been seeded into lobbies.'}
            </p>
          </div>
          <div className={`rounded-xl border px-3 py-3 ${canManageRounds ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Step 3</p>
            <p className="mt-1 text-sm font-semibold text-white">Run Groups & Rounds</p>
            <p className="mt-1 text-xs text-zinc-400">
              {canManageRounds
                ? 'Open a lobby card below to create rounds and submit results.'
                : 'Rounds unlock once every participant is placed in a lobby.'}
            </p>
          </div>
        </div>
      )}

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
              {isSingleLobby ? 'Main Lobby' : `${groups.length} Groups`}
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
                className="h-7 text-[11px] border border-rose-500/20 bg-rose-600/10 text-rose-300 hover:bg-rose-600/20"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                {assignTeams.isPending ? 'Seeding...' : totalAssigned > 0 ? 'Re-seed' : 'Seed participants'}
              </Button>
            </div>
          </div>
          {hasTeamsToSeed && hasUnassignedTeams && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
              Seed the remaining {remainingTeams} {remainingTeams === 1 ? 'participant' : 'participants'} before running rounds or advancing this stage.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                teams={selectedGroupId === group.id ? selectedGroupTeams : []}
                teamsLoading={selectedGroupId === group.id && selectedGroupTeamsLoading}
                showTeams={selectedGroupId === group.id}
                onDelete={() => deleteGroup.mutate(group.id)}
                isDeleting={deleteGroup.isPending}
                isLocked={hasRounds}
                isSelected={selectedGroupId === group.id}
                onSelect={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
                displayName={isSingleLobby ? 'Main Lobby' : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Round Management Panel */}
      {!isLoading && !error && selectedGroup && (
        !canManageRounds ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-semibold text-white">Rounds are locked</p>
            <p className="mt-1 text-xs text-zinc-400">
              Finish seeding every participant into a lobby before creating rounds for {displayGroupName(selectedGroup, isSingleLobby)}.
            </p>
          </div>
        ) : selectedGroupTeamsLoading ? (
          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="h-5 w-40 bg-white/5 rounded animate-pulse" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <RoundManagementPanel
            stageId={stageId}
            groupId={selectedGroup.id}
            groupName={displayGroupName(selectedGroup, isSingleLobby)}
            teams={selectedGroupTeams}
            scoringPreset={scoringPreset}
          />
        )
      )}

      {/* Empty State */}
      {!isLoading && !error && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LayoutGrid className="w-8 h-8 text-zinc-600 mb-2" />
          <p className="text-zinc-400 text-sm">No groups created yet</p>
          <p className="text-zinc-600 text-xs mt-1">
            Initialize the lobby to manage BR rounds and results.
          </p>
          <Button
            size="sm"
            onClick={() => bootstrapLobby.mutate()}
            disabled={bootstrapLobby.isPending}
            className="mt-4 bg-white text-black hover:bg-white/90 font-mono text-xs font-bold uppercase tracking-wider"
          >
            {bootstrapLobby.isPending ? 'Initializing...' : 'Initialize Lobby'}
          </Button>
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

function displayGroupName(group: { name: string }, isSingleLobby: boolean) {
  return isSingleLobby ? 'Main Lobby' : group.name;
}
