import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2 } from 'lucide-react';

function AdminLoadingFallback() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
    </div>
  );
}

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  permission?: string; // legacy prop
  requiredPermission?: string; // new prop used across routes
  requiredRoles?: string[];
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  permission,
  requiredPermission,
  requiredRoles,
}) => {
  const { user, loading } = useAuth();
  const admin = useAdmin();
  const location = useLocation();

  if (loading || admin.loading) return <AdminLoadingFallback />;
  if (!user) return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  if (!admin.isAdmin) return <Navigate to="/unauthorized" replace />;

  const required = requiredPermission || permission;

  // Permission check takes precedence — if user has the required permission
  // (resolved from DB, including custom roles), skip the role name check.
  if (required) {
    if (!admin.hasPermission(required)) {
      return <Navigate to="/unauthorized" replace />;
    }
    // Permission passed — no need to also match a hardcoded role name
  } else if (requiredRoles && requiredRoles.length > 0) {
    // No permission specified — fall back to role name check
    const hasRequiredRole =
      admin.roles.includes('super_admin') ||
      requiredRoles.some((role) => admin.roles.includes(role));

    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
