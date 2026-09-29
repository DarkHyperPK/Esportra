/**
 * SchedulePanel.tsx
 *
 * Schedule operations panel. Renders BRScheduleTab for BR tournaments
 * or stage scheduling config for standard tournaments.
 */

import { Calendar } from 'lucide-react';
import {
  CommandHeader,
  CommandEmptyState,
} from '@/components/management/CommandSurface';
import { BRScheduleTab } from '@/components/organizer/tabs/BRScheduleTab';
import StageSchedulingConfig from '@/components/tournament/StageSchedulingConfig';
import RoundSchedulingPanel from '@/components/tournament/RoundSchedulingPanel';
import { FORMAT_LABELS } from '@/components/tournament/schedule/roundNaming';
import type { DashboardTournament, DashboardStage } from '@/hooks/useTournamentDashboard';

function readSelfPlay(config: unknown): boolean {
  if (typeof config === 'string') {
    try {
      return Boolean((JSON.parse(config) as { self_play_enabled?: boolean })?.self_play_enabled);
    } catch {
      return false;
    }
  }
  return Boolean((config as { self_play_enabled?: boolean } | null)?.self_play_enabled);
}

interface SchedulePanelProps {
  tournament: DashboardTournament;
  stages: DashboardStage[];
  isBattleRoyale: boolean;
  isSuperAdmin: boolean;
  brRegisteredUnitCount?: number;
  onUpdate: () => void;
}

export function SchedulePanel({
  tournament,
  stages,
  isBattleRoyale,
  isSuperAdmin,
  brRegisteredUnitCount = 0,
  onUpdate,
}: SchedulePanelProps) {
  const sortedStages = [...stages].sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));

  return (
    <>
      <CommandHeader eyebrow="Run" title="Schedule" description="For each stage: who sets match times, how early check-in opens, and when every round is played." />

      {isBattleRoyale ? (
        <BRScheduleTab
          tournamentId={tournament.id}
          tournamentStartDate={tournament.start_date || null}
          tournamentEndDate={tournament.end_date || null}
          stages={stages}
          registeredUnitCount={brRegisteredUnitCount}
          onUpdate={onUpdate}
          locked={tournament.status === 'completed' && !isSuperAdmin}
        />
      ) : stages.length === 0 ? (
        <div className="px-4 py-8">
          <CommandEmptyState
            icon={<Calendar className="h-5 w-5" />}
            title="Nothing to schedule yet"
            description="Rounds come from your stages. Add a stage in Format and stages, then set times here."
          />
        </div>
      ) : (
        <div>
          {sortedStages.map((stage, i) => {
            const formatLabel = FORMAT_LABELS[stage.format || 'single_elimination'] ?? (stage.format || '').replace(/_/g, ' ');
            return (
              <section
                key={stage.id}
                aria-labelledby={`stage-${stage.id}-title`}
                className="border-b border-white/[0.07] last:border-b-0"
              >
                <div className="flex items-center gap-3 px-5 pt-6 sm:px-6">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-white/[0.06] font-heading text-xs font-black tabular-nums text-zinc-300">
                    {i + 1}
                  </span>
                  <h3 id={`stage-${stage.id}-title`} className="font-heading text-lg font-bold tracking-tight text-white">{stage.name}</h3>
                  <span className="text-sm text-zinc-500">{formatLabel}</span>
                </div>
                <StageSchedulingConfig
                  stageId={stage.id}
                  stageFormat={stage.format || 'single_elimination'}
                  gameName={tournament.game || ''}
                  onConfigChange={onUpdate}
                />
                <RoundSchedulingPanel
                  stageId={stage.id}
                  stageFormat={stage.format || 'single_elimination'}
                  tournamentStartDate={tournament.start_date || null}
                  tournamentEndDate={tournament.end_date || null}
                  selfPlayEnabled={readSelfPlay(stage.config)}
                  onScheduleApplied={onUpdate}
                />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
