import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRoles?: string[];
}

export function AdminRouteGuard({
  children,
  requiredPermission,
  requiredRoles,
}: AdminRouteGuardProps) {
  const admin = useAdmin();

  if (requiredPermission) {
    if (!admin.hasPermission(requiredPermission)) {
      return <Navigate to="/unauthorized" replace />;
    }
  } else if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole =
      admin.roles.includes('super_admin') ||
      requiredRoles.some((role) => admin.roles.includes(role));

    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
