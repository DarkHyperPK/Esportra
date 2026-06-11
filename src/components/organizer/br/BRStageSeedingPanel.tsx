import React, { useEffect, useMemo, useState } from 'react';
import { useBRGroupTeams, useBRGroupsDetail, useBRGroupsMutations } from '@/hooks/useBRGroups';
import { useBRStageSchedule } from '@/hooks/useBRStageSchedule';
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
import { generateBrSchedule } from '@/utils/brScheduleGenerator';
import type { BRDistributionMethod } from '@/types/brGroups';

interface BRStageSeedingPanelProps {
  stageId: string;
  stageCapacity: number | null;
  stageConfig?: unknown;
  registeredTeamCount: number;
  hasNextStage: boolean;
  advancementCount: number | null;
  onUpdate: () => void;
}

const BRStageSeedingPanel: React.FC<BRStageSeedingPanelProps> = ({
  stageId,
  registeredTeamCount,
  stageConfig,
  onUpdate,
}) => {
  const brConfig = getStageBRConfig({ config: stageConfig });
  const stageFormat = brConfig?.format ?? 'static_groups';
  const isRotation = stageFormat === 'group_rotation';

  const { data, isLoading, error, refetch } = useBRGroupsDetail(stageId, { includeTeams: false });
  const groups = data?.groups ?? [];
  const hasLobbies = data?.has_rounds === true;

  const { assignTeams, bootstrapLobby, deleteGroup } = useBRGroupsMutations(stageId);
  const { generatePreview, commitSchedule } = useBRStageSchedule(stageId);

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

  const schedulePreview = useMemo(() => {
    if (!isRotation || groups.length < 2) return null;
    try {
      return generateBrSchedule({ seedGroupCount: groups.length });
    } catch {
      return null;
    }
  }, [isRotation, groups.length]);

  const handleDistribute = async () => {
    try {
      await assignTeams.mutateAsync({ method });
      onUpdate();
    } catch { /* toast handled by hook */ }
    finally { setConfirmDistribute(false); }
  };

  const handleCommitSchedule = async () => {
    if (!schedulePreview) return;
    await commitSchedule.mutateAsync({
      mode: 'rotating_pairwise',
      seedGroupCount: groups.length,
      groupsPerLobby: 2,
      matchesPerWave: 1,
      matchupSchedule: 'auto',
      waves: schedulePreview.waves,
    });
    onUpdate();
  };

  const handlePreviewSchedule = () => {
    if (groups.length < 2) return;
    generatePreview.mutate({
      seedGroupCount: groups.length,
      groupsPerLobby: 2,
      matchesPerWave: 1,
    });
  };

  return (
    <div className="space-y-4 mt-4 border-t border-white/5 pt-4">
      {!isLoading && !error && (
        <div className="grid gap-2 md:grid-cols-4">
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
                ? 'No accepted participants yet.'
                : hasUnassignedTeams
                  ? `${remainingTeams} participant${remainingTeams === 1 ? '' : 's'} remain unassigned.`
                  : 'All participants seeded.'}
            </p>
          </div>
          {isRotation ? (
            <div className={`rounded-xl border px-3 py-3 ${hasLobbies ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : seedingComplete ? 'border-amber-500/20 bg-amber-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Step 3</p>
              <p className="mt-1 text-sm font-semibold text-white">Rotation Schedule</p>
              <p className="mt-1 text-xs text-zinc-400">
                {hasLobbies
                  ? `${schedulePreview?.totalLobbies ?? '—'} lobbies materialized.`
                  : seedingComplete
                    ? 'Generate and commit the pairwise schedule.'
                    : 'Finish seeding before generating the schedule.'}
              </p>
            </div>
          ) : null}
          <div className={`rounded-xl border px-3 py-3 ${seedingComplete && (!isRotation || hasLobbies) ? 'border-emerald-500/20 bg-emerald-500/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Step {isRotation ? '4' : '3'}</p>
            <p className="mt-1 text-sm font-semibold text-white">Ready for Games</p>
            <p className="mt-1 text-xs text-zinc-400">
              {seedingComplete && (!isRotation || hasLobbies)
                ? 'Use the Games tab to run lobbies and submit results.'
                : isRotation
                  ? 'Commit the rotation schedule to unlock games.'
                  : 'Finish seeding before moving to Games.'}
            </p>
          </div>
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
                className="h-7 text-[11px] border border-rose-500/20 bg-rose-600/10 text-rose-300 hover:bg-rose-600/20"
              >
                <Shuffle className="w-3 h-3 mr-1" />
                {assignTeams.isPending ? 'Seeding...' : totalAssigned > 0 ? 'Re-seed' : 'Seed participants'}
              </Button>
            </div>
          </div>

          {isRotation && seedingComplete && !hasLobbies && schedulePreview && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">Pairwise rotation preview</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {schedulePreview.totalWaves} waves · {schedulePreview.totalLobbies} lobbies · ~{schedulePreview.estimatedDurationMinutes} min est.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10"
                    onClick={handlePreviewSchedule}
                    disabled={generatePreview.isPending}
                  >
                    Validate on server
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    onClick={handleCommitSchedule}
                    disabled={commitSchedule.isPending}
                  >
                    {commitSchedule.isPending ? 'Committing...' : 'Commit schedule'}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {schedulePreview.waves.map((wave) => (
                  <div key={wave.wave} className="rounded-lg border border-white/5 px-3 py-2 text-xs text-zinc-400">
                    <span className="text-zinc-300 font-medium">Wave {wave.wave}</span>
                    <ul className="mt-1 space-y-0.5">
                      {wave.lobbies.map((lobby, idx) => (
                        <li key={idx}>{lobby.join(' vs ')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rosterLocked && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-400">
              Roster locked — this stage already has materialized lobbies.
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
            className="mt-4 bg-white text-black hover:bg-white/90 font-mono text-xs font-bold uppercase tracking-wider"
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
