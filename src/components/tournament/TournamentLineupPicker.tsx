import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getRosterLimits } from '@/utils/gameFeatures';
import {
  resolveMemberRosterRole,
  type TournamentLineupSelection,
  validateTournamentLineupSelection,
} from '@/utils/rosterEligibility';

export interface TournamentLineupMember {
  user_id: string;
  profile?: {
    username?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    riot_tag?: string | null;
  } | null;
  riot_tag_fallback?: string | null;
  is_captain?: boolean;
  is_verified?: boolean;
}

interface TournamentLineupPickerProps {
  game: string;
  modeKey?: string | null;
  members: TournamentLineupMember[];
  selections: TournamentLineupSelection;
  onChange: (next: TournamentLineupSelection) => void;
  assistedReportingEnabled?: boolean;
}

const TournamentLineupPicker: React.FC<TournamentLineupPickerProps> = ({
  game,
  modeKey,
  members,
  selections,
  onChange,
  assistedReportingEnabled = false,
}) => {
  const limits = getRosterLimits(game, modeKey);
  const poolMembers = members.filter((member) => resolveMemberRosterRole(member) !== 'coach');
  const validation = validateTournamentLineupSelection(selections, game, modeKey);

  const setRole = (userId: string, role: 'starter' | 'substitute' | null) => {
    const next = { ...selections, [userId]: role };
    if (role === null) {
      delete next[userId];
    }
    onChange(next);
  };

  const starterCount = Object.values(selections).filter((role) => role === 'starter').length;
  const subCount = Object.values(selections).filter((role) => role === 'substitute').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tournament Lineup</span>
        <span className="text-[10px] text-gray-500">
          {starterCount}/{limits.starters} starters · {subCount}/{limits.maxSubstitutes} subs
        </span>
      </div>
      <p className="text-[11px] text-gray-500">
        Pick players from your roster pool for this tournament. Your permanent roster lineup is not changed.
      </p>
      <div className="space-y-2 max-h-[240px] overflow-y-auto overscroll-contain custom-scrollbar pr-2" data-lenis-prevent>
        {poolMembers.map((member) => {
          const selectedRole = selections[member.user_id] ?? null;
          const displayName = member.profile?.username || member.profile?.full_name || 'Player';
          return (
            <div
              key={member.user_id}
              className="flex items-center justify-between gap-2 p-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                  {displayName[0] || '?'}
                </div>
                <div className="min-w-0">
                  <span className="text-sm text-white font-medium flex items-center gap-1.5 truncate">
                    {displayName}
                    {member.is_captain && (
                      <Badge className="bg-[#1a1a1a] text-blue-400 border-blue-500/20 text-[8px] h-3.5 px-1 uppercase">
                        Cap
                      </Badge>
                    )}
                  </span>
                  {assistedReportingEnabled && (
                    <span className="text-[10px] text-gray-500 truncate block">
                      {member.profile?.riot_tag || member.riot_tag_fallback || 'No Riot ID'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {(['starter', 'substitute', null] as const).map((role) => {
                  const label = role === 'starter' ? 'ST' : role === 'substitute' ? 'SUB' : '—';
                  const isActive = selectedRole === role;
                  const disabled = role === 'starter'
                    ? !isActive && starterCount >= limits.starters
                    : role === 'substitute'
                      ? !isActive && subCount >= limits.maxSubstitutes
                      : false;
                  return (
                    <button
                      key={label}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (isActive) {
                          setRole(member.user_id, null);
                          return;
                        }
                        if (role !== null) setRole(member.user_id, role);
                      }}
                      className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded border transition-colors ${
                        isActive
                          ? role === 'starter'
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : role === 'substitute'
                              ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                              : 'border-[#3a3a3a] bg-[#151515] text-gray-400'
                          : 'border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] disabled:opacity-40 disabled:cursor-not-allowed'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {!validation.valid && Object.keys(selections).length > 0 && (
        <p className="text-xs text-amber-300">{validation.error}</p>
      )}
    </div>
  );
};

export default TournamentLineupPicker;

export function isTournamentLineupComplete(
  selections: TournamentLineupSelection,
  game: string,
  modeKey?: string | null,
): boolean {
  return validateTournamentLineupSelection(selections, game, modeKey).valid;
}
