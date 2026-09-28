/**
 * SchedulePanel.tsx
 *
 * Schedule operations panel. Renders BRScheduleTab for BR tournaments
 * or StageSchedulingConfig + RoundSchedulingPanel for standard tournaments.
 */

import { Calendar } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandEmptyState,
} from '@/components/management/CommandSurface';
import { BRScheduleTab } from '@/components/organizer/tabs/BRScheduleTab';
import StageSchedulingConfig from '@/components/tournament/StageSchedulingConfig';
import RoundSchedulingPanel from '@/components/tournament/RoundSchedulingPanel';
import type { DashboardTournament, DashboardStage } from '@/hooks/useTournamentDashboard';

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
  return (
    <>
      <CommandHeader
        eyebrow="OPERATIONS"
        title="Schedule"
        description="Configure match scheduling, check-in windows, and round deadlines."
      />

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
        <CommandEmptyState
          icon={<Calendar className="h-5 w-5" />}
          title="No stages configured"
          description="Add a stage in Format & Stages before configuring match schedules."
        />
      ) : (
        <div className="space-y-4">
          {[...stages]
            .sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0))
            .map((stage) => {
              const schedulingConfig =
                typeof stage.config === 'string'
                  ? (() => {
                      try {
                        return JSON.parse(stage.config);
                      } catch {
                        return null;
                      }
                    })()
                  : stage.config;
              const selfPlayEnabled = Boolean(schedulingConfig?.self_play_enabled);

              return (
                <CommandSection key={stage.id}>
                  <div className="mb-4">
                    <h3 className="text-sm font-bold text-white">{stage.name}</h3>
                    <p className="text-xs text-zinc-500">
                      {(stage.format || 'single_elimination').replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="grid gap-5 xl:grid-cols-2">
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
                      selfPlayEnabled={selfPlayEnabled}
                      onScheduleApplied={onUpdate}
                    />
                  </div>
                </CommandSection>
              );
            })}
        </div>
      )}
    </>
  );
}
