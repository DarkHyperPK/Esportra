import React, { useEffect, useState } from 'react';
import { useBRGroupTeams, useBRGroupsDetail, useBRGroupsMutations } from '@/hooks/useBRGroups';
import { GroupCard } from '@/components/organizer/br/GroupCard';
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
import { getApiErrorMessage } from '@/lib/apiClient';
import { getStageBRConfig } from '@/utils/brConfigResolve';
import type { BRDistributionMethod } from '@/types/brGroups';

interface BRStageSeedingPanelProps {
  stageId: string;
  stageCapacity: number | null;
  stageConfig?: unknown;
  registeredTeamCount: number;
  hasNextStage: boolean;
  advancementCount: number | null;
  checkInRequired?: boolean;
  pendingCheckInCount?: number;
  onUpdate: () => void;
}

const BRStageSeedingPanel: React.FC<BRStageSeedingPanelProps> = ({
  stageId,
  registeredTeamCount,
  stageConfig,
  checkInRequired = false,
  pendingCheckInCount = 0,
  onUpdate,
}) => {
  const brConfig = getStageBRConfig({ config: stageConfig });
  const isRotation = brConfig?.format === 'group_rotation';

  const { data, isLoading, error, refetch } = useBRGroupsDetail(stageId, { includeTeams: false });
  const groups = data?.groups ?? [];
  const hasLobbies = data?.has_rounds === true;

  const { assignTeams, bootstrapLobby, generateLobbies, deleteGroup } = useBRGroupsMutations(stageId);

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
  const seedingComplete = hasGroups && (!hasTeamsToSeed || !hasUnassignedTeams);
  const remainingTeams = Math.max(registeredTeamCount - totalAssigned, 0);
  const rosterLocked = hasLobbies;
  const awaitingCheckIn = checkInRequired && pendingCheckInCount > 0;

  const handleDistribute = async () => {
    try {
      await assignTeams.mutateAsync({ method });
      onUpdate();
    } catch { /* toast handled by hook */ }
    finally { setConfirmDistribute(false); }
  };

  const readyForGames = seedingComplete && hasLobbies;
  const needsMatchGeneration = !isRotation && seedingComplete && !hasLobbies;

  return (
    <div className="space-y-4 mt-4 border-t border-white/5 pt-4">
      {!isLoading && !error && (
        <div className="grid gap-2 md:grid-cols-3">
          <div className={`rounded-xl border px-3 py-3 ${hasGroups ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Step 1</p>
            <p className="mt-1 text-sm font-semibold text-white">{isSingleLobby ? 'Main Lobby Ready' : 'Seed Groups Ready'}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {hasGroups ? `${groups.length} ${isSingleLobby ? 'lobby' : 'groups'} configured.` : 'Create seed groups first.'}
            </p>
          </div>
          <div className={`rounded-xl border px-3 py-3 ${seedingComplete ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : hasGroups ? 'border-amber-500/20 bg-amber-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Step 2</p>
            <p className="mt-1 text-sm font-semibold text-white">Seed Participants</p>
            <p className="mt-1 text-xs text-zinc-400">
              {!hasTeamsToSeed
                ? checkInRequired && pendingCheckInCount > 0
                  ? `${pendingCheckInCount} registered — waiting on check-in.`
                  : 'No seed-eligible participants yet.'
                : hasUnassignedTeams
                  ? `${remainingTeams} participant${remainingTeams === 1 ? '' : 's'} remain unassigned.`
                  : 'All participants seeded.'}
            </p>
          </div>
          <div className={`rounded-xl border px-3 py-3 ${readyForGames ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : needsMatchGeneration ? 'border-amber-500/20 bg-amber-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Step 3</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {readyForGames ? 'Ready for Games' : needsMatchGeneration ? 'Create Matches' : 'Ready for Games'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {!seedingComplete
                ? 'Finish seeding first.'
                : isRotation && !hasLobbies
                  ? 'Create matches in the Schedule tab, then use Games.'
                  : needsMatchGeneration
                    ? 'Generate lobbies and games to lock the roster.'
                    : 'Use the Games tab to run matches and submit results.'}
            </p>
            {needsMatchGeneration && (
              <Button
                size="sm"
                className="mt-3 h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white"
                disabled={generateLobbies.isPending}
                onClick={() => generateLobbies.mutate(undefined, { onSuccess: () => onUpdate() })}
              >
                {generateLobbies.isPending ? 'Creating matches...' : 'Create matches'}
              </Button>
            )}
          </div>
        </div>
      )}

      {awaitingCheckIn && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          Check-in is required. Only checked-in players are seeded — {pendingCheckInCount} still pending on the Participants tab.
        </div>
      )}

      {isRotation && seedingComplete && !hasLobbies && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          Create matches from the round schedule — open the <strong className="text-amber-100">Schedule</strong> tab for this stage.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-300">Failed to load groups</p>
            <p className="text-xs text-red-400/60">
              {getApiErrorMessage(error, 'We could not load the BR lobby setup for this stage.')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-red-300 hover:text-red-200 hover:bg-red-500/10">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && groups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">
              {isSingleLobby ? 'Main Lobby' : `${groups.length} Seed Groups`}
              <span className="text-zinc-600 ml-2">·</span>
              <span className="text-zinc-500 ml-2">{totalAssigned}/{registeredTeamCount} assigned</span>
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
                disabled={assignTeams.isPending || registeredTeamCount === 0 || rosterLocked}
                title={registeredTeamCount === 0 && awaitingCheckIn ? 'Waiting for players to check in' : undefined}
                className="h-7 text-[11px] border border-rose-500/20 bg-rose-600/10 text-rose-300 hover:bg-rose-600/20"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                {assignTeams.isPending ? 'Seeding...' : totalAssigned > 0 ? 'Re-seed' : 'Seed participants'}
              </Button>
            </div>
          </div>

          {rosterLocked && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-400">
              Roster locked — matches already exist for this stage.
            </div>
          )}
          {hasTeamsToSeed && hasUnassignedTeams && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
              Seed the remaining {remainingTeams} participant{remainingTeams === 1 ? '' : 's'} before advancing.
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
                isLocked={hasLobbies}
                isSelected={selectedGroupId === group.id}
                onSelect={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
                displayName={isSingleLobby ? 'Main Lobby' : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !error && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <LayoutGrid className="w-8 h-8 text-zinc-600 mb-2" />
          <p className="text-zinc-400 text-sm">No seed groups yet</p>
          <p className="text-zinc-600 text-xs mt-1">
            Initialize groups from the stage format before seeding participants.
          </p>
          <Button
            size="sm"
            onClick={() => bootstrapLobby.mutate()}
            disabled={bootstrapLobby.isPending}
            className="mt-4 bg-emerald-600 text-white hover:bg-emerald-500 hover:text-white border-emerald-500/40 font-mono text-xs font-bold uppercase tracking-wider"
          >
            {bootstrapLobby.isPending ? 'Initializing...' : 'Initialize Groups'}
          </Button>
        </div>
      )}

      <AlertDialog open={confirmDistribute} onOpenChange={setConfirmDistribute}>
        <AlertDialogContent className="bg-[#121214] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Redistribute teams?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This reassigns all {registeredTeamCount} participants across {groups.length} groups.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDistribute} className="bg-rose-600 hover:bg-rose-500">
              Redistribute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BRStageSeedingPanel;
