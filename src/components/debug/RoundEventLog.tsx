import React from 'react';
import { Bomb, Check, Clock3, Crosshair, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveRoundResultCode, type RoundTimelineEntry } from '@/types/riotMatchDetails';

type ValorantTeamId = 'Blue' | 'Red';
type TeamAlias = 'Team A' | 'Team B';

export interface DebugRoundEventLogRound {
  round: number;
  winningTeam?: string | null;
  resultCode?: string | null;
  result?: string | null;
  plantSite?: string | null;
}

interface RoundEventLogProps {
  rounds: DebugRoundEventLogRound[];
  teamAId?: string | null;
  teamBId?: string | null;
  activeRound?: number | null;
  onSelectRound: (round: number) => void;
  teamAScore?: number;
  teamBScore?: number;
  className?: string;
}

function isValorantTeamId(value?: string | null): value is ValorantTeamId {
  return value === 'Blue' || value === 'Red';
}

function oppositeTeam(team: ValorantTeamId): ValorantTeamId {
  return team === 'Blue' ? 'Red' : 'Blue';
}

export function getTeamAlias(teamId?: string | null, teamAId?: string | null): TeamAlias {
  return teamId && teamAId && teamId === teamAId ? 'Team A' : 'Team B';
}

export function getTeamTone(teamId?: string | null, teamAId?: string | null): 'teamA' | 'teamB' {
  return getTeamAlias(teamId, teamAId) === 'Team A' ? 'teamA' : 'teamB';
}

function getRoundResultGlyph(code?: string | null) {
  if (code === 'Elimination') return Crosshair;
  if (code === 'Detonate') return Bomb;
  if (code === 'Defuse') return ShieldCheck;
  if (code === 'TimeOut') return Clock3;
  return Check;
}

function resultTitle(round: RoundTimelineEntry | DebugRoundEventLogRound): string {
  const result = resolveRoundResultCode(round as RoundTimelineEntry) || 'Round win';
  return [result, round.plantSite ? `Site ${round.plantSite}` : null].filter(Boolean).join(' · ');
}

export const RoundEventLog: React.FC<RoundEventLogProps> = ({
  rounds,
  teamAId,
  teamBId,
  activeRound,
  onSelectRound,
  teamAScore,
  teamBScore,
  className,
}) => {
  const resolvedTeamA = isValorantTeamId(teamAId) ? teamAId : 'Blue';
  const resolvedTeamB = isValorantTeamId(teamBId)
    ? teamBId
    : oppositeTeam(resolvedTeamA);

  const derivedTeamAScore = teamAScore ?? rounds.filter((round) => round.winningTeam === resolvedTeamA).length;
  const derivedTeamBScore = teamBScore ?? rounds.filter((round) => round.winningTeam === resolvedTeamB).length;

  const renderTeamRow = (alias: TeamAlias, teamId: string, score: number) => {
    const isTeamA = alias === 'Team A';

    return (
      <div className="grid min-w-max grid-cols-[120px_repeat(var(--round-count),40px)] items-center gap-1">
        <div className="sticky left-0 z-20 flex h-8 items-center gap-2 bg-[#08131c] pr-3">
          <span className={cn('w-14 text-right text-xs font-bold', isTeamA ? 'text-[#20f5c6]' : 'text-[#ff5b73]')}>
            {alias}
          </span>
          <span className={cn('font-mono text-2xl font-black leading-none', isTeamA ? 'text-[#20f5c6]' : 'text-[#ff5b73]')}>
            {score}
          </span>
        </div>

        {rounds.map((round) => {
          const isWinner = round.winningTeam === teamId;
          const isActive = activeRound === round.round;
          const Icon = getRoundResultGlyph(resolveRoundResultCode(round as RoundTimelineEntry));

          return (
            <button
              key={`${alias}-${round.round}`}
              type="button"
              onClick={() => onSelectRound(round.round)}
              title={`Round ${round.round}: ${isWinner ? `${alias} won` : `${alias} lost`} · ${resultTitle(round)}`}
              className={cn(
                'group relative flex h-8 w-10 items-center justify-center border-b border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30',
                isActive && 'bg-white/[0.055]',
                isActive && isTeamA && 'border-[#20f5c6]',
                isActive && !isTeamA && 'border-[#ff5b73]',
              )}
            >
              {isWinner ? (
                <Icon
                  className={cn(
                    'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                    isTeamA ? 'text-[#67fff0] drop-shadow-[0_0_8px_rgba(32,245,198,0.65)]' : 'text-[#ff687d] drop-shadow-[0_0_8px_rgba(255,91,115,0.55)]',
                  )}
                  strokeWidth={3}
                />
              ) : (
                <span className="h-1 w-1 rounded-full bg-slate-600/55" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  if (!rounds.length) {
    return (
      <div className={cn('border border-white/5 bg-[#08131c] px-5 py-6 text-center text-sm font-bold text-slate-400', className)}>
        No round event log available.
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden border border-white/5 bg-[#08131c] shadow-[0_18px_55px_rgba(0,0,0,0.35)]', className)}>
      <div
        className="scroller-hide overflow-x-auto border-t-2 border-[#ff4655] px-3 py-3"
        style={{ '--round-count': rounds.length } as React.CSSProperties}
      >
        <div className="space-y-1">
          {renderTeamRow('Team A', resolvedTeamA, derivedTeamAScore)}
          {renderTeamRow('Team B', resolvedTeamB, derivedTeamBScore)}
          <div className="grid min-w-max grid-cols-[120px_repeat(var(--round-count),40px)] items-center gap-1 pt-1">
            <div className="sticky left-0 z-20 bg-[#08131c]" />
            {rounds.map((round) => (
              <button
                key={`round-number-${round.round}`}
                type="button"
                onClick={() => onSelectRound(round.round)}
                className={cn(
                  'h-5 w-10 text-center font-mono text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-white/30',
                  activeRound === round.round ? 'text-white' : 'text-sky-200/75 hover:text-white',
                )}
              >
                {round.round}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
