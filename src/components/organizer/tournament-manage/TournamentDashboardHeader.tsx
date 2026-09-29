/**
 * TournamentDashboardHeader.tsx
 *
 * Persistent identity above every panel: logo, phase, name, one meta line,
 * and a small set of actions. Publish is the only loud button and only
 * appears while the tournament is a draft (desktop; mobile uses the sticky bar).
 */

import { useState, type ReactNode } from 'react';
import { Check, Copy, Eye, Trophy } from 'lucide-react';
import { CommandButton, CommandIconButton } from '@/components/management/CommandSurface';
import { useToast } from '@/hooks/use-toast';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';
import { formatDashboardDate } from '@/hooks/useTournamentOverviewModel';
import { StatusPill } from './StatusPill';
import { EYEBROW_CLASS, type Tone } from './tone';

interface TournamentDashboardHeaderProps {
  tournament: DashboardTournament;
  phaseLabel: string;
  phaseTone: Tone;
  staffSummary?: string | null;
  publishSlot?: ReactNode;
}

function LogoMark({ src }: { src?: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden border border-white/10 bg-black/40 sm:h-14 sm:w-14">
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Trophy className="h-6 w-6 text-zinc-500" aria-hidden />
        </div>
      )}
    </div>
  );
}

export function TournamentDashboardHeader({
  tournament,
  phaseLabel,
  phaseTone,
  staffSummary,
  publishSlot,
}: TournamentDashboardHeaderProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/tournaments/${tournament.slug}`;
  const meta = [tournament.game, tournament.is_online === false ? 'LAN' : 'Online', tournament.start_date ? formatDashboardDate(tournament.start_date) : null]
    .filter(Boolean);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: 'Copy failed', description: 'Copy the link from the public page instead.', variant: 'destructive' });
    }
  };

  return (
    <header className="relative pb-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <LogoMark src={tournament.logo_url} />
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-3">
              <span className={EYEBROW_CLASS}>Tournament control</span>
              <StatusPill label={phaseLabel} tone={phaseTone} />
            </div>
            <h1 className="font-heading text-2xl font-black leading-[1.08] tracking-tight text-white sm:text-3xl xl:text-4xl">
              {tournament.name}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-zinc-400">
              {meta.map((item, index) => (
                <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                  {index > 0 && <span aria-hidden className="text-zinc-700">/</span>}
                  {item}
                </span>
              ))}
            </p>
            {staffSummary && (
              <p className="mt-2 text-xs text-zinc-500">
                Staff access · <span className="text-zinc-300">{staffSummary}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CommandIconButton label={copied ? 'Link copied' : 'Copy public link'} variant="secondary" onClick={() => void copyLink()}>
            {copied ? <Check className="text-emerald-400" aria-hidden /> : <Copy aria-hidden />}
          </CommandIconButton>
          <CommandButton asChild variant="secondary" size="sm" className="gap-2">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4" aria-hidden />
              View page
            </a>
          </CommandButton>
          {publishSlot && <div className="hidden w-32 md:block">{publishSlot}</div>}
        </div>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white/[0.07]">
        <div className="h-px w-24 bg-rose-500" />
      </div>
    </header>
  );
}
