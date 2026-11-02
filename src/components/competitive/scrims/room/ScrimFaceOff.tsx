/**
 * ScrimFaceOff
 *
 * Header for the scrim room: both teams head to head, series format, time and,
 * before the match, who has checked in. Prop-driven; the page resolves names.
 */

import { Check } from 'lucide-react';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { StatusPill } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { bestOfLongLabel, normalizeBestOf, winsNeeded } from '@/services/scrimUtils';
import { sessionStatusMeta } from '@/services/scrimStatusMeta';
import type { ScrimSessionStatus } from '@/types/competitive';

export interface FaceOffTeam {
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
  /** "2 – 1" once a result exists. */
  score: string | null;
  /** Show check-in chips only while teams can still check in. */
  showCheckin: boolean;
}

function Crest({ team }: { team: FaceOffTeam }) {
  return team.logoUrl ? (
    <img src={team.logoUrl} alt="" className="h-16 w-16 rounded-full border border-white/10 object-cover sm:h-20 sm:w-20" />
  ) : (
    <span
      aria-hidden="true"
      className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] font-mono text-[16px] font-semibold text-white/60 sm:h-20 sm:w-20"
    >
      {team.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function TeamColumn({ team, showCheckin, dim }: { team: FaceOffTeam; showCheckin: boolean; dim: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <Crest team={team} />
      <p className={cn('max-w-full truncate font-heading text-[17px] font-bold sm:text-[20px]', dim ? 'text-white/40' : 'text-white')}>
        {team.name}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
        {team.isMine ? 'Your team' : 'Opponent'}
      </p>
      {showCheckin && (
        <p
          className={cn(
            'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em]',
            team.checkedIn ? 'text-emerald-300' : 'text-zinc-500',
          )}
        >
          {team.checkedIn && <Check className="h-3 w-3" aria-hidden="true" />}
          {team.checkedIn ? 'Checked in' : 'Not yet'}
        </p>
      )}
    </div>
  );
}

export function ScrimFaceOff({
  team1, team2, status, gameSlug, gameName, gameLogo, bestOf, when, score, showCheckin,
}: ScrimFaceOffProps) {
  const bo = normalizeBestOf(bestOf);
  const meta = sessionStatusMeta(status);
  const dim = status === 'cancelled';

  return (
    <header className="relative overflow-hidden border border-white/[0.08] bg-white/[0.02] px-4 py-6 sm:px-8 sm:py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      <div className="relative space-y-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {gameSlug && (
            <span className="inline-flex items-center gap-2">
              <GameLogoImage gameName={gameSlug} catalogLogo={gameLogo ?? undefined} className="h-5 w-5 object-contain" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">{gameName ?? gameSlug}</span>
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
            5v5 · {bestOfLongLabel(bo)} · first to {winsNeeded(bo)}
          </span>
          {when && <span className="text-[13px] font-medium tabular-nums text-white/70">{when}</span>}
          <span className="ml-auto">
            <StatusPill label={meta.label} tone={meta.tone} />
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 sm:gap-8">
          <TeamColumn team={team1} showCheckin={showCheckin} dim={dim} />
          <div className="flex min-h-16 items-center sm:min-h-20">
            {score ? (
              <span className="font-heading text-[28px] font-black tabular-nums tracking-tight text-white sm:text-[40px]">{score}</span>
            ) : (
              <span className="font-mono text-[12px] tracking-[0.3em] text-white/25">VS</span>
            )}
          </div>
          <TeamColumn team={team2} showCheckin={showCheckin} dim={dim} />
        </div>
      </div>
    </header>
  );
}
