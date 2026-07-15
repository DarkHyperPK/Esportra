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

function PlayerStatRow({ player, isEven }: { player: ScoreboardPlayer; isEven: boolean }) {
  const acs = resolvePlayerAcs(player);
  const kd = resolvePlayerKdRatio(player);

  return (
    <tr className={cn(
      'border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]',
      isEven ? 'bg-[#0d1117]' : 'bg-[#111820]',
    )}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md overflow-hidden border border-white/[0.08] bg-zinc-900 shrink-0">
            {player.characterId ? (
              <img
                src={getAgentIcon(player.characterId)}
                loading="lazy"
                alt=""
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <p className="truncate text-sm font-semibold text-zinc-100">
            {player.gameName || 'Unknown'}
            {player.tagLine ? (
              <span className="text-zinc-500 font-medium ml-1">#{player.tagLine}</span>
            ) : null}
          </p>
        </div>
      </td>
      <td className="border-l border-white/[0.06] px-3 py-2.5 text-center tabular-nums text-xs font-bold text-white">{formatStat(acs)}</td>
      <td className="border-l border-white/[0.06] px-3 py-2.5 text-center tabular-nums text-xs font-semibold text-emerald-400">{formatStat(player.kills)}</td>
      <td className="border-l border-white/[0.06] px-3 py-2.5 text-center tabular-nums text-xs font-semibold text-rose-400">{formatStat(player.deaths)}</td>
      <td className="border-l border-white/[0.06] px-3 py-2.5 text-center tabular-nums text-xs font-semibold text-zinc-400">{formatStat(player.assists)}</td>
      <td className="hidden sm:table-cell border-l border-white/[0.06] px-3 py-2.5 text-center tabular-nums text-xs font-semibold text-zinc-300">{formatStat(kd, 2)}</td>
      <td className="hidden sm:table-cell border-l border-white/[0.06] px-3 py-2.5 text-center tabular-nums text-xs font-semibold text-zinc-300">{formatStat(player.adr)}</td>
      <td className="hidden lg:table-cell border-l border-white/[0.06] px-3 py-2.5 text-center tabular-nums text-xs font-semibold text-zinc-300">{formatPercent(player.hsPct)}</td>
      <td className="hidden lg:table-cell border-l border-white/[0.06] px-3 py-2.5 text-center tabular-nums text-xs font-semibold text-zinc-300">{formatStat(player.firstBloods)}</td>
    </tr>
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

      <div className="rounded-lg border border-white/[0.06] bg-[#0d1117] overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[720px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#161b22]">
              <th className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Player</th>
              <th className="border-l border-white/[0.06] px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">ACS</th>
              <th className="border-l border-white/[0.06] px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">K</th>
              <th className="border-l border-white/[0.06] px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">D</th>
              <th className="border-l border-white/[0.06] px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">A</th>
              <th className="hidden sm:table-cell border-l border-white/[0.06] px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">KD</th>
              <th className="hidden sm:table-cell border-l border-white/[0.06] px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">ADR</th>
              <th className="hidden lg:table-cell border-l border-white/[0.06] px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">HS%</th>
              <th className="hidden lg:table-cell border-l border-white/[0.06] px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-widest text-zinc-500">FB</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-xs text-zinc-500">No player statistics available.</td>
              </tr>
            ) : (
              players.map((player, index) => (
                <PlayerStatRow key={player.puuid ?? `${player.gameName}-${index}`} player={player} isEven={index % 2 === 0} />
              ))
            )}
          </tbody>
        </table>
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
