/**
 * useMfa.ts
 *
 * Custom hooks for MFA (Multi-Factor Authentication) operations.
 * Wraps Supabase client-side MFA methods and backend enforcement checks.
 */

import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MfaStatus {
  mfaRequired: boolean;
  currentAal: string;
  isCompliant: boolean;
  adminRoles: string[];
}

export interface MfaAssuranceLevel {
  currentLevel: string;
  nextLevel: string;
  currentAuthenticationMethods: Array<{ method: string; timestamp: number }>;
}

export interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MfaEnrollment {
  id: string;
  type: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
  friendly_name?: string;
}

// ── Query Keys ───────────────────────────────────────────────────────────────

export const mfaKeys = {
  all: ['mfa'] as const,
  enforcementStatus: () => [...mfaKeys.all, 'enforcement-status'] as const,
  assuranceLevel: () => [...mfaKeys.all, 'assurance-level'] as const,
  factors: () => [...mfaKeys.all, 'factors'] as const,
};

// ── Backend enforcement status ───────────────────────────────────────────────

/**
 * Checks whether the current admin user is required to have MFA enabled
 * and whether they are currently compliant (aal2).
 */
export const useMfaEnforcementStatus = () => {
  return useQuery({
    queryKey: mfaKeys.enforcementStatus(),
    queryFn: () => apiClient.get<MfaStatus>('/api/auth/mfa/status'),
    staleTime: 1000 * 60,
    retry: 1,
  });
};

// ── Client-side assurance level ──────────────────────────────────────────────

/**
 * Checks the current AAL (Authenticator Assurance Level) from Supabase.
 * aal1 = password only, aal2 = password + TOTP verified.
 */
export const useMfaAssuranceLevel = () => {
  return useQuery({
    queryKey: mfaKeys.assuranceLevel(),
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      return data as MfaAssuranceLevel;
    },
    staleTime: 1000 * 30,
  });
};

// ── List enrolled TOTP factors ───────────────────────────────────────────────

/**
 * Returns the user's enrolled TOTP factors.
 * Empty array means TOTP has not been set up yet.
 */
export const useMfaFactors = () => {
  return useQuery({
    queryKey: mfaKeys.factors(),
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return (data?.totp ?? []) as MfaFactor[];
    },
    staleTime: 1000 * 30,
  });
};

// ── Enroll TOTP ──────────────────────────────────────────────────────────────

/**
 * Begins TOTP enrollment — returns QR code data URI, secret, and factor ID.
 * The factor isn't "active" until verified with a valid code.
 */
export const useEnrollTotp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendlyName?: string) => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: friendlyName || 'Esportra Admin TOTP',
      });
      if (error) throw error;
      return data as MfaEnrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mfaKeys.all });
    },
  });
};

// ── Challenge + Verify (combined) ────────────────────────────────────────────

/**
 * Two-step TOTP verification:
 *   1. Creates a challenge for the given factor
 *   2. Verifies the challenge with the user's 6-digit code
 *
 * On success the Supabase session is automatically upgraded to aal2.
 */
export const useVerifyTotp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ factorId, code }: { factorId: string; code: string }) => {
      // Step 1: Create challenge
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      // Step 2: Verify with TOTP code
      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mfaKeys.all });
    },
  });
};
