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

const CELL = 'px-3 py-2.5 text-center tabular-nums text-[13px]';
const HEAD = 'px-3 py-2.5 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500';

function PlayerStatRow({ player, isMvp }: { player: ScoreboardPlayer; isMvp: boolean }) {
  const acs = resolvePlayerAcs(player);
  const kd = resolvePlayerKdRatio(player);

  return (
    <tr className="border-t border-white/[0.06] bg-card transition-colors hover:bg-white/[0.03]">
      <td className="px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 overflow-hidden bg-white/[0.04]">
            {player.characterId ? (
              <img
                src={getAgentIcon(player.characterId)}
                loading="lazy"
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <p className="min-w-0 truncate text-sm font-semibold text-white">
            {player.gameName || 'Unknown player'}
            {player.tagLine ? (
              <span className="ml-1 font-normal text-zinc-500">#{player.tagLine}</span>
            ) : null}
          </p>
          {isMvp ? (
            <span className="shrink-0 border border-white/25 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white">
              MVP
            </span>
          ) : null}
        </div>
      </td>
      <td className={cn(CELL, 'font-heading text-sm font-black text-white')}>{formatStat(acs)}</td>
      <td className={cn(CELL, 'text-zinc-200')}>
        {formatStat(player.kills)}
        <span className="px-1 text-zinc-600">/</span>
        {formatStat(player.deaths)}
        <span className="px-1 text-zinc-600">/</span>
        {formatStat(player.assists)}
      </td>
      <td className={cn(CELL, 'hidden text-zinc-300 sm:table-cell')}>{formatStat(kd, 2)}</td>
      <td className={cn(CELL, 'hidden text-zinc-300 sm:table-cell')}>{formatStat(player.adr)}</td>
      <td className={cn(CELL, 'hidden text-zinc-300 md:table-cell')}>{formatPercent(player.hsPct)}</td>
      <td className={cn(CELL, 'hidden text-zinc-300 md:table-cell')}>{formatStat(player.firstBloods)}</td>
    </tr>
  );
}

function TeamScoreboard({
  teamName,
  teamScore,
  won,
  players,
  mvpKey,
}: {
  teamName: string;
  teamScore: number;
  won: boolean;
  players: ScoreboardPlayer[];
  mvpKey: string | null;
}) {
  return (
    <section aria-label={`${teamName} scoreboard`}>
      <div className="flex items-end justify-between gap-3 pb-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{won ? 'Won the map' : 'Team'}</p>
          <p className={cn('truncate font-heading text-lg font-bold tracking-tight', won ? 'text-white' : 'text-zinc-400')}>{teamName}</p>
        </div>
        <span className={cn('shrink-0 font-heading text-3xl font-black leading-none tabular-nums', won ? 'text-white' : 'text-zinc-500')}>
          {teamScore}
        </span>
      </div>

      <div className="overflow-x-auto border border-white/[0.07]">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="bg-background">
              <th scope="col" className={cn(HEAD, 'text-left')}>Player</th>
              <th scope="col" className={HEAD}>ACS</th>
              <th scope="col" className={HEAD}>K / D / A</th>
              <th scope="col" className={cn(HEAD, 'hidden sm:table-cell')}>K/D</th>
              <th scope="col" className={cn(HEAD, 'hidden sm:table-cell')}>ADR</th>
              <th scope="col" className={cn(HEAD, 'hidden md:table-cell')}>HS%</th>
              <th scope="col" className={cn(HEAD, 'hidden md:table-cell')}>FB</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr className="border-t border-white/[0.06] bg-card">
                <td colSpan={7} className="px-3 py-4 text-sm text-zinc-500">No player stats for this team.</td>
              </tr>
            ) : (
              players.map((player, index) => (
                <PlayerStatRow
                  key={player.puuid ?? `${player.gameName}-${index}`}
                  player={player}
                  isMvp={Boolean(mvpKey) && (player.puuid ?? player.gameName) === mvpKey}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function findMvpKey(players: ScoreboardPlayer[]): string | null {
  const [top] = sortByAcs(players);
  if (!top || resolvePlayerAcs(top) === null) return null;
  return top.puuid ?? top.gameName ?? null;
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

  const mvpKey = useMemo(() => findMvpKey(players), [players]);

  return (
    <div className="space-y-6">
      <TeamScoreboard teamName={team1Name} teamScore={team1Score} won={team1Score > team2Score} players={team1Players} mvpKey={mvpKey} />
      <TeamScoreboard teamName={team2Name} teamScore={team2Score} won={team2Score > team1Score} players={team2Players} mvpKey={mvpKey} />
    </div>
  );
};
