import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from './use-toast';
import { UserRole } from '@/types/auth';
import { getDashboardPath } from '@/utils/redirectUtils';

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

      navigate('/user/dashboard');
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
      
      // Step 2: Create user profile (with upsert to handle duplicates)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          username: username,
          full_name: fullName || null,
          email: email,
          avatar_url: null,
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Don't try to delete the auth user - this requires admin privileges
        // Instead, mark the error for cleanup
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      console.log("Successfully created user profile");
      
      // Step 3: Role is already set in the profile table, no need for separate role assignment
      console.log(`User created with role: ${role}`);

      toast({
        title: 'Account created',
        description: 'Your account has been created successfully.',
        duration: 6000,
      });
      
      // Navigate to user dashboard
      navigate('/user/dashboard');

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