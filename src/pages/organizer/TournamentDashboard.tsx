/**
 * TournamentDashboard.tsx
 *
 * New tournament dashboard page using the side-panel layout.
 * Replaces the monolithic TournamentManage.tsx.
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { isSuperAdminUser } from '@/lib/adminAccess';
import { useTournamentDashboard } from '@/hooks/useTournamentDashboard';
import { useTournamentAccess } from '@/hooks/useTournamentAccess';
import { useCompletionState } from '@/hooks/useCompletionState';
import { usePrizeDistribution } from '@/hooks/usePrizeDistribution';
import { TournamentDashboardShell } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import { PanelRouter } from '@/components/organizer/tournament-manage/PanelRouter';
import { DashboardLoadingState } from '@/components/organizer/tournament-manage/DashboardLoadingState';
import { DashboardErrorState } from '@/components/organizer/tournament-manage/DashboardErrorState';
import { useOrganizerDisputeUnread } from '@/hooks/useOrganizerDisputeUnread';
import { useTournamentOverviewModel } from '@/hooks/useTournamentOverviewModel';
import { useStageRealtime } from '@/hooks/useStageRealtime';
import { getApiErrorMessage } from '@/lib/apiClient';
import {
  buildDashboardNav,
  listReachableTargets,
  listVisibleSections,
  resolveActiveSection,
  resolveDefaultSection,
} from '@/services/tournamentDashboard/dashboardNav';
import type { StaffPermission } from '@/types/staff';
import { isBattleRoyaleTournament, getPersistedTournamentFormat, getEffectiveGameFeatures } from '@/utils/gameFeatures';

const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  'scores:update': 'Scores',
  'teams:manage': 'Teams',
  'bracket:edit': 'Brackets',
  'announcements:send': 'Announcements',
  'disputes:assist': 'Disputes',
};

const TournamentDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { currentRole, isLoading: roleLoading } = useRole();
  const admin = useAdmin();
  const queryClient = useQueryClient();

  // Fetch tournament data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useTournamentDashboard(slug);

  // Fetch access/permissions
  const {
    access: tournamentAccess,
    isLoading: accessLoading,
  } = useTournamentAccess(slug);

  const tournament = dashboardData?.tournament;

  useStageRealtime({ tournamentId: tournament?.id, dashboardSlug: slug, dashboardUserId: profile?.id });

  const stages = useMemo(() => dashboardData?.stages ?? [], [dashboardData?.stages]);
  const participants = useMemo(() => dashboardData?.participants ?? [], [dashboardData?.participants]);
  const mockCount = dashboardData?.mockCount ?? 0;

  const isOrganizer = tournamentAccess?.isOrganizer || dashboardData?.isOrganizer || false;
  const isPlatformAdmin = tournamentAccess?.isPlatformAdmin || false;
  const isSuperAdmin = isSuperAdminUser(admin, profile);
  const inOrganizerSession = currentRole === 'organizer' || isSuperAdmin;

  const canActAsOwner = (isOrganizer || isPlatformAdmin) && inOrganizerSession;

  const staffPermissions = useMemo(
    () => (tournamentAccess?.permissions ?? []),
    [tournamentAccess?.permissions]
  );

  const hasTournamentStaffAccess = Boolean(
    tournamentAccess && !tournamentAccess.isOrganizer && tournamentAccess.role !== 'none'
  );

  // Redirect player sessions unless they have staff access
  useEffect(() => {
    if (dashboardLoading || accessLoading || roleLoading || admin.loading) return;
    if (inOrganizerSession || hasTournamentStaffAccess) return;
    if (slug) {
      toast({
        title: 'Organizer mode required',
        description: 'Switch to Organizer role to manage this tournament.',
      });
      navigate(`/tournaments/${slug}`, { replace: true });
      return;
    }
    navigate('/unauthorized', { replace: true });
  }, [
    dashboardLoading,
    accessLoading,
    roleLoading,
    admin.loading,
    inOrganizerSession,
    hasTournamentStaffAccess,
    slug,
    navigate,
    toast,
  ]);

  // Determine if tournament is Battle Royale
  const isBR = useMemo(() => {
    if (!tournament) return false;
    return isBattleRoyaleTournament(
      tournament.game || '',
      getPersistedTournamentFormat(tournament)
    );
  }, [tournament]);

  // Map pool completion check — only fetch when game supports veto and it's enabled
  const mapVetoEnabled = useMemo(() => {
    if (!tournament) return false;
    const features = getEffectiveGameFeatures(tournament.game || '', tournament.game_mode);
    return features.mapVeto && (tournament.settings?.mapVetoEnabled ?? features.mapVeto ?? false);
  }, [tournament]);

  const { data: mapPoolData } = useQuery({
    queryKey: ['map-pool', tournament?.id],
    queryFn: () => apiClient.get<{ id: string }[]>(`/api/tournaments/${tournament!.id}/map-pool`),
    enabled: !!tournament && mapVetoEnabled,
  });

  const mapPoolEmpty = mapVetoEnabled && Array.isArray(mapPoolData) && mapPoolData.length === 0;

  // Only fetch when prize pool is set — avoids an extra request for free tournaments
  const prizePool = parseFloat(tournament?.prize_pool || '0');
  const { data: prizeDistribution, isLoading: prizeDistributionLoading } = usePrizeDistribution(
    prizePool > 0 ? tournament?.id : undefined
  );
  const distributionComplete = useMemo(() => {
    if (prizeDistributionLoading) return undefined;
    if (!prizeDistribution?.placements?.length) return false;
    const total = prizeDistribution.placements.reduce((sum, p) => sum + (p.percentage || 0), 0);
    return Math.abs(total - 100) < 0.01;
  }, [prizeDistribution, prizeDistributionLoading]);

  // Compute completion state
  const completionSummary = useCompletionState(tournament, stages, distributionComplete, mapPoolEmpty);

  // Permission flags for nav visibility
  const permissions = useMemo(() => {
    const canManageTeams = staffPermissions.includes('teams:manage') || canActAsOwner;
    const canEditBracket = staffPermissions.includes('bracket:edit') || canActAsOwner;
    const canSendAnnouncements = staffPermissions.includes('announcements:send') || canActAsOwner;
    const canAssistDisputes = staffPermissions.includes('disputes:assist') || canActAsOwner;
    const canManageStaff = canActAsOwner;

    return {
      canManageTeams,
      canAssistDisputes,
      canSendAnnouncements,
      canEditBracket,
      canManageStaff,
      canActAsOwner,
    };
  }, [staffPermissions, canActAsOwner]);

  const { badgeCount: disputeBadgeCount } = useOrganizerDisputeUnread(tournament?.id, permissions.canAssistDisputes);

  const navGroups = useMemo(() => buildDashboardNav({
    slug: slug ?? '',
    isBR,
    isPaid: parseFloat(tournament?.entry_fee || '0') > 0,
    ...permissions,
    disputeBadgeCount,
  }), [slug, isBR, tournament?.entry_fee, permissions, disputeBadgeCount]);
  const visibleSections = useMemo(() => listVisibleSections(navGroups), [navGroups]);
  const reachable = useMemo(() => listReachableTargets(navGroups), [navGroups]);
  const defaultSection = resolveDefaultSection(tournament?.status ?? '', visibleSections, stages.length);
  const requestedTab = searchParams.get('tab');
  const activeTab = resolveActiveSection(requestedTab, visibleSections, defaultSection);

  // Drafts land on Basic info (post-Quick-Create journey); live events on the Overview.
  // Unknown or forbidden tabs are rewritten to what is actually shown.
  useEffect(() => {
    if (!tournament || accessLoading) return;
    if (requestedTab !== activeTab && requestedTab !== 'advanced') {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [tournament, accessLoading, requestedTab, activeTab, setSearchParams]);

  const overview = useTournamentOverviewModel({
    tournament,
    participants,
    stages,
    mockCount,
    completionSummary,
    disputeCount: disputeBadgeCount,
    reachable,
    isBattleRoyale: isBR,
  });

  const staffSummary = hasTournamentStaffAccess
    ? staffPermissions.map((perm) => STAFF_PERMISSION_LABELS[perm as StaffPermission] ?? perm).join(', ') || 'Limited access'
    : null;

  // Handle update (invalidates queries)
  const handleUpdate = () => {
    void refetchDashboard();
    queryClient.invalidateQueries({ queryKey: ['tournament-dashboard', slug] });
  };

  // Loading state
  if (dashboardLoading || accessLoading || roleLoading || admin.loading) {
    return <DashboardLoadingState />;
  }

  // Error state
  if (dashboardError || !tournament || !overview) {
    return (
      <DashboardErrorState
        title={dashboardError ? 'Could not load this tournament' : 'Tournament not found'}
        message={dashboardError
          ? getApiErrorMessage(dashboardError, { context: 'generic' })
          : "It may have been deleted, or you don't have permission to manage it."}
        onBack={() => navigate('/organizer/dashboard?tab=tournaments')}
        onRetry={dashboardError ? () => void refetchDashboard() : undefined}
      />
    );
  }

  return (
    <TournamentDashboardShell
      tournament={tournament}
      completionSummary={completionSummary}
      navGroups={navGroups}
      activeTab={activeTab}
      canActAsOwner={permissions.canActAsOwner}
      phaseLabel={overview.phaseLabel}
      phaseTone={overview.phaseTone}
      staffSummary={staffSummary}
      userId={profile?.id}
    >
      <PanelRouter
        activeTab={activeTab}
        tournament={tournament}
        participants={participants}
        stages={stages}
        completionSummary={completionSummary}
        permissions={permissions}
        isBattleRoyale={isBR}
        isSuperAdmin={isSuperAdmin}
        mockCount={mockCount}
        overview={overview}
        onNavigateTab={(tab) => setSearchParams({ tab }, { replace: true })}
        onUpdate={handleUpdate}
      />
    </TournamentDashboardShell>
  );
};

export default TournamentDashboard;
