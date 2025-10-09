import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { UserRole } from '@/types/auth';

export const useAuthActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      console.log("Attempting sign in for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Authentication error:", error.message, "Code:", error.code);
        throw error;
      }

      console.log("Sign in successful:", data.user?.id);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    username: string, 
    fullName?: string,
    role: UserRole = 'casual'
  ) => {
    setLoading(true);
    console.log("Signing up with role:", role);
    
    try {
      // Step 1: Create the auth user with minimal metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName || null,
            role: role
          },
        }
      });

      if (authError) {
        console.error("Auth error during signup:", authError);
        throw authError;
      }
      
      if (!authData?.user) {
        throw new Error("User creation failed");
      }
      
      console.log(`User created with ID: ${authData.user.id} and role: ${role}`);
      
      // Step 2: Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: username,
          full_name: fullName || null,
          email: email,
          avatar_url: null,
          role: role
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Don't try to delete the auth user - this requires admin privileges
        // Instead, mark the error for cleanup
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log("Successfully created user profile");
      
      // Step 3: Only attempt role assignment for non-casual users
      if (role !== 'casual') {
        const dbRole = role === 'venue_owner' ? 'venue_owner' : 
                      role === 'organizer' ? 'organizer' : 
                      role === 'admin' ? 'admin' : null;
        
        if (dbRole) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: authData.user.id,
              role: dbRole
            });
            
          if (roleError) {
            console.error("Error assigning role:", roleError);
            // Don't throw, just log warning
            toast({
              title: 'Role assignment warning',
              description: 'Account created but some permissions may be limited. Please contact support.',
              variant: 'destructive',
            });
          } else {
            console.log(`Successfully assigned role: ${dbRole}`);
          }
        }
      }

      toast({
        title: 'Account created',
        description: 'Your account has been created successfully.',
        duration: 6000,
      });
      
      // Navigate to home page
      navigate('/');

    } catch (error: any) {
      console.error('Error signing up:', error);
      toast({
        title: 'Error signing up',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      toast({
        title: 'Error signing in with Google',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
  };
};