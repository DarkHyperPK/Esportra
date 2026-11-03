/**
 * ScrimFaceOff
 *
 * The scrim room's scoreboard header, laid out like a broadcast bar: your team on the left edge, the opponent on
 * the right, the series score in the middle with one block per map needed to win. Status is plain text with a
 * dot, not a pill. Square corners, stage black, the rose cue only for "live" and for your side. Prop-driven.
 */

import { GameLogoImage } from '@/components/games/GameLogoImage';
import { cn } from '@/lib/utils';
import { bestOfLongLabel, normalizeBestOf, winsNeeded } from '@/services/scrimUtils';
import { sessionStatusMeta } from '@/services/scrimStatusMeta';
import type { ScrimSessionStatus } from '@/types/competitive';

export interface FaceOffTeam {
  /** Stable identity (team id) for generated key art. */
  id: string;
  name: string;
  logoUrl: string | null;
  isMine: boolean;
  checkedIn: boolean;
}

interface ScrimFaceOffProps {
  team1: FaceOffTeam;
  team2: FaceOffTeam;
  status: ScrimSessionStatus;
  gameSlug: string | null;
  gameName: string | null;
  gameLogo?: string | null;
  bestOf: number | null | undefined;
  /** Pre-formatted local time, e.g. "Mon, Nov 2 · 8:00 PM". */
  when: string;
  /** Maps won by each team once a result exists. */
  score: { team1: number; team2: number } | null;
  /** Show check-in state only while teams can still check in. */
  showCheckin: boolean;
}

function Crest({ team }: { team: FaceOffTeam }) {
  return team.logoUrl ? (
    <img src={team.logoUrl} alt="" className="h-12 w-12 shrink-0 border border-white/10 object-cover sm:h-16 sm:w-16" />
  ) : (
    <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center border border-white/10 bg-white/[0.04] font-mono text-[14px] font-semibold text-white/60 sm:h-16 sm:w-16">
      {team.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function Side({ team, align, showCheckin, dim }: { team: FaceOffTeam; align: 'left' | 'right'; showCheckin: boolean; dim: boolean }) {
  const right = align === 'right';
  return (
    <div className={cn('flex min-w-0 items-center gap-3 sm:gap-4', right && 'flex-row-reverse text-right')}>
      <Crest team={team} />
      <div className="min-w-0">
        <p className={cn('truncate font-heading text-[16px] font-bold uppercase tracking-wide sm:text-[22px]', dim ? 'text-white/40' : 'text-white')}>{team.name}</p>
        <p className={cn('mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]', team.isMine ? 'text-rose-400' : 'text-zinc-500')}>
          {team.isMine ? 'Your team' : 'Opponent'}
          {showCheckin && <span className={cn('ml-2 normal-case tracking-normal', team.checkedIn ? 'text-emerald-300' : 'text-zinc-500')}>{team.checkedIn ? 'Checked in' : 'Not yet'}</span>}
        </p>
      </div>
    </div>
  );
}

/** One block per map needed to win the series, filled as maps are won, from the outside in towards the score. */
function SeriesBlocks({ won, need, mine, reverse }: { won: number; need: number; mine: boolean; reverse?: boolean }) {
  return (
    <span aria-hidden="true" className={cn('flex gap-1', reverse && 'flex-row-reverse')}>
      {Array.from({ length: need }, (_, i) => (
        <span key={i} className={cn('h-1.5 w-5 sm:w-7', i < won ? (mine ? 'bg-rose-500' : 'bg-white') : 'bg-white/10')} />
      ))}
    </span>
  );
}

export function ScrimFaceOff({ team1, team2, status, gameSlug, gameName, gameLogo, bestOf, when, score, showCheckin }: ScrimFaceOffProps) {
  const bo = normalizeBestOf(bestOf);
  const need = winsNeeded(bo);
  const meta = sessionStatusMeta(status);
  const dim = status === 'cancelled';
  const live = status === 'in_progress';

  return (
    <header className={cn('relative border border-white/[0.08] bg-[#0a0a0c]', live && 'border-t-2 border-t-rose-500')}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/[0.06] px-4 py-2.5 sm:px-6">
        {gameSlug && (
          <span className="inline-flex items-center gap-2">
            <GameLogoImage gameName={gameSlug} catalogLogo={gameLogo ?? undefined} className="h-4 w-4 object-contain" />
            <span className="text-[12px] font-semibold text-white/80">{gameName ?? gameSlug}</span>
          </span>
        )}
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">5v5 · {bestOfLongLabel(bo)}</span>
        {when && <span className="text-[12px] tabular-nums text-white/60">{when}</span>}
        <span className={cn('ml-auto inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]', live ? 'text-rose-400' : 'text-white/60')}>
          <span aria-hidden="true" className={cn('h-1.5 w-1.5', live ? 'animate-pulse bg-rose-500 motion-reduce:animate-none' : 'bg-white/40')} />
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-5 sm:gap-8 sm:px-6 sm:py-7">
        <Side team={team1} align="left" showCheckin={showCheckin} dim={dim} />
        <div className="flex flex-col items-center gap-2">
          {score ? (
            <p className="font-heading text-[30px] font-black leading-none tabular-nums tracking-tight text-white sm:text-[44px]" aria-label={`Series ${score.team1} to ${score.team2}`}>
              {score.team1}<span className="px-2 text-white/25 sm:px-3">:</span>{score.team2}
            </p>
          ) : (
            <p className="font-mono text-[13px] tracking-[0.3em] text-white/30">VS</p>
          )}
          <span className="flex items-center gap-3">
            <SeriesBlocks won={score?.team1 ?? 0} need={need} mine={team1.isMine} reverse />
            <SeriesBlocks won={score?.team2 ?? 0} need={need} mine={team2.isMine} />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">First to {need}</p>
        </div>
        <Side team={team2} align="right" showCheckin={showCheckin} dim={dim} />
      </div>
    </header>
  );
}
