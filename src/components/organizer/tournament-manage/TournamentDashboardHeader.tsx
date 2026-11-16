/**
 * TournamentDashboardHeader.tsx
 *
 * Persistent identity above every panel: logo, phase, name, one meta line,
 * and a small set of actions. Publish is the only loud button and only
 * appears while the tournament is a draft (desktop; mobile uses the sticky bar).
 *
 * PROJ-078: lifecycle actions (Cancel, Mark as Finished, Reopen) and
 * visibility toggle (Make Public / Make Private) added to the action row.
 */

import { useState, type ReactNode } from 'react';
import {
  AlertTriangle, Check, CheckCircle, Copy, Eye, EyeOff, Globe,
  HelpCircle, Lock, RefreshCw, Trophy, X,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CommandButton, CommandIconButton } from '@/components/management/CommandSurface';
import { useToast } from '@/hooks/use-toast';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';
import { formatDashboardDate } from '@/hooks/useTournamentOverviewModel';
import { StatusPill } from '@/components/ui/kit/StatusPill';
import { EYEBROW_CLASS, type Tone } from '@/components/ui/kit/tone';

interface TournamentDashboardHeaderProps {
  tournament: DashboardTournament;
  phaseLabel: string;
  phaseTone: Tone;
  staffSummary?: string | null;
  publishSlot?: ReactNode;
  onOpenTour?: () => void;
  canActAsOwner?: boolean;
  onCancel?: () => Promise<void>;
  onFinish?: () => Promise<void>;
  onReopen?: () => Promise<void>;
  onMakePublic?: () => Promise<void>;
  onMakePrivate?: () => Promise<void>;
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
  onOpenTour,
  canActAsOwner,
  onCancel,
  onFinish,
  onReopen,
  onMakePublic,
  onMakePrivate,
}: TournamentDashboardHeaderProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}/tournaments/${tournament.slug}`;
  const meta = [tournament.game, tournament.is_online === false ? 'LAN' : 'Online', tournament.start_date ? formatDashboardDate(tournament.start_date) : null]
    .filter(Boolean);
  const status = tournament.status;

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
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onOpenTour && (
            <CommandIconButton label="Getting started guide" variant="secondary" onClick={onOpenTour}>
              <HelpCircle aria-hidden />
            </CommandIconButton>
          )}
          <CommandIconButton label={copied ? 'Link copied' : 'Copy public link'} variant="secondary" onClick={() => void copyLink()}>
            {copied ? <Check className="text-emerald-400" aria-hidden /> : <Copy aria-hidden />}
          </CommandIconButton>
          <CommandButton asChild variant="secondary" size="sm" className="gap-2">
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4" aria-hidden />
              View page
            </a>
          </CommandButton>

          {/* Visibility toggle */}
          {canActAsOwner && status !== 'draft' && !tournament.is_public && onMakePublic && (
            <CommandButton onClick={() => void onMakePublic()} variant="primary" size="sm">
              <Globe className="h-4 w-4 mr-2" aria-hidden />
              Make Public
            </CommandButton>
          )}
          {canActAsOwner && status !== 'draft' && tournament.is_public && onMakePrivate && (
            <CommandButton onClick={() => void onMakePrivate()} variant="secondary" size="sm">
              <EyeOff className="h-4 w-4 mr-2" aria-hidden />
              Make Private
            </CommandButton>
          )}

          {/* Reopen — completed or cancelled */}
          {canActAsOwner && (status === 'completed' || status === 'cancelled') && onReopen && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <CommandButton variant="secondary" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
                  Reopen
                </CommandButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-400" />
                    Reopen Tournament
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    This will unlock the tournament and all stages for editing. The winner record will be cleared. Only use this to correct a mistake.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <CommandButton variant="secondary" size="sm">Cancel</CommandButton>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <CommandButton variant="warning" size="sm" onClick={(e) => { e.preventDefault(); void onReopen(); }}>
                      Reopen Tournament
                    </CommandButton>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Mark as Finished — not draft, not already completed */}
          {canActAsOwner && status !== 'completed' && status !== 'draft' && onFinish && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <CommandButton variant="secondary" size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" aria-hidden />
                  Mark as Finished
                </CommandButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-amber-400" />
                    Finish Tournament
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    This will finalize results and lock bracket scores, placements, and stage settings. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <CommandButton variant="secondary" size="sm">Cancel</CommandButton>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <CommandButton variant="danger" size="sm" onClick={(e) => { e.preventDefault(); void onFinish(); }}>
                      Finish Tournament
                    </CommandButton>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {/* Cancel Tournament — not completed, not already cancelled */}
          {canActAsOwner && status !== 'completed' && status !== 'cancelled' && onCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <CommandButton variant="danger" size="sm">
                  <X className="h-4 w-4 mr-2" aria-hidden />
                  Cancel Tournament
                </CommandButton>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Cancel Tournament
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    This will cancel the tournament for all participants. Registered players will be notified. You can reopen later if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <CommandButton variant="secondary" size="sm">Go Back</CommandButton>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <CommandButton variant="danger" size="sm" onClick={(e) => { e.preventDefault(); void onCancel(); }}>
                      Cancel Tournament
                    </CommandButton>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {publishSlot && <div className="hidden w-32 md:block">{publishSlot}</div>}
        </div>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white/[0.07]">
        <div className="h-px w-24 bg-rose-500" />
      </div>
    </header>
  );
}
