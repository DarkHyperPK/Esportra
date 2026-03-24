import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { UserProfile, AuthContextType, UserRole } from '@/types/auth';
import { useProfile } from '@/hooks/useProfile';
import { useAuthState } from '@/hooks/useAuthState';
import { useAuthActions } from '@/hooks/useAuthActions';
import { useProfileManagement } from '@/hooks/useProfileManagement';
import { apiClient } from '@/lib/apiClient';
import { detectUserCountry } from '@/utils/countries';
import React from 'react';

// Create the context outside of any component
const AuthContext = createContext<AuthContextType | undefined>(undefined);
AuthContext.displayName = 'AuthContext'; // Add display name for better debugging

interface AuthProviderProps {
  children: ReactNode;
}

// Separate the provider implementation
function AuthProviderImpl({ children }: AuthProviderProps) {
  const { user, session, loading: authLoading, error: authError } = useAuthState();
  const { signIn, signInWithGoogle, signInWithDiscord, signOut } = useAuthActions();
  const { updateProfile } = useProfileManagement();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    fetchProfile,
    clearProfile
  } = useProfile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Use the signUp from useAuthActions directly
  const { signUp: originalSignUp } = useAuthActions();

  // Wrapper for signUp to ensure it returns void
  const signUp = async (
    email: string,
    password: string,
    username: string,
    fullName?: string,
    role?: UserRole,
    dateOfBirth?: string
  ): Promise<void> => {
    await originalSignUp(email, password, username, fullName, role, dateOfBirth);
  };

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track previous user ID to detect actual user changes
  const prevUserIdRef = React.useRef<string | null>(null);

  // Track previous profile ID to prevent loops
  const prevProfileIdRef = React.useRef<string | null>(null);

  // Handle auth state changes - only refetch when user actually changes
  useEffect(() => {
    if (!isMounted) return;

    // Skip if still loading auth state
    if (authLoading) return;

    const currentUserId = user?.id || null;
    const currentProfileId = profile?.id || null;
    const prevUserId = prevUserIdRef.current;
    const prevProfileId = prevProfileIdRef.current;

    // Only refetch if user actually changed (not just on tab switch)
    // Also check if profile ID changed to avoid loops
    if (currentUserId === prevUserId && currentProfileId === prevProfileId && profile) {
      // User and profile haven't changed - no need to refetch
      setLoading(false);
      return;
    }

    // Update refs for next comparison
    prevUserIdRef.current = currentUserId;
    prevProfileIdRef.current = currentProfileId;

    const handleUserChange = async () => {
      setError(null);

      /*
      console.log("🔄 AuthContext: handleUserChange called", {
        user: user ? { id: user.id, email: user.email } : null,
        authLoading,
        profileLoading,
        timestamp: new Date().toISOString()
      });
      */

      if (user) {
        // Only fetch if we don't already have a profile for this user
        if (profile && profile.id === user.id) {
          // console.log("✅ Profile already loaded, skipping refetch");
          setLoading(false);
          return;
        }

        try {
          // console.log("✅ Auth state changed, user is logged in:", user.id);
          const profileResult = await fetchProfile(user.id);

          // If we couldn't fetch a profile but we're authenticated
          if (!profileResult) {
            console.log("⚠️ No profile found for authenticated user. User may need to complete profile setup.");
          } else {
            // Update profile ID ref after successful fetch
            prevProfileIdRef.current = profileResult.id;

            // Immediate suspension check for already-logged-in sessions
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

    // Poll for suspension status every 60s — lightweight check, doesn't update profile state
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (user?.id) {
      intervalId = setInterval(async () => {
        try {
          const result = await apiClient.get<{ is_suspended?: boolean }>(`/api/profiles/${user.id}`);
          if (result?.is_suspended && window.location.pathname !== '/suspended') {
            console.warn("[AuthContext] Polling detected suspension!");
            window.location.href = '/suspended';
          }
        } catch {
          // Silently ignore polling errors
        }
      }, 60_000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.id, authLoading, isMounted]);

  // React to auth errors
  useEffect(() => {
    if (authError) {
      console.error("Auth error:", authError);
      setError(authError.message);
      setLoading(false);
    }
  }, [authError]);

  const handleUpdateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) {
      console.error("No user is currently signed in.");
      return;
    }

    await updateProfile(updates, user.id);
    await fetchProfile(user.id);
  };

  // Silent background country detection
  useEffect(() => {
    if (!profile || profile.country_code || !user || !isMounted) return;

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
  }, [profile?.id, profile?.country_code, user?.id, isMounted]);

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    clearProfile();
  };

  // Role-based utility functions
  const isOrganizer = (): boolean => {
    return profile?.role === 'organizer';
  };

  const isVenueOwner = (): boolean => {
    return profile?.role === 'venue_owner';
  };

  const isCasual = (): boolean => {
    return profile?.role === 'casual';
  };

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
    isMounted
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Export the provider component
export const AuthProvider = React.memo(AuthProviderImpl);

// Export the hook with a stable reference
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
