import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Lightweight auth guard — redirects to /login if no session.
 * Use for routes that need auth but no layout chrome (e.g. /onboarding).
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAuthenticated(!!data.user);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
      </div>
    );
  }

  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
