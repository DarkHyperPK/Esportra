import React from 'react';
import { useBRGroupTeams } from '@/hooks/useBRGroups';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Users, Lock } from 'lucide-react';
import type { BRGroup } from '@/types/brGroups';

interface GroupCardProps {
  group: BRGroup;
  stageId: string;
  onDelete: () => void;
  isDeleting: boolean;
  isLocked: boolean;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  stageId,
  onDelete,
  isDeleting,
  isLocked,
}) => {
  const { data: teams, isLoading } = useBRGroupTeams(stageId, group.id);
  const fillPercent = Math.round((group.team_count / group.lobby_size) * 100);

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
            onClick={onDelete}
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
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-7 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : teams && teams.length > 0 ? (
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
    </div>
  );
};
