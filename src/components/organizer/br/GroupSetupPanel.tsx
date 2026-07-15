import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { LayoutGrid, Shuffle } from 'lucide-react';
import type { BRGroup, BRDistributionMethod } from '@/types/brGroups';

interface GroupSetupPanelProps {
  groups: BRGroup[];
  stageCapacity: number | null;
  registeredTeamCount: number;
  onCreateGroups: (params: { groupCount: number; lobbySize: number; force?: boolean }) => Promise<unknown>;
  onAssignTeams: (params: { method: BRDistributionMethod }) => Promise<unknown>;
  isCreating: boolean;
  isAssigning: boolean;
  hasRounds: boolean;
}

export const GroupSetupPanel: React.FC<GroupSetupPanelProps> = ({
  groups,
  stageCapacity,
  registeredTeamCount,
  onCreateGroups,
  onAssignTeams,
  isCreating,
  isAssigning,
  hasRounds,
}) => {
  const lobbySize = stageCapacity ?? registeredTeamCount;
  const autoGroupCount = lobbySize > 0 ? Math.max(1, Math.ceil(registeredTeamCount / lobbySize)) : 1;
  const [groupCount, setGroupCount] = useState(
    groups.length > 0 ? groups.length : autoGroupCount
  );
  const [method, setMethod] = useState<BRDistributionMethod>('random');
  const [confirmRecreate, setConfirmRecreate] = useState(false);
  const [confirmDistribute, setConfirmDistribute] = useState(false);

  const hasExistingGroups = groups.length > 0;
  const totalAssigned = groups.reduce((sum, g) => sum + g.team_count, 0);

  const handleCreate = async (force: boolean = false) => {
    try {
      await onCreateGroups({ groupCount, lobbySize, force });
    } finally {
      setConfirmRecreate(false);
    }
  };

  const handleDistribute = async () => {
    try {
      await onAssignTeams({ method });
    } finally {
      setConfirmDistribute(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Group Setup */}
      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <LayoutGrid className="w-4 h-4 text-rose-400" />
          Group Setup
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Groups</Label>
            <Input
              type="number"
              min={1}
              max={128}
              value={groupCount}
              onChange={(e) => setGroupCount(Math.min(128, Math.max(1, parseInt(e.target.value) || 1)))}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Lobby Size</Label>
            <div className="h-10 flex items-center px-3 rounded-md bg-white/[0.03] border border-white/10 text-sm text-gray-300">
              {lobbySize} teams
            </div>
            <p className="text-[10px] text-gray-600">Set in stage config above</p>
          </div>
        </div>

        <button type="button"
          onClick={() => hasRounds ? setConfirmRecreate(true) : handleCreate()}
          disabled={isCreating}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-500 hover:text-white border-emerald-500/40 font-mono text-xs font-bold uppercase tracking-wider"
        >
          {isCreating ? 'Creating...' : hasExistingGroups ? 'Recreate Groups' : 'Create Groups'}
        </button>
      </div>

      {/* Team Distribution */}
      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Shuffle className="w-4 h-4 text-rose-400" />
          Team Distribution
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as BRDistributionMethod)}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">Random — Shuffled distribution</SelectItem>
              <SelectItem value="snake">Snake Draft — Balanced distribution</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-zinc-500">
          {totalAssigned}/{registeredTeamCount} teams assigned across {groups.length} groups
        </div>

        <button type="button"
          onClick={() => totalAssigned > 0 ? setConfirmDistribute(true) : handleDistribute()}
          disabled={isAssigning || groups.length === 0 || registeredTeamCount === 0}
          className="w-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500"
        >
          {isAssigning ? 'Distributing...' : totalAssigned > 0 ? 'Redistribute Teams' : 'Distribute Teams'}
        </button>
      </div>

      {/* Recreate Confirmation */}
      <AlertDialog open={confirmRecreate} onOpenChange={setConfirmRecreate}>
        <AlertDialogContent className="bg-[#121214] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Recreate Groups?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will delete all existing groups, rounds, and results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCreate(true)}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete & Recreate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
