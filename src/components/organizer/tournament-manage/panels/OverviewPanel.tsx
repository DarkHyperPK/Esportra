/**
 * OverviewPanel.tsx
 *
 * Tournament overview panel. Shows key stats and status information.
 */

import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  CommandHeader,
  CommandSection,
} from '@/components/management/CommandSurface';
import { formatCurrency } from '@/utils/formatCurrency';
import type { DashboardTournament, DashboardParticipant, DashboardStage } from '@/hooks/useTournamentDashboard';

interface OverviewPanelProps {
  tournament: DashboardTournament;
  participants: DashboardParticipant[];
  stages: DashboardStage[];
  canActAsOwner: boolean;
  isBattleRoyale: boolean;
}

function registrationLabel(tournament: DashboardTournament): { label: string; tone: 'success' | 'warning' | 'neutral' } {
  if (tournament.status === 'draft') return { label: 'Draft', tone: 'warning' };
  if (tournament.status === 'completed') return { label: 'Closed', tone: 'neutral' };
  if (tournament.registration_open) return { label: 'Open', tone: 'success' };
  if (tournament.registration_deadline && new Date(tournament.registration_deadline) <= new Date()) {
    return { label: 'Deadline Passed', tone: 'neutral' };
  }
  return { label: 'Closed', tone: 'neutral' };
}

export function OverviewPanel({
  tournament,
  participants,
  stages,
  canActAsOwner,
  isBattleRoyale,
}: OverviewPanelProps) {
  const navigate = useNavigate();
  const currentCount = tournament.current_participants ?? participants.length;
  const maxCount = tournament.max_participants ?? tournament.max_teams ?? 0;
  const prizePool = parseFloat(tournament.prize_pool || '0');
  const registration = registrationLabel(tournament);

  const toneClass = (tone: 'success' | 'warning' | 'neutral' | 'danger') => {
    if (tone === 'success') return 'text-emerald-300';
    if (tone === 'warning') return 'text-amber-300';
    if (tone === 'danger') return 'text-red-300';
    return 'text-white';
  };

  return (
    <>
      <CommandHeader
        eyebrow="OPERATIONS"
        title="Overview"
        description="Tournament status and key metrics."
      />

      {/* Setup prompt */}
      {canActAsOwner && !isBattleRoyale && tournament.status !== 'completed' && stages.length === 0 && (
        <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-200">No stage format added yet</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`?tab=format-stages`)}
            className="font-mono text-[10px] uppercase tracking-wider text-rose-400 transition-colors hover:text-rose-300 focus-visible:outline-none"
          >
            Add Stage →
          </button>
        </div>
      )}

      {/* Draft warning */}
      {canActAsOwner && tournament.status === 'draft' &&
        new Date().getTime() - new Date(tournament.created_at).getTime() > 48 * 60 * 60 * 1000 && (
          <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
            <span className="text-xs font-medium text-amber-200">
              Tournament isn't live. Complete configuration and publish to accept registrations.
            </span>
          </div>
        )}

      {/* Flat stat strip */}
      <div className="flex flex-wrap divide-x divide-white/[0.06] border-b border-white/[0.06]">
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Prize Pool</span>
          <span className={`text-sm font-bold ${toneClass(prizePool > 0 ? 'success' : 'neutral')}`}>
            {prizePool > 0 ? formatCurrency(prizePool, tournament.currency) : 'None'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Participants</span>
          <span className={`text-sm font-bold ${toneClass(currentCount >= maxCount && maxCount > 0 ? 'warning' : 'neutral')}`}>
            {maxCount > 0 ? `${currentCount} / ${maxCount}` : String(currentCount)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Registration</span>
          <span className={`text-sm font-bold ${toneClass(registration.tone)}`}>{registration.label}</span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Entry Fee</span>
          <span className="text-sm font-bold text-white">
            {tournament.entry_fee && parseFloat(tournament.entry_fee) > 0
              ? formatCurrency(parseFloat(tournament.entry_fee), tournament.currency)
              : 'Free'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Stages</span>
          <span className={`text-sm font-bold ${toneClass(stages.length > 0 ? 'neutral' : 'warning')}`}>
            {stages.length > 0 ? stages.length : 'None'}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Format</span>
          <span className="text-sm font-bold text-white">{tournament.is_online ? 'Online' : 'LAN'}</span>
        </div>
      </div>

      {/* Dates */}
      <CommandSection>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div>
            <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Start Date</p>
            <p className="text-sm font-medium text-white">
              {tournament.start_date
                ? new Date(tournament.start_date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })
                : 'Not set'}
            </p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">End Date</p>
            <p className="text-sm font-medium text-white">
              {tournament.end_date
                ? new Date(tournament.end_date).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })
                : 'Not set'}
            </p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Registration Deadline</p>
            <p className="text-sm font-medium text-white">
              {tournament.registration_deadline
                ? new Date(tournament.registration_deadline).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })
                : 'Not set'}
            </p>
          </div>
        </div>
      </CommandSection>

      {/* Description */}
      {tournament.description && (
        <CommandSection>
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Description</p>
          <p className="text-sm leading-relaxed text-zinc-300">{tournament.description}</p>
        </CommandSection>
      )}
    </>
  );
}
