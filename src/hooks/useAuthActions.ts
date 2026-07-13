import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { meRolesQueryKey } from '@/lib/meRoles';
import { resetClientSessionForAuthChange } from '@/lib/resetClientSession';
import { useToast } from './use-toast';
import { UserRole } from '@/types/auth';

export const useAuthActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signIn = async (email: string, password: string, redirectTo?: string) => {
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

      const profile = await apiClient.get<{
        is_suspended?: boolean;
        suspension_reason?: string | null;
        suspension_until?: string | null;
        suspension_type?: string | null;
      }>('/api/profiles/me');

      if (profile?.is_suspended) {
        await supabase.auth.signOut();
        toast({
          title: 'Account Restricted',
          description: `This account is suspended. Reason: ${profile.suspension_reason || 'Violation of terms'}`,
          variant: 'destructive',
        });
        navigate('/suspended', {
          replace: true,
          state: {
            reason: profile.suspension_reason,
            type: profile.suspension_type,
            until: profile.suspension_until,
          },
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: meRolesQueryKey });

      toast({
        title: 'Welcome back!',
        description: 'You have successfully signed in.',
      });

      navigate(redirectTo || '/');
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
    role: UserRole = 'casual',
    dateOfBirth?: string,
    countryCode?: string,
  ) => {
    setLoading(true);
    console.log("Signing up with role:", role);

    try {
      // Step 1: Create the auth user with profile metadata used by handle_new_user trigger
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName || null,
            role: role,
            date_of_birth: dateOfBirth || null,
            country_code: countryCode || null,
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

      if (dateOfBirth || countryCode) {
        try {
          await apiClient.put(`/api/profiles/${authData.user.id}`, {
            ...(dateOfBirth ? { date_of_birth: dateOfBirth } : {}),
            ...(countryCode ? { country_code: countryCode } : {}),
          });
        } catch (profileErr) {
          console.warn('[SignUp] Failed to persist profile fields on signup:', profileErr);
        }
      }

      // Profile is created automatically by the handle_new_user trigger on auth.users.

      // If email confirmation is required, redirect to verify page
      // Note: GoTrue may return a session even when email is unconfirmed
      if (!authData.user.email_confirmed_at) {
        toast({
          title: 'Check your email',
          description: 'We sent a confirmation link to your email. Please verify to continue.',
          duration: 10000,
        });
        navigate('/auth/verify-email', { state: { email } });
        return;
      }

      // Email is already confirmed (autoconfirm enabled) — send welcome email and proceed
      toast({
        title: 'Account created',
        description: 'Your account has been created successfully.',
        duration: 6000,
      });

      const { sendEmail } = await import('@/hooks/useEmail');
      sendEmail({
        type: 'WELCOME',
        email: email,
        data: { username },
      }).catch((err) => console.warn('[SignUp] Welcome email failed:', err));

      await queryClient.invalidateQueries({ queryKey: meRolesQueryKey });
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
      const { error } = await supabase.auth.signInWithOAuth({
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

  const signInWithDiscord = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'identify connections guilds.join guilds.members.read email guilds'
        }
      });

      if (error) throw error;

    } catch (error: any) {
      console.error('Error signing in with Discord:', error);
      toast({
        title: 'Error signing in with Discord',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });

      // If the session was already missing or expired (403), that's fine — we still sign out locally
      if (error && error.name !== 'AuthSessionMissingError' && !error.message?.includes('403')) {
        throw error;
      }
    } catch (error: unknown) {
      console.error('Error signing out:', error);
    } finally {
      resetClientSessionForAuthChange(queryClient);
      setLoading(false);
      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.',
      });
      navigate('/auth/signin', { replace: true });
    }
  };

  return {
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithDiscord,
    signOut
  };
};
