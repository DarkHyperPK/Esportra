import { createContext, useContext, ReactNode, useState, useEffect, useMemo } from 'react';
import { UserProfile, AuthContextType, UserRole } from '@/types/auth';
import { useProfile } from '@/hooks/useProfile';
import { useAuthState } from '@/hooks/useAuthState';
import { useAuthActions } from '@/hooks/useAuthActions';
import { useProfileManagement } from '@/hooks/useProfileManagement';
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
  const { signIn, signInWithGoogle, signOut } = useAuthActions();
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
    role?: UserRole
  ): Promise<void> => {
    await originalSignUp(email, password, username, fullName, role);
  };

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle auth state changes
  useEffect(() => {
    if (!isMounted) return;
    
    const handleUserChange = async () => {
      setError(null);
      
      console.log("🔄 AuthContext: handleUserChange called", {
        user: user ? { id: user.id, email: user.email } : null,
        authLoading,
        profileLoading,
        timestamp: new Date().toISOString()
      });
      
      if (user) {
        try {
          console.log("✅ Auth state changed, user is logged in:", user.id);
          const profileResult = await fetchProfile(user.id);
          
          // If we couldn't fetch a profile but we're authenticated
          if (!profileResult) {
            console.log("⚠️ No profile found for authenticated user. User may need to complete profile setup.");
          } else {
            console.log("✅ Profile loaded successfully");
          }
        } catch (err: any) {
          console.error("❌ Error fetching profile:", err);
          setError(err.message || "Failed to load profile");
        } finally {
          console.log("🏁 Setting loading to false");
          setLoading(false);
        }
      } else if (!authLoading) {
        console.log("🚪 Auth state changed, no user logged in");
        clearProfile();
        setLoading(false);
      }
    };
    
    handleUserChange();
  }, [user, authLoading, isMounted]);

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

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
    user: isMounted ? user : null,
    profile: isMounted ? profile : null,
    loading: !isMounted || loading || authLoading || profileLoading,
    signIn,
    signUp,
    signInWithGoogle,
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
    error,
    profileError,
    signIn,
    signUp,
    signInWithGoogle,
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
