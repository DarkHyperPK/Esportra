import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useRole } from "@/hooks/useRole";
import { hasTournamentStaffAccess, useTournamentStaffAccess } from "@/hooks/useTournamentStaffAccess";
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
  requiresAuth?: boolean;
}

const ProtectedRoute = ({
  children,
  redirectTo = "/auth/signin",
  allowedRoles,
  allowStaffForTournamentParam,
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

  if (loading || roleLoading || (allowStaffForTournamentParam && staffAccessLoading)) {
    return <ProfileLoading error={authError} />;
  }

  if (requiresAuth && !user) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`${redirectTo}?returnTo=${returnTo}`} replace />;
  }

  if (allowedRoles) {
    const effectiveRole = (currentRole || profile?.role) as UserRole | undefined;

    const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');
    const hasRole = !!effectiveRole && allowedRoles.includes(effectiveRole);

    const hasAdminPerm = admin.isAdmin && allowedRoles.some(role => {
      if (role === 'organizer') return admin.hasPermission('tournaments:create') || admin.hasPermission('tournaments:edit');
      if (role === 'venue_owner') return admin.hasPermission('venues:view') || admin.hasPermission('venues:approve');
      return false;
    });

    const hasScopedStaffAccess =
      !!allowStaffForTournamentParam &&
      hasTournamentStaffAccess(scopedStaffAssignments, tournamentSlug);

    if (!isSuperAdmin && !hasRole && !hasAdminPerm && !hasScopedStaffAccess) {
      return <Navigate to="/unauthorized" />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
