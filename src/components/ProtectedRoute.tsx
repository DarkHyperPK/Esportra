import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useRole } from "@/hooks/useRole";
import { hasTournamentStaffAccess, useTournamentStaffAccess } from "@/hooks/useTournamentStaffAccess";
import { useStaffAssignmentsSummary } from "@/hooks/useNavTeamStatus";
import { isSuperAdminUser } from "@/lib/adminAccess";
import { ProfileLoading } from "./profile/ProfileLoading";
import { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  allowedRoles?: UserRole[];
  /**
   * When set, staff may enter organizer routes for that tournament only (UX gate).
   * Value is the route param name that holds the tournament slug (default: slug).
   */
  allowStaffForTournamentParam?: string;
  /**
   * When true, active organization staff may enter (e.g. org dashboard schedule view).
   */
  allowOrganizationStaff?: boolean;
  requiresAuth?: boolean;
}

const ProtectedRoute = ({
  children,
  redirectTo = "/auth/signin",
  allowedRoles,
  allowStaffForTournamentParam,
  allowOrganizationStaff = false,
  requiresAuth = true
}: ProtectedRouteProps) => {
  const location = useLocation();
  const params = useParams();
  const { user, profile, loading, error: authError } = useAuth();
  const admin = useAdmin();
  const { currentRole, isLoading: roleLoading } = useRole();

  const tournamentSlug = allowStaffForTournamentParam
    ? params[allowStaffForTournamentParam]
    : undefined;

  const {
    data: scopedStaffAssignments = [],
    isLoading: staffAccessLoading,
  } = useTournamentStaffAccess(tournamentSlug);

  const {
    data: orgStaffAssignments = [],
    isLoading: orgStaffLoading,
  } = useStaffAssignmentsSummary();

  const hasOrganizationStaffAccess =
    allowOrganizationStaff &&
    orgStaffAssignments.some((assignment: { status?: string }) => assignment.status === 'active');

  const waitingOnAdmin = Boolean(allowedRoles && admin.loading);

  if (
    loading ||
    roleLoading ||
    waitingOnAdmin ||
    (allowStaffForTournamentParam && staffAccessLoading) ||
    (allowOrganizationStaff && orgStaffLoading)
  ) {
    return <ProfileLoading error={authError} />;
  }

  if (requiresAuth && !user) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`${redirectTo}?returnTo=${returnTo}`} replace />;
  }

  if (allowedRoles) {
    const effectiveRole = (currentRole || profile?.role) as UserRole | undefined;

    const isSuperAdmin = isSuperAdminUser(admin, profile);
    const hasRole = !!effectiveRole && allowedRoles.includes(effectiveRole);

    const hasAdminPerm = admin.isAdmin && allowedRoles.some(role => {
      if (role === 'organizer') return admin.hasPermission('tournaments:create') || admin.hasPermission('tournaments:edit');
      if (role === 'venue_owner') return admin.hasPermission('venues:view') || admin.hasPermission('venues:approve');
      return false;
    });

    const hasScopedStaffAccess =
      !!allowStaffForTournamentParam &&
      hasTournamentStaffAccess(scopedStaffAssignments, tournamentSlug);

    if (!isSuperAdmin && !hasRole && !hasAdminPerm && !hasScopedStaffAccess && !hasOrganizationStaffAccess) {
      return <Navigate to="/unauthorized" />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
