/**
 * ScrimTeamHeader
 *
 * Who is managing, in which game, and the one primary action. Replaces the
 * decorative hero and the four stat cards. Prop-driven.
 */

import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { CtaButton } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { GRID_TEXTURE_STYLE } from '../room/roomStyles';

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
    <header className="relative overflow-hidden border border-white/[0.08] bg-white/[0.02] p-4 sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={GRID_TEXTURE_STYLE} />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] font-mono text-[14px] font-semibold text-white/50"
          >
            {team.logoUrl ? <img src={team.logoUrl} alt="" className="h-full w-full object-contain p-1.5" /> : team.name.slice(0, 2).toUpperCase()}
          </span>

          <div className="min-w-0 space-y-1">
            <p className={EYEBROW_CLASS}>My scrims</p>
            {teams.length > 1 ? (
              <Select value={team.id} onValueChange={onTeamChange}>
                <SelectTrigger aria-label="Select team" className={`${TRIGGER} max-w-full truncate font-heading text-[22px] font-black text-white`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <h1 className="truncate font-heading text-[22px] font-black leading-tight text-white">{team.name}</h1>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-zinc-400">
              {games.length > 1 ? (
                <Select value={gameSlug ?? ''} onValueChange={onGameChange}>
                  <SelectTrigger aria-label="Select game" className={`${TRIGGER} w-auto font-mono text-[11px] uppercase tracking-[0.14em] text-white/60`}>
                    <SelectValue placeholder="Game" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((g) => <SelectItem key={g.slug} value={g.slug}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                gameName && <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/60">{gameName}</span>
              )}
              {summary && <span className="tabular-nums">{summary}</span>}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            to="/competitive/practice"
            className="inline-flex min-h-[40px] items-center gap-2 border border-white/[0.12] px-3.5 text-[13px] text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Practice calendar
          </Link>
          <CtaButton onClick={onNewScrim} className="h-10 px-5 text-[13px] font-semibold">
            New scrim
          </CtaButton>
        </div>
      </div>
    </header>
  );
}
