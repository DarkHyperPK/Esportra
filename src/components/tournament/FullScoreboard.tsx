import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getAgentIcon } from '@/components/tournament/fullScoreboardConstants';
import {
  formatPercent,
  formatStat,
  resolvePlayerAcs,
  resolvePlayerKdRatio,
  type RiotTeamSide,
  type ScoreboardPlayer,
} from '@/types/scoreboardPlayer';

export interface FullScoreboardProps {
  players?: ScoreboardPlayer[];
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  reporterSide?: RiotTeamSide;
  reportedByTeamId?: string;
  team1Id?: string;
  t1Side?: RiotTeamSide;
}

function isTeam1RiotPlayer(player: ScoreboardPlayer, isTeam1Blue: boolean): boolean {
  const teamId = player.teamId;
  if (isTeam1Blue) {
    return teamId === 'Blue' || teamId === 1200;
  }
  return teamId === 'Red' || teamId === 1100;
}

function sortByAcs(players: ScoreboardPlayer[]): ScoreboardPlayer[] {
  return [...players].sort((left, right) => {
    const leftAcs = resolvePlayerAcs(left) ?? 0;
    const rightAcs = resolvePlayerAcs(right) ?? 0;
    return rightAcs - leftAcs;
  });
}

function StatCell({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span className={cn('tabular-nums text-xs font-semibold text-zinc-300', className)}>
      {value}
    </span>
  );
}

function PlayerStatRow({ player }: { player: ScoreboardPlayer }) {
  const acs = resolvePlayerAcs(player);
  const kd = resolvePlayerKdRatio(player);

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_repeat(5,2.25rem)] sm:grid-cols-[auto_minmax(0,1fr)_repeat(8,2.25rem)] lg:grid-cols-[auto_minmax(0,1fr)_repeat(9,2.5rem)] items-center gap-x-2 gap-y-1 px-3 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition-colors">
      <div className="w-8 h-8 rounded-md overflow-hidden border border-white/10 bg-zinc-900 shrink-0">
        {player.characterId ? (
          <img
            src={getAgentIcon(player.characterId)}
            loading="lazy"
            alt=""
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-100">
          {player.gameName || 'Unknown'}
          {player.tagLine ? (
            <span className="text-zinc-500 font-medium ml-1">#{player.tagLine}</span>
          ) : null}
        </p>
      </div>

      <StatCell value={formatStat(acs)} className="text-white font-bold" />
      <StatCell value={formatStat(player.kills)} className="text-emerald-400" />
      <StatCell value={formatStat(player.deaths)} className="text-rose-400" />
      <StatCell value={formatStat(player.assists)} className="text-zinc-400" />
      <StatCell value={formatStat(kd, 2)} className="hidden sm:block" />
      <StatCell value={formatStat(player.adr)} className="hidden sm:block" />
      <StatCell value={formatPercent(player.hsPct)} className="hidden lg:block" />
      <StatCell value={formatStat(player.firstBloods)} className="hidden lg:block" />
    </div>
  );
}

function TeamScoreboard({
  teamName,
  teamScore,
  players,
}: {
  teamName: string;
  teamScore: number;
  players: ScoreboardPlayer[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 truncate pr-3">
          {teamName}
        </span>
        <span className="text-lg font-black tabular-nums text-white shrink-0">{teamScore}</span>
      </div>

      <div className="rounded-xl border border-white/5 bg-zinc-950/40 overflow-x-auto">
        <div className="min-w-[720px]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_repeat(5,2.25rem)] sm:grid-cols-[auto_minmax(0,1fr)_repeat(8,2.25rem)] lg:grid-cols-[auto_minmax(0,1fr)_repeat(9,2.5rem)] gap-x-2 px-3 py-2 border-b border-white/10 bg-black/30">
          <span className="col-span-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
            Player
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-center">
            ACS
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-center">
            K
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-center">
            D
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-center">
            A
          </span>
          <span className="hidden sm:block text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-center">
            KD
          </span>
          <span className="hidden sm:block text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-center">
            ADR
          </span>
          <span className="hidden lg:block text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-center">
            HS%
          </span>
          <span className="hidden lg:block text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-center">
            FB
          </span>
        </div>

        {players.length === 0 ? (
          <p className="px-3 py-4 text-xs text-zinc-500">No player statistics available.</p>
        ) : (
          players.map((player, index) => (
            <PlayerStatRow key={player.puuid ?? `${player.gameName}-${index}`} player={player} />
          ))
        )}
        </div>
      </div>
    </div>
  );
}

export const FullScoreboard: React.FC<FullScoreboardProps> = ({
  players = [],
  team1Name,
  team2Name,
  team1Score,
  team2Score,
  reporterSide,
  reportedByTeamId,
  team1Id,
  t1Side,
}) => {
  const { team1Players, team2Players } = useMemo(() => {
    let isTeam1Blue = true;

    if (t1Side) {
      isTeam1Blue = t1Side === 'Blue';
    } else if (reporterSide && reportedByTeamId && team1Id) {
      const isReporterTeam1 =
        String(reportedByTeamId).toLowerCase() === String(team1Id).toLowerCase();
      isTeam1Blue = isReporterTeam1 ? reporterSide === 'Blue' : reporterSide === 'Red';
    }

    const team1 = sortByAcs(players.filter((player) => isTeam1RiotPlayer(player, isTeam1Blue)));
    const team2 = sortByAcs(
      players.filter((player) => !isTeam1RiotPlayer(player, isTeam1Blue)),
    );

    return { team1Players: team1, team2Players: team2 };
  }, [players, reporterSide, reportedByTeamId, team1Id, t1Side]);

  return (
    <div className="space-y-5 py-1 overflow-x-auto">
      <TeamScoreboard teamName={team1Name} teamScore={team1Score} players={team1Players} />
      <TeamScoreboard teamName={team2Name} teamScore={team2Score} players={team2Players} />
    </div>
  );
};
