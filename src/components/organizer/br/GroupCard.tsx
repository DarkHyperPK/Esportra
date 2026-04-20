import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Trash2, Users, Lock } from 'lucide-react';
import type { BRGroup, BRGroupTeam } from '@/types/brGroups';

interface GroupCardProps {
  group: BRGroup;
  teams: BRGroupTeam[];
  teamsLoading: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  isLocked: boolean;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  teams,
  teamsLoading,
  onDelete,
  isDeleting,
  isLocked,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fillPercent = group.lobby_size > 0
    ? Math.round((group.team_count / group.lobby_size) * 100)
    : 0;

  return (
    <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{group.name}</h3>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${
              fillPercent >= 100
                ? 'border-emerald-500/30 text-emerald-400'
                : fillPercent > 0
                ? 'border-amber-500/30 text-amber-400'
                : 'border-zinc-500/30 text-zinc-500'
            }`}
          >
            {group.team_count}/{group.lobby_size}
          </Badge>
          {isLocked && <Lock className="w-3 h-3 text-zinc-500" />}
        </div>
        {!isLocked && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmDelete(true)}
            disabled={isDeleting}
            className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Fill Bar */}
      <div className="mx-4 mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            fillPercent >= 100 ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
          style={{ width: `${Math.min(100, fillPercent)}%` }}
        />
      </div>

      {/* Team List */}
      <div className="p-4 space-y-1.5 max-h-[240px] overflow-y-auto">
        {teamsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <div
              key={team.team_id}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/5 transition-colors"
            >
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                  <Users className="w-3 h-3 text-zinc-500" />
                </div>
              )}
              <span className="text-xs text-zinc-300 truncate">{team.team_name}</span>
              <span className="text-[10px] text-zinc-600 ml-auto">#{team.seed_order}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-600 text-center py-4">No teams assigned</p>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="bg-[#121214] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete {group.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will remove the group and all its team assignments, rounds, and results.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
