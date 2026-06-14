import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { cn } from '@/lib/utils';
import type { BracketMatch } from '@/types/bracketTypes';

export interface MatchRoomHeroProps {
  tournamentGame?: string;
  slug: string;
  isOrganizerView: boolean;
  activeMatch: BracketMatch | null;
  roundLabel?: string;
  isLive: boolean;
  matchSettled: boolean;
  nextGameNumber: number;
  nextMapName?: string | null;
  partyCode?: string | null;
  onNavigateBack: () => void;
  onCopyPartyCode?: () => void;
}

function statusLabel(isLive: boolean, matchSettled: boolean, status?: string): string {
  if (matchSettled) return 'Series complete';
  if (isLive) return 'Live now';
  if (status === 'pending') return 'Awaiting start';
  if (status === 'completed') return 'Completed';
  return 'Match room';
}

export const MatchRoomHero: React.FC<MatchRoomHeroProps> = ({
  tournamentGame,
  slug,
  isOrganizerView,
  activeMatch,
  roundLabel,
  isLive,
  matchSettled,
  nextGameNumber,
  nextMapName,
  partyCode,
  onNavigateBack,
  onCopyPartyCode,
}) => {
  const team1Name = activeMatch?.team1?.name || 'TBD';
  const team2Name = activeMatch?.team2?.name || 'TBD';
  const team1Score = activeMatch?.team1_score ?? 0;
  const team2Score = activeMatch?.team2_score ?? 0;
  const bestOf = activeMatch?.bestOf || 1;
  const status = statusLabel(isLive, matchSettled, activeMatch?.status);

  return (
    <section className="relative w-full overflow-hidden">
      <div className="absolute inset-0 bg-[#050505]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(244,63,94,0.18),transparent_42%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(16,185,129,0.12),transparent_38%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1180px] flex-col px-4 py-8 md:px-10 md:py-10">
        <div className="flex items-center justify-between gap-4">
          <button type="button"
            className="pl-0 text-zinc-400 hover:text-white"
            onClick={onNavigateBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to tournament
          </button>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-500 sm:block">
            {slug}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="mt-10 flex flex-1 flex-col justify-center"
        >
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <div className="h-px w-10 bg-rose-500" />
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-rose-400">
              {isOrganizerView ? 'Organizer match room' : 'Captain match room'}
            </span>
            {tournamentGame ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                {tournamentGame}
              </span>
            ) : null}
          </div>

          {activeMatch ? (
            <div className="mt-8 grid w-full gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
              <TeamColumn
                name={team1Name}
                logoUrl={activeMatch.team1?.logo_url}
                entityId={activeMatch.team1?.id}
                align="start"
              />

              <div className="flex flex-col items-center gap-4 px-2 text-center">
                <div className="flex items-center gap-2">
                  {isLive && !matchSettled ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">
                      <Radio className="h-3 w-3 animate-pulse" />
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                      {status}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-3 font-heading tabular-nums">
                  <span className="text-5xl font-black text-white md:text-6xl">{team1Score}</span>
                  <span className="text-lg font-light text-zinc-600">:</span>
                  <span className="text-5xl font-black text-white md:text-6xl">{team2Score}</span>
                </div>

                {roundLabel ? (
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-400/90">
                    {roundLabel}
                  </p>
                ) : null}

                <p className="text-xs text-zinc-500">
                  Best of {bestOf}
                  {nextMapName ? ` · Next map ${nextMapName}` : ` · Game ${nextGameNumber}`}
                </p>

                {partyCode ? (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-left">
                      <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
                        Party code
                      </p>
                      <code className="text-lg font-mono font-bold text-white">{partyCode}</code>
                    </div>
                    {onCopyPartyCode ? (
                      <button
                        type="button"
                        onClick={onCopyPartyCode}
                        className="p-2 text-zinc-400 transition-colors hover:text-white"
                        aria-label="Copy party code"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <TeamColumn
                name={team2Name}
                logoUrl={activeMatch.team2?.logo_url}
                entityId={activeMatch.team2?.id}
                align="end"
              />
            </div>
          ) : (
            <p className="mt-8 max-w-xl text-base font-light leading-relaxed text-zinc-400">
              Your bracket run is reflected below. When the next match is assigned, this room becomes
              your live command surface for scheduling, veto, and reporting.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
};

function TeamColumn({
  name,
  logoUrl,
  entityId,
  align,
}: {
  name: string;
  logoUrl?: string | null;
  entityId?: string;
  align: 'start' | 'end';
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'end' ? 'items-center lg:items-end text-center lg:text-right' : 'items-center lg:items-start text-center lg:text-left',
      )}
    >
      <EntityAvatar
        src={logoUrl ?? undefined}
        name={name}
        entityId={entityId}
        type="team"
        size="w-20 h-20 md:w-24 md:h-24"
      />
      <div className="max-w-[16rem]">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Team</p>
        <p
          className="mt-1 font-heading font-bold uppercase leading-tight tracking-tight text-white"
          style={{ fontSize: 'clamp(1.1rem, 2.2vw, 1.75rem)' }}
        >
          {name}
        </p>
      </div>
    </div>
  );
}
