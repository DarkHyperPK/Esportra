import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { ProfileLoading } from './profile/ProfileLoading';
import MfaGate from '@/components/MfaGate';

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

  if (loading || admin.loading) return <ProfileLoading />;
  if (!user) return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  if (!admin.isAdmin) return <Navigate to="/unauthorized" replace />;

  const required = requiredPermission || permission;
  if (required && !admin.hasPermission(required)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole =
      admin.roles.includes('super_admin') ||
      requiredRoles.some((role) => admin.roles.includes(role));

    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Backend-driven MFA gate — checks enforcement status + enrolled factors
  return <MfaGate>{children}</MfaGate>;
};

export default AdminProtectedRoute;

