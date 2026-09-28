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
  const sortedStages = [...stages].sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));

  return (
    <>
      <CommandHeader eyebrow="OPERATIONS" title="Schedule" />

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
            title="No stages configured"
            description="Add a stage in Format & Stages before configuring match schedules."
          />
        </div>
      ) : (
        <div>
          {sortedStages.map((stage, i) => {
            const schedulingConfig =
              typeof stage.config === 'string'
                ? (() => { try { return JSON.parse(stage.config); } catch { return null; } })()
                : stage.config;
            const selfPlayEnabled = Boolean(schedulingConfig?.self_play_enabled);
            const formatLabel = (stage.format || 'single_elimination')
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <div key={stage.id} className={i > 0 ? 'border-t border-white/[0.08]' : ''}>
                {/* Stage header — only shown when multiple stages */}
                {sortedStages.length > 1 && (
                  <div className="flex items-center gap-3 border-b border-white/[0.08] bg-white/[0.025] px-4 py-2.5">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center border border-rose-500/30 text-[9px] font-bold text-rose-400">
                      {i + 1}
                    </span>
                    <p className="text-base font-semibold text-white">{stage.name}</p>
                    <span className="text-sm text-zinc-500">{formatLabel}</span>
                  </div>
                )}

                {/* Two-column config grid */}
                <div className="grid xl:grid-cols-2 xl:items-start xl:divide-x xl:divide-white/[0.07]">
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
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
