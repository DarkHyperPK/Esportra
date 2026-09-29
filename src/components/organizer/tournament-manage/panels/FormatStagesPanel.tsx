/**
 * FormatStagesPanel.tsx
 *
 * Configuration panel for tournament format and stages.
 * Wraps the existing StageManagementTab / BRStageManagementTab with CommandHeader.
 */

import {
  CommandHeader,
} from '@/components/management/CommandSurface';
import { StageManagementTab } from '@/components/organizer/tabs/StageManagementTab';
import { BRStageManagementTab } from '@/components/organizer/tabs/BRStageManagementTab';
import { getBRConfig, getParticipantMode } from '@/utils/gameFeatures';
import type { DashboardTournament, DashboardStage } from '@/hooks/useTournamentDashboard';

interface FormatStagesPanelProps {
  tournament: DashboardTournament;
  stages: DashboardStage[];
  isBattleRoyale: boolean;
  isSuperAdmin: boolean;
  onUpdate: () => void;
}

export function FormatStagesPanel({
  tournament,
  stages,
  isBattleRoyale,
  isSuperAdmin,
  onUpdate,
}: FormatStagesPanelProps) {
  const brConf = isBattleRoyale ? getBRConfig(tournament.game || '') : null;
  const brSettings = isBattleRoyale ? tournament.settings : null;
  const brPresetKey = brSettings?.brScoringPreset || brConf?.defaultPreset || '';
  const brScoringPreset =
    brSettings?.brCustomScoring ||
    brConf?.scoringPresets?.[brPresetKey] || {
      name: 'Default',
      placements: [10, 6, 5, 4, 3, 2, 1, 1],
      killPoints: 1,
      killCap: null,
    };

  const participantMode = getParticipantMode(tournament.game || '', tournament.game_mode);

  return (
    <>
      <CommandHeader
        eyebrow="Run"
        title="Format and stages"
        description="Build the event from stages (groups, Swiss, brackets), set who advances, and seed teams."
      />

      {isBattleRoyale ? (
        <BRStageManagementTab
          tournamentId={tournament.id}
          stages={stages}
          participants={[]}
          maxTeams={tournament.max_teams ?? null}
          maxParticipants={tournament.max_participants ?? null}
          teamSize={tournament.team_size ?? null}
          gameMode={tournament.game_mode ?? null}
          participantMode={participantMode}
          game={tournament.game || ''}
          tournamentSettings={brSettings as Record<string, unknown> | null}
          scoringPreset={brScoringPreset}
          checkInRequired={!!tournament.check_in_required}
          onUpdate={onUpdate}
          locked={tournament.status === 'completed' && !isSuperAdmin}
        />
      ) : (
        <StageManagementTab
          tournamentId={tournament.id}
          stages={stages}
          onUpdate={onUpdate}
          game={tournament.game || ''}
          isPublic={tournament.is_public}
          checkInRequired={!!tournament.check_in_required}
          locked={tournament.status === 'completed' && !isSuperAdmin}
        />
      )}
    </>
  );
}
