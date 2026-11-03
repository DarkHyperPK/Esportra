/**
 * ScrimTeamHeader
 *
 * The page header for managing scrims: which team and game, a one-line summary,
 * and the two things a captain does from here. A plain header, no card or texture.
 */

import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays } from 'lucide-react';
import { AccentButton } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface HeaderTeam {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface ScrimTeamHeaderProps {
  team: HeaderTeam;
  teams: HeaderTeam[];
  onTeamChange: (id: string) => void;
  games: Array<{ slug: string; name: string }>;
  gameSlug: string | null;
  onGameChange: (slug: string) => void;
  /** e.g. "2 upcoming · 14 played"; empty while loading. */
  summary: string;
  onNewScrim: () => void;
}

const TRIGGER =
  'h-auto border-none bg-transparent px-0 py-0 shadow-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-white/40';

export function ScrimTeamHeader({
  team, teams, onTeamChange, games, gameSlug, onGameChange, summary, onNewScrim,
}: ScrimTeamHeaderProps) {
  const gameName = games.find((g) => g.slug === gameSlug)?.name ?? gameSlug?.toUpperCase() ?? null;

  return (
    <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800 font-mono text-[14px] font-semibold text-white/60"
        >
          {team.logoUrl ? <img src={team.logoUrl} alt="" className="h-full w-full object-contain p-1.5" /> : team.name.slice(0, 2).toUpperCase()}
        </span>

        <div className="min-w-0">
          {teams.length > 1 ? (
            <Select value={team.id} onValueChange={onTeamChange}>
              <SelectTrigger aria-label="Select team" className={`${TRIGGER} max-w-full truncate font-heading text-[24px] font-bold text-white`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <h1 className="truncate font-heading text-[24px] font-bold leading-tight text-white">{team.name}</h1>
          )}

          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-zinc-400">
            <span className="font-medium text-zinc-300">Scrims</span>
            {games.length > 1 ? (
              <Select value={gameSlug ?? ''} onValueChange={onGameChange}>
                <SelectTrigger aria-label="Select game" className={`${TRIGGER} w-auto text-[13px] text-zinc-400`}>
                  <SelectValue placeholder="Game" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((g) => <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              gameName && <span>{gameName}</span>
            )}
            {summary && <span className="tabular-nums">{summary}</span>}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to={`/competitive/scrims/data?team_id=${team.id}`}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.14] px-4 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Your scrims data
        </Link>
        <Link
          to="/competitive/scrims/calendar"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.14] px-4 text-[13px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          Calendar
        </Link>
        <AccentButton onClick={onNewScrim} className="h-10 rounded-lg px-5 text-[13px] font-semibold normal-case tracking-normal">
          New scrim
        </AccentButton>
      </div>
    </header>
  );
}
