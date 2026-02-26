import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useRole } from "@/contexts/RoleContext";
import { ProfileLoading } from "./profile/ProfileLoading";
import { UserRole } from "@/types/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
}

const ProtectedRoute = ({
  children,
  redirectTo = "/auth/signin",
  allowedRoles,
  requiresAuth = true
}: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const admin = useAdmin();
  const { currentRole, isLoading: roleLoading } = useRole();

  if (loading || roleLoading) {
    return <ProfileLoading />;
  }

  // If auth is required and user is not logged in, redirect to sign in
  if (requiresAuth && !user) {
    return <Navigate to={redirectTo} />;
  }

  // If roles are specified, check if user has permission (public roles)
  if (allowedRoles) {
    const effectiveRole = (currentRole || profile?.role) as UserRole | undefined;

    // Super admin can access all routes
    const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');
    const hasPermission = isSuperAdmin || (!!effectiveRole && allowedRoles.includes(effectiveRole));

    if (!hasPermission) {
      return <Navigate to="/unauthorized" />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
