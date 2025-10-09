import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/lib/supabase';
import { ProfileLoading } from './profile/ProfileLoading';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  permission?: string; // e.g. 'admin:assign_roles'
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children, permission }) => {
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

  if (loading || mfaReady === null) return <ProfileLoading />;
  if (!user) return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  if (!admin.isAdmin) return <Navigate to="/unauthorized" replace />;
  if (permission && !admin.hasPermission(permission)) return <Navigate to="/unauthorized" replace />;
  if (require2fa && !mfaReady) return <Navigate to="/auth/profile" state={{ reason: 'mfa_required', from: location }} replace />;

  return <>{children}</>;
};

export default AdminProtectedRoute;


