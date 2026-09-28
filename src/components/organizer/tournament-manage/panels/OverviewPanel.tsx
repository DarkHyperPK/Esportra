/**
 * OverviewPanel.tsx
 *
 * Tournament overview panel. Shows key stats and status information.
 * Extracted from TournamentManage.tsx overview tab.
 */

import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  CommandHeader,
  CommandSection,
  CommandMetric,
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

  return (
    <>
      <CommandHeader
        eyebrow="OPERATIONS"
        title="Overview"
        description="Tournament status and key metrics."
      />

      {/* Setup prompts for draft tournaments */}
      {canActAsOwner && !isBattleRoyale && tournament.status !== 'completed' && stages.length === 0 && (
        <div className="flex items-center justify-between border border-amber-500/20 bg-amber-500/[0.05] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Setup
            </span>
            <span className="text-sm font-medium text-white">Add stage format</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`?tab=format-stages`)}
            className="font-mono text-[11px] uppercase tracking-wider text-rose-400 transition-colors hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Add Stage →
          </button>
        </div>
      )}

      {/* Draft warning — shown for draft tournaments older than 48 hours */}
      {canActAsOwner && tournament.status === 'draft' &&
        new Date().getTime() - new Date(tournament.created_at).getTime() > 48 * 60 * 60 * 1000 && (
          <div className="flex items-center gap-3 border border-amber-500/25 bg-amber-500/[0.05] px-5 py-4">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" />
            <span className="flex-1 text-sm font-medium text-amber-200">
              Your tournament isn't live. Complete configuration and publish to accept registrations.
            </span>
          </div>
        )}

      {/* Metrics */}
      <CommandSection>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <CommandMetric
            label="Prize Pool"
            value={prizePool > 0 ? formatCurrency(prizePool, tournament.currency) : 'No prize'}
            tone={prizePool > 0 ? 'success' : 'neutral'}
          />
          <CommandMetric
            label="Participants"
            value={maxCount > 0 ? `${currentCount} / ${maxCount}` : String(currentCount)}
            tone={currentCount >= maxCount && maxCount > 0 ? 'warning' : 'neutral'}
          />
          <CommandMetric
            label="Registration"
            value={tournament.registration_open ? 'Open' : 'Closed'}
            tone={tournament.registration_open ? 'success' : 'neutral'}
          />
          <CommandMetric
            label="Entry Fee"
            value={tournament.entry_fee && parseFloat(tournament.entry_fee) > 0
              ? formatCurrency(parseFloat(tournament.entry_fee), tournament.currency)
              : 'Free'}
            tone="neutral"
          />
          <CommandMetric
            label="Stages"
            value={stages.length > 0 ? String(stages.length) : 'None'}
            tone={stages.length > 0 ? 'neutral' : 'warning'}
          />
          <CommandMetric
            label="Format"
            value={tournament.is_online ? 'Online' : 'LAN'}
            tone="neutral"
          />
        </div>
      </CommandSection>

      {/* Tournament description */}
      {tournament.description && (
        <CommandSection>
          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
            Description
          </h3>
          <p className="text-sm leading-relaxed text-zinc-300">{tournament.description}</p>
        </CommandSection>
      )}

      {/* Dates */}
      <CommandSection>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Start Date
            </p>
            <p className="text-sm font-medium text-white">
              {tournament.start_date
                ? new Date(tournament.start_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not set'}
            </p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              End Date
            </p>
            <p className="text-sm font-medium text-white">
              {tournament.end_date
                ? new Date(tournament.end_date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not set'}
            </p>
          </div>
          <div>
            <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Registration Deadline
            </p>
            <p className="text-sm font-medium text-white">
              {tournament.registration_deadline
                ? new Date(tournament.registration_deadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not set'}
            </p>
          </div>
        </div>
      </CommandSection>
    </>
  );
}
