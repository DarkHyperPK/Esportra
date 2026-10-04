import { useMemo } from 'react';
import { ScanText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useValorantAgents } from '@/hooks/useValorantCatalog';
import { valorantMapSplash } from '@/services/maps/valorantMapAssets';
import { pickMvpKey, presentColumns, rankByImpact } from '@/services/scoreboardOcr';
import type { ScoreboardPlayer } from '@/types/scoreboardPlayer';
import { OcrTeamTable } from './OcrTeamTable';

interface Props {
  players: ScoreboardPlayer[];
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  mapName?: string;
}

/** Match scoreboard for a result read from the in-game screenshot: only the stats that screen shows. */
export function OcrMatchScoreboard({ players, team1Name, team2Name, team1Score, team2Score, mapName }: Props) {
  const agents = useValorantAgents();
  const { team1, team2, columns, mvpKey } = useMemo(() => ({
    team1: rankByImpact(players.filter((p) => p.isTeam1 ?? p.teamId === 'Blue')),
    team2: rankByImpact(players.filter((p) => !(p.isTeam1 ?? p.teamId === 'Blue'))),
    columns: presentColumns(players),
    mvpKey: pickMvpKey(players),
  }), [players]);
  const splash = mapName ? valorantMapSplash(mapName) : null;
  const team1Won = team1Score > team2Score;

  return (
    <div className="overflow-hidden border border-white/[0.07] bg-card">
      <header className="relative isolate overflow-hidden border-b border-white/[0.07] px-4 py-5 sm:px-6">
        {splash ? <img src={splash} alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" /> : null}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">
              <ScanText className="h-3.5 w-3.5 text-rose-400" aria-hidden />Match scoreboard · from screenshot
            </p>
            <h3 className="mt-1 truncate font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">{mapName || 'Map'}</h3>
          </div>
          <p className="font-heading text-4xl font-black leading-none tabular-nums sm:text-5xl" aria-label={`${team1Name} ${team1Score}, ${team2Name} ${team2Score}`}>
            <span className={cn(team1Won ? 'text-emerald-400' : 'text-zinc-500')}>{team1Score}</span>
            <span className="px-2 text-zinc-700">–</span>
            <span className={cn(!team1Won ? 'text-red-400' : 'text-zinc-500')}>{team2Score}</span>
          </p>
        </div>
      </header>
      <div className="space-y-6 p-3 sm:p-5">
        <OcrTeamTable teamName={team1Name} score={team1Score} won={team1Won} tone="team1" players={team1} columns={columns} mvpKey={mvpKey} agents={agents.data ?? {}} />
        <OcrTeamTable teamName={team2Name} score={team2Score} won={!team1Won} tone="team2" players={team2} columns={columns} mvpKey={mvpKey} agents={agents.data ?? {}} />
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          Read from the in-game scoreboard. ACS, ADR and headshot % are not on that screen.
        </p>
      </div>
    </div>
  );
}
