import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getAgentIcon } from '@/components/tournament/fullScoreboardConstants';
import type { ValorantAgent } from '@/hooks/useValorantCatalog';
import { plusMinus, type OcrViewColumn } from '@/services/scoreboardOcr';
import { formatStat, resolvePlayerKdRatio, type ScoreboardPlayer } from '@/types/scoreboardPlayer';

interface Props {
  teamName: string;
  score: number;
  won: boolean;
  tone: 'team1' | 'team2';
  players: ScoreboardPlayer[];
  columns: OcrViewColumn[];
  mvpKey: string | null;
  agents: Record<string, ValorantAgent>;
}

const LABELS: Record<OcrViewColumn, string> = { firstBloods: 'FB', plants: 'Plants', defuses: 'Defuses' };
const HEAD = 'px-2 py-2 sm:px-3 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500';
const CELL = 'px-2 py-2.5 sm:px-3 text-center text-[13px] tabular-nums';
const ACCENT = { team1: 'bg-emerald-400', team2: 'bg-red-400' } as const;
const ICON_TINT = { team1: 'bg-emerald-400/15', team2: 'bg-red-400/15' } as const;

function AgentPortrait({ player, agent, tone }: { player: ScoreboardPlayer; agent?: ValorantAgent; tone: Props['tone'] }) {
  const [failed, setFailed] = useState(false);
  const id = player.characterId ? String(player.characterId).toLowerCase() : null;
  return (
    <div className={cn('h-8 w-8 shrink-0 overflow-hidden sm:h-10 sm:w-10', ICON_TINT[tone])}>
      {id && !failed ? (
        <img src={agent?.displayIcon ?? getAgentIcon(id)} alt={agent?.displayName ?? ''} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

function PlayerRow({ player, agent, tone, columns, isMvp }: { player: ScoreboardPlayer; agent?: ValorantAgent; tone: Props['tone']; columns: OcrViewColumn[]; isMvp: boolean }) {
  const diff = plusMinus(player);
  const kd = resolvePlayerKdRatio(player);
  return (
    <tr className={cn('border-t border-white/[0.06] transition-colors hover:bg-white/[0.03]', isMvp ? 'bg-white/[0.04]' : 'bg-card')}>
      <td className="py-2 pl-2 pr-2 sm:pr-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <AgentPortrait player={player} agent={agent} tone={tone} />
          <div className="min-w-0 max-w-[7.5rem] sm:max-w-none">
            <p className="flex items-center gap-2 truncate text-sm font-semibold text-white">
              <span className="truncate">{player.gameName || 'Unknown player'}</span>
              {isMvp ? <span className="shrink-0 bg-rose-500 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white">MVP</span> : null}
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{agent?.displayName ?? (player.characterId ? 'Agent' : 'Agent not read')}</p>
          </div>
        </div>
      </td>
      <td className={cn(CELL, 'font-heading text-[15px] font-black text-white')}>
        {formatStat(player.kills)}<span className="px-0.5 text-zinc-600 sm:px-1">/</span>{formatStat(player.deaths)}<span className="px-0.5 text-zinc-600 sm:px-1">/</span>{formatStat(player.assists)}
      </td>
      <td className={cn(CELL, 'hidden sm:table-cell', kd !== null && kd >= 1 ? 'text-emerald-400' : 'text-red-400')}>{formatStat(kd, 2)}</td>
      <td className={cn(CELL, 'font-semibold', diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-zinc-500')}>{diff > 0 ? `+${diff}` : diff}</td>
      {columns.map((key) => (
        <td key={key} className={cn(CELL, 'hidden text-zinc-300 md:table-cell')}>{formatStat(player[key])}</td>
      ))}
    </tr>
  );
}

/** One team's half of a screenshot scoreboard. */
export function OcrTeamTable({ teamName, score, won, tone, players, columns, mvpKey, agents }: Props) {
  return (
    <section aria-label={`${teamName} scoreboard`} className="relative pl-3">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', ACCENT[tone], !won && 'opacity-40')} />
      <div className="flex items-end justify-between gap-3 pb-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{won ? 'Won the map' : 'Lost the map'}</p>
          <p className={cn('truncate font-heading text-lg font-bold tracking-tight', won ? 'text-white' : 'text-zinc-400')}>{teamName}</p>
        </div>
        <span className={cn('shrink-0 font-heading text-3xl font-black leading-none tabular-nums', won ? 'text-white' : 'text-zinc-500')}>{score}</span>
      </div>
      <div className="overflow-x-auto border border-white/[0.07]">
        <table className="w-full min-w-[300px] border-collapse text-left">
          <thead>
            <tr className="bg-background">
              <th scope="col" className={cn(HEAD, 'text-left')}>Player</th>
              <th scope="col" className={HEAD}>K / D / A</th>
              <th scope="col" className={cn(HEAD, 'hidden sm:table-cell')}>K/D</th>
              <th scope="col" className={HEAD}>+/-</th>
              {columns.map((key) => <th key={key} scope="col" className={cn(HEAD, 'hidden md:table-cell')}>{LABELS[key]}</th>)}
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <PlayerRow
                key={player.puuid ?? `${player.gameName}-${index}`}
                player={player}
                agent={player.characterId ? agents[String(player.characterId).toLowerCase()] : undefined}
                tone={tone}
                columns={columns}
                isMvp={Boolean(mvpKey) && (player.puuid ?? player.gameName) === mvpKey}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
