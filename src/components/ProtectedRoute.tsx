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

  // Enhanced debugging
  console.log("ProtectedRoute check:", {
    user: user ? { id: user.id, email: user.email } : null,
    profile: profile ? { id: profile.id, role: profile.role } : null,
    loading,
    allowedRoles,
    path: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  // Add visual debugging in development
  if (import.meta.env.DEV) {
    console.log("🔍 ProtectedRoute Debug:", {
      user: !!user,
      profile: !!profile,
      loading,
      allowedRoles,
      currentPath: window.location.pathname
    });
  }

  if (loading || roleLoading) {
    console.log("Auth loading, showing loading screen");
    return <ProfileLoading />;
  }

  // If auth is required and user is not logged in, redirect to sign in
  if (requiresAuth && !user) {
    console.log("User not logged in, redirecting to", redirectTo);
    return <Navigate to={redirectTo} />;
  }

  // If roles are specified, check if user has permission (public roles)
  if (allowedRoles) {
    const effectiveRole = (currentRole || profile?.role) as UserRole | undefined;
    
    // Super admin can access all routes
    const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');
    const hasPermission = isSuperAdmin || (!!effectiveRole && allowedRoles.includes(effectiveRole));
    
    if (!hasPermission) {
      console.log('Access denied:', {
        userRole: effectiveRole,
        allowedRoles,
        userId: user.id,
        isSuperAdmin
      });
      return <Navigate to="/unauthorized" />;
    }
  }

  // Future: we can extend this component to accept an adminPerm prop to check admin.hasPermission
  // UI will remain unchanged for now.

  console.log("Access granted to protected route");
  return <>{children}</>;
};

export default ProtectedRoute;
