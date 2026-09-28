/**
 * TournamentDashboard.tsx
 *
 * New tournament dashboard page using the side-panel layout.
 * Replaces the monolithic TournamentManage.tsx.
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import { useQueryClient } from '@tanstack/react-query';
import { isSuperAdminUser } from '@/lib/adminAccess';
import { useTournamentDashboard } from '@/hooks/useTournamentDashboard';
import { useTournamentAccess } from '@/hooks/useTournamentAccess';
import { useCompletionState } from '@/hooks/useCompletionState';
import { TournamentDashboardShell } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import { PanelRouter } from '@/components/organizer/tournament-manage/PanelRouter';
import { isBattleRoyaleTournament, getPersistedTournamentFormat } from '@/utils/gameFeatures';

const TournamentDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { currentRole, isLoading: roleLoading } = useRole();
  const admin = useAdmin();
  const queryClient = useQueryClient();

  // Default to basic-info tab on first visit (post-Quick-Create user journey)
  useEffect(() => {
    if (!searchParams.get('tab')) {
      setSearchParams({ tab: 'basic-info' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  // Compute completion state
  const completionSummary = useCompletionState(tournament, stages);

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

  // Handle update (invalidates queries)
  const handleUpdate = () => {
    void refetchDashboard();
    queryClient.invalidateQueries({ queryKey: ['tournament-dashboard', slug] });
  };

  // Loading state
  if (dashboardLoading || accessLoading || roleLoading || admin.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="text-sm text-zinc-400">Loading tournament dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (dashboardError || !tournament) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent text-white">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-red-400">Failed to load tournament</p>
          <p className="text-sm text-zinc-400">
            {dashboardError ? (dashboardError as Error).message : 'Tournament not found.'}
          </p>
          <button
            onClick={() => navigate('/organizer/dashboard?tab=tournaments')}
            className="mt-4 border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:border-white/25 hover:bg-white/[0.06]"
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  return (
    <TournamentDashboardShell
      tournament={tournament}
      completionSummary={completionSummary}
      permissions={permissions}
      isBattleRoyale={isBR}
    >
      <PanelRouter
        tournament={tournament}
        participants={participants}
        stages={stages}
        completionSummary={completionSummary}
        permissions={permissions}
        isBattleRoyale={isBR}
        isSuperAdmin={isSuperAdmin}
        mockCount={mockCount}
        onUpdate={handleUpdate}
      />
    </TournamentDashboardShell>
  );
};

export default TournamentDashboard;
