import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/lib/supabase';
import { ProfileLoading } from './profile/ProfileLoading';

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
  const [mfaReady, setMfaReady] = useState<boolean | null>(null);
  const require2fa = (import.meta as any).env?.VITE_REQUIRE_ADMIN_2FA === 'true';

  useEffect(() => {
    const checkMfa = async () => {
      if (!require2fa) { setMfaReady(true); return; }
      try {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        setMfaReady(data?.currentLevel === 'aal2');
      } catch {
        setMfaReady(false);
      }
    };
    checkMfa();
  }, [require2fa]);

  if (loading || admin.loading || mfaReady === null) return <ProfileLoading />;
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
  if (require2fa && !mfaReady) return <Navigate to="/auth/profile" state={{ reason: 'mfa_required', from: location }} replace />;

  return <>{children}</>;
};

export default AdminProtectedRoute;


