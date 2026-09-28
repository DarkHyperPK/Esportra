/**
 * PanelRouter.tsx
 *
 * Routes the active tab to the appropriate panel component.
 * Phase 2: Operations panels.
 * Phase 3: Configuration panels.
 */

import { useSearchParams } from 'react-router-dom';
import {
  CommandHeader,
  CommandEmptyState,
} from '@/components/management/CommandSurface';

// Operations panels (already extracted)
import { OverviewPanel } from './panels/OverviewPanel';
import { ParticipantsPanel } from './panels/ParticipantsPanel';
import { SchedulePanel } from './panels/SchedulePanel';
import { InvitationsPanel } from './panels/InvitationsPanel';

// Configuration panels
import { BasicInfoPanel } from './panels/BasicInfoPanel';
import { FormatStagesPanel } from './panels/FormatStagesPanel';
import { BrandingPanel } from './panels/BrandingPanel';
import { PrizePayoutsPanel } from './panels/PrizePayoutsPanel';
import { RegistrationPanel } from './panels/RegistrationPanel';
import { StaffPanel } from './panels/StaffPanel';
import { AdvancedSettingsPanel } from './panels/AdvancedSettingsPanel';

// Already-extracted tab components (used as-is)
import { StageManagementTab } from '@/components/organizer/tabs/StageManagementTab';
import { BRStageManagementTab } from '@/components/organizer/tabs/BRStageManagementTab';
import { BRGamesTab } from '@/components/organizer/tabs/BRGamesTab';
import { OrganizerStandingsTab } from '@/components/organizer/OrganizerStandingsTab';
import BanManagement from '@/components/organizer/BanManagement';
import TournamentAnnouncementPanel from '@/components/organizer/TournamentAnnouncementPanel';
import PaymentManagement from '@/components/organizer/PaymentManagement';

import type { DashboardTournament, DashboardParticipant, DashboardStage } from '@/hooks/useTournamentDashboard';
import type { CompletionSummary } from '@/hooks/useCompletionState';
import { getBRConfig } from '@/utils/gameFeatures';
import { resolveBRRegisteredUnitCount } from '@/utils/brStageFlow';
import { getEditableFields } from '@/utils/tournamentEditability';
import { LayoutDashboard } from 'lucide-react';

interface PanelRouterProps {
  tournament: DashboardTournament;
  participants: DashboardParticipant[];
  stages: DashboardStage[];
  completionSummary: CompletionSummary;
  permissions: {
    canManageTeams: boolean;
    canAssistDisputes: boolean;
    canSendAnnouncements: boolean;
    canEditBracket: boolean;
    canManageStaff: boolean;
    canActAsOwner: boolean;
  };
  isBattleRoyale: boolean;
  isSuperAdmin: boolean;
  mockCount?: number;
  onUpdate: () => void;
}

export function PanelRouter({
  tournament,
  participants,
  stages,
  permissions,
  isBattleRoyale,
  isSuperAdmin,
  mockCount = 0,
  onUpdate,
}: PanelRouterProps) {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

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

  const brRegisteredUnitCount = isBattleRoyale
    ? resolveBRRegisteredUnitCount(
        participants,
        tournament.max_teams ?? 0,
        !!tournament.check_in_required,
      )
    : 0;

  // Field-level locking — config panels receive this to gate which inputs are editable
  const editableFields = getEditableFields(
    tournament.status as 'draft' | 'published' | 'open' | 'ongoing' | 'completed',
    isSuperAdmin,
  );

  // ── OPERATIONS ────────────────────────────────────────────────────────────

  if (activeTab === 'overview') {
    return (
      <OverviewPanel
        tournament={tournament}
        participants={participants}
        stages={stages}
        canActAsOwner={permissions.canActAsOwner}
        isBattleRoyale={isBattleRoyale}
      />
    );
  }

  if (activeTab === 'participants') {
    return (
      <ParticipantsPanel
        tournament={tournament}
        participants={participants}
        canActAsOwner={permissions.canActAsOwner}
        mockCount={mockCount}
      />
    );
  }

  if (activeTab === 'stages') {
    return (
      <>
        <CommandHeader eyebrow="OPERATIONS" title="Stages" description="Manage tournament stage structure and brackets." />
        {isBattleRoyale ? (
          <BRStageManagementTab
            tournamentId={tournament.id}
            stages={stages}
            participants={participants}
            maxTeams={tournament.max_teams ?? null}
            maxParticipants={tournament.max_participants ?? null}
            teamSize={tournament.team_size ?? null}
            gameMode={tournament.game_mode ?? null}
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

  if (activeTab === 'standings') {
    return (
      <>
        <CommandHeader eyebrow="OPERATIONS" title="Standings" />
        <OrganizerStandingsTab
          tournament={{ id: tournament.id, prize_pool: tournament.prize_pool, currency: tournament.currency ?? 'USD' }}
          locked={tournament.status === 'completed' && !isSuperAdmin}
        />
      </>
    );
  }

  if (activeTab === 'schedule') {
    return (
      <SchedulePanel
        tournament={tournament}
        stages={stages}
        isBattleRoyale={isBattleRoyale}
        isSuperAdmin={isSuperAdmin}
        brRegisteredUnitCount={brRegisteredUnitCount}
        onUpdate={onUpdate}
      />
    );
  }

  if (activeTab === 'games' && isBattleRoyale) {
    return (
      <>
        <CommandHeader eyebrow="OPERATIONS" title="Games" />
        <BRGamesTab
          tournamentId={tournament.id}
          tournamentStartDate={tournament.start_date || null}
          tournamentEndDate={tournament.end_date || null}
          stages={stages}
          game={tournament.game || ''}
          tournamentSettings={brSettings as Record<string, unknown> | null}
          teamSize={tournament.team_size ?? 1}
          maxTeams={tournament.max_teams ?? null}
          participants={participants}
          scoringPreset={brScoringPreset}
          checkInRequired={!!tournament.check_in_required}
          locked={tournament.status === 'completed' && !isSuperAdmin}
        />
      </>
    );
  }

  if (activeTab === 'invitations') {
    return (
      <InvitationsPanel
        tournament={tournament}
        canActAsOwner={permissions.canActAsOwner}
      />
    );
  }

  if (activeTab === 'announcements') {
    return (
      <>
        <CommandHeader eyebrow="OPERATIONS" title="Announcements" />
        <TournamentAnnouncementPanel tournamentId={tournament.id} />
      </>
    );
  }

  if (activeTab === 'bans') {
    return (
      <>
        <CommandHeader eyebrow="OPERATIONS" title="Bans" />
        <BanManagement tournamentId={tournament.id} />
      </>
    );
  }

  if (activeTab === 'payments') {
    return (
      <>
        <CommandHeader eyebrow="OPERATIONS" title="Payments" />
        <PaymentManagement
          tournamentId={tournament.id}
          participants={participants}
          onRefresh={onUpdate}
        />
      </>
    );
  }

  // ── CONFIGURATION ──────────────────────────────────────────────────────────

  if (activeTab === 'basic-info') {
    return (
      <BasicInfoPanel
        tournament={tournament}
        editableFields={editableFields}
        onSave={onUpdate}
      />
    );
  }

  if (activeTab === 'format-stages') {
    return (
      <FormatStagesPanel
        tournament={tournament}
        stages={stages}
        isBattleRoyale={isBattleRoyale}
        isSuperAdmin={isSuperAdmin}
        onUpdate={onUpdate}
      />
    );
  }

  if (activeTab === 'branding') {
    return (
      <BrandingPanel
        tournament={tournament}
        editableFields={editableFields}
        onSave={onUpdate}
      />
    );
  }

  if (activeTab === 'prize-payouts') {
    return (
      <PrizePayoutsPanel
        tournament={tournament}
        editableFields={editableFields}
        onSave={onUpdate}
      />
    );
  }

  if (activeTab === 'registration') {
    return (
      <RegistrationPanel
        tournament={tournament}
        editableFields={editableFields}
        onSave={onUpdate}
      />
    );
  }

  if (activeTab === 'staff') {
    return (
      <StaffPanel
        tournament={tournament}
        editableFields={editableFields}
        onSave={onUpdate}
      />
    );
  }

  if (activeTab === 'settings' || activeTab === 'advanced') {
    return (
      <AdvancedSettingsPanel
        tournament={tournament}
        editableFields={editableFields}
        onSave={onUpdate}
      />
    );
  }

  // Fallback
  return (
    <CommandEmptyState
      icon={<LayoutDashboard className="h-5 w-5" />}
      title="Panel not found"
      description={`Unknown tab: ${activeTab}`}
    />
  );
}
