import { ReactNode, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '@/contexts/auth-context';
import * as Sentry from '@sentry/react';
import { meRolesQueryKey } from '@/lib/meRoles';
import { UserProfile, AuthContextType, UserRole } from '@/types/auth';
import { useProfile } from '@/hooks/useProfile';
import { useAuthState } from '@/hooks/useAuthState';
import { useAuthActions } from '@/hooks/useAuthActions';
import { useProfileManagement } from '@/hooks/useProfileManagement';
import { apiClient } from '@/lib/apiClient';
import { detectUserCountry } from '@/utils/countries';
import { hasProfileDateOfBirth } from '@/utils/profileFields';
import React from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

// Separate the provider implementation
function AuthProviderImpl({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const { user, loading: authLoading, error: authError } = useAuthState();
  const { signIn, signUp: originalSignUp, signInWithGoogle, signInWithDiscord, signOut } = useAuthActions();
  const { updateProfile } = useProfileManagement();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    fetchProfile,
    applyProfilePatch,
    clearProfile
  } = useProfile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const signUp = useCallback(async (
    email: string,
    password: string,
    username: string,
    fullName?: string,
    role?: UserRole,
    dateOfBirth?: string,
    countryCode?: string,
  ): Promise<void> => {
    await originalSignUp(email, password, username, fullName, role, dateOfBirth, countryCode);
  }, [originalSignUp]);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track previous user ID to detect actual user changes
  const prevUserIdRef = React.useRef<string | null>(null);
  const rolesSyncedForUserRef = useRef<string | null>(null);

  // Refresh role/license cache whenever the authenticated user changes
  useEffect(() => {
    if (!isMounted || authLoading) return;

    const currentUserId = user?.id ?? null;
    if (!currentUserId) {
      rolesSyncedForUserRef.current = null;
      queryClient.removeQueries({ queryKey: meRolesQueryKey });
      return;
    }

    if (rolesSyncedForUserRef.current === currentUserId) return;
    rolesSyncedForUserRef.current = currentUserId;
    void queryClient.invalidateQueries({ queryKey: meRolesQueryKey });
  }, [user?.id, authLoading, isMounted, queryClient]);

  // Track previous profile ID to prevent loops
  const prevProfileIdRef = React.useRef<string | null>(null);

  // Handle auth state changes - only refetch when user actually changes
  useEffect(() => {
    if (!isMounted) return;

    // Skip if still loading auth state
    if (authLoading) return;

    const currentUserId = user?.id || null;
    const prevUserId = prevUserIdRef.current;

    // Update ref
    prevUserIdRef.current = currentUserId;

    const handleUserChange = async () => {
      setError(null);

      if (user) {
        // Skip if we already have a profile for this exact user
        if (prevUserId === currentUserId && profile && profile.id === user.id) {
          setLoading(false);
          return;
        }

        try {
          const profileResult = await fetchProfile(user.id);

          if (!profileResult) {
            console.log("⚠️ No profile found for authenticated user. User may need to complete profile setup.");
          } else {
            prevProfileIdRef.current = profileResult.id;
            Sentry.setUser({ id: profileResult.id, username: profileResult.username, email: profileResult.email });

            if (profileResult.is_suspended && window.location.pathname !== '/suspended') {
              console.warn("[AuthContext] Active session suspended, redirecting...");
              window.location.href = '/suspended';
            }
          }
        } catch (err: any) {
          setError(err.message || "Failed to load profile");
        } finally {
          setLoading(false);
        }
      } else {
        clearProfile();
        prevProfileIdRef.current = null;
        setLoading(false);
      }
    };

    handleUserChange();

    // Poll for suspension status every 5 min — lightweight check
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (user?.id) {
      intervalId = setInterval(async () => {
        try {
          const result = await apiClient.get<{ is_suspended?: boolean }>('/api/profiles/me');
          if (result?.is_suspended && window.location.pathname !== '/suspended') {
            console.warn("[AuthContext] Polling detected suspension!");
            window.location.href = '/suspended';
          }
        } catch {
          // Silently ignore polling errors
        }
      }, 300_000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, authLoading, isMounted, profile, fetchProfile, clearProfile]);

  // React to auth errors
  useEffect(() => {
    if (authError) {
      console.error("Auth error:", authError);
      setError(authError.message);
      setLoading(false);
    }
  }, [authError]);

  const handleUpdateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) {
      console.error("No user is currently signed in.");
      return;
    }

    const updated = await updateProfile(updates, user.id);
    applyProfilePatch(user.id, updated as unknown as Record<string, unknown>);
    await fetchProfile(user.id);
  }, [user, updateProfile, fetchProfile, applyProfilePatch]);

  // Silent background country detection
  useEffect(() => {
    if (!profile || profile.country_code || hasProfileDateOfBirth(profile) || !user || !isMounted) return;

    const performSilentDetection = async () => {
      // Use a session storage flag to avoid repeated attempts if detection fails or is slow
      const storageKey = `country_detection_attempted_${user.id}`;
      if (sessionStorage.getItem(storageKey)) return;

      sessionStorage.setItem(storageKey, 'true');

      try {
        const detected = await detectUserCountry();
        if (detected) {
          console.log(`[AutoCountry] Silently assigning country ${detected} to profile ${user.id}`);
          // Update profile silently
          await handleUpdateProfile({ country_code: detected });
        }
      } catch (err) {
        console.error('[AutoCountry] Silent detection failed:', err);
      }
    };

    // Small delay to ensure core profile data is settled
    const timer = setTimeout(performSilentDetection, 2000);
    return () => clearTimeout(timer);
  }, [profile, profile?.country_code, user, isMounted, handleUpdateProfile]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    await signOut();
    clearProfile();
    Sentry.setUser(null);
  }, [signOut, clearProfile]);

  const isOrganizer = useCallback((): boolean => {
    return profile?.role === 'organizer';
  }, [profile?.role]);

  const isVenueOwner = useCallback((): boolean => {
    return profile?.role === 'venue_owner';
  }, [profile?.role]);

  const isCasual = useCallback((): boolean => {
    return profile?.role === 'casual';
  }, [profile?.role]);

  // Derive email verification status from Supabase user metadata
  const isEmailVerified = !!(user?.email_confirmed_at);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
    user: isMounted ? user : null,
    profile: isMounted ? profile : null,
    loading: !isMounted || loading || authLoading || profileLoading,
    isEmailVerified: isMounted ? isEmailVerified : true,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithDiscord,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
    isOrganizer,
    isVenueOwner,
    isCasual,
    error: error || (profileError ? profileError.message : null)
  }), [
    user,
    profile,
    loading,
    authLoading,
    profileLoading,
    isEmailVerified,
    error,
    profileError,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithDiscord,
    handleSignOut,
    handleUpdateProfile,
    isOrganizer,
    isVenueOwner,
    isCasual,
    isMounted
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const AuthProvider = React.memo(AuthProviderImpl);
