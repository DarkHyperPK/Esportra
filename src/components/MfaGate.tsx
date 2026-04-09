/**
 * MfaGate.tsx
 *
 * Wrapper component that checks whether the current admin user
 * is MFA-compliant. If MFA is required but the user hasn't
 * enrolled, redirects to /mfa/setup. If enrolled but at aal1,
 * redirects to /mfa/challenge.
 *
 * Usage:
 *   <MfaGate><AdminLayout /></MfaGate>
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Shield } from 'lucide-react';
import { useMfaEnforcementStatus, useMfaFactors } from '@/hooks/useMfa';

// ── Loading skeleton ─────────────────────────────────────────────────────────

const MfaGateLoading = () => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-rose-400" />
        </div>
        <Loader2 className="w-5 h-5 text-rose-400 animate-spin absolute -bottom-1 -right-1" />
      </div>
      <p className="text-sm text-zinc-500">Checking security status…</p>
    </div>
  </div>
);

// ── Gate component ───────────────────────────────────────────────────────────

interface MfaGateProps {
  children: React.ReactNode;
}

const MfaGate: React.FC<MfaGateProps> = ({ children }) => {
  const location = useLocation();
  const {
    data: enforcement,
    isLoading: loadingEnforcement,
    isError: enforcementError,
  } = useMfaEnforcementStatus();
  const {
    data: factors,
    isLoading: loadingFactors,
  } = useMfaFactors();

  // Still loading — show spinner
  if (loadingEnforcement || loadingFactors) {
    return <MfaGateLoading />;
  }

  // If enforcement check failed, let the user through
  // (don't block admins if the status endpoint is down)
  if (enforcementError) {
    return <>{children}</>;
  }

  // MFA is required and user is NOT compliant (not aal2)
  if (enforcement?.mfaRequired && !enforcement?.isCompliant) {
    const hasVerifiedFactors =
      factors && factors.some((f) => f.status === 'verified');

    if (!hasVerifiedFactors) {
      // No TOTP enrolled (or none verified) — redirect to enrollment
      return <Navigate to="/mfa/setup" replace />;
    }

    // Has TOTP enrolled but session is aal1 — redirect to challenge
    return (
      <Navigate
        to="/mfa/challenge"
        state={{ from: location }}
        replace
      />
    );
  }

  // MFA not required, or user is compliant — render children
  return <>{children}</>;
};

export default MfaGate;
