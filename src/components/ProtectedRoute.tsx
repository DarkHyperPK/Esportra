import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useRole } from "@/hooks/useRole";
import { useStaffAssignmentsSummary } from "@/hooks/useNavTeamStatus";
import { ProfileLoading } from "./profile/ProfileLoading";
import { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  allowedRoles?: UserRole[];
  /** Allow approved staff (any assignment) to enter organizer routes while in player mode. */
  allowStaffAssignments?: boolean;
  requiresAuth?: boolean;
}

const ProtectedRoute = ({
  children,
  redirectTo = "/auth/signin",
  allowedRoles,
  allowStaffAssignments = false,
  requiresAuth = true
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { user, profile, loading, error: authError } = useAuth();
  const admin = useAdmin();
  const { currentRole, isLoading: roleLoading } = useRole();
  const { data: staffAssignments = [] } = useStaffAssignmentsSummary();

  if (loading || roleLoading) {
    return <ProfileLoading error={authError} />;
  }

  // If auth is required and user is not logged in, redirect to sign in
  if (requiresAuth && !user) {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`${redirectTo}?returnTo=${returnTo}`} replace />;
  }

  // If roles are specified, check if user has permission (public roles)
  if (allowedRoles) {
    const effectiveRole = (currentRole || profile?.role) as UserRole | undefined;

    // Super admin can access all routes
    const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');
    const hasRole = !!effectiveRole && allowedRoles.includes(effectiveRole);

    // Admins with matching DB permissions can also access role-gated routes
    const hasAdminPerm = admin.isAdmin && allowedRoles.some(role => {
      if (role === 'organizer') return admin.hasPermission('tournaments:create') || admin.hasPermission('tournaments:edit');
      if (role === 'venue_owner') return admin.hasPermission('venues:view') || admin.hasPermission('venues:approve');
      return false;
    });

    const hasStaffRouteAccess = allowStaffAssignments && staffAssignments.length > 0;

    if (!isSuperAdmin && !hasRole && !hasAdminPerm && !hasStaffRouteAccess) {
      return <Navigate to="/unauthorized" />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
