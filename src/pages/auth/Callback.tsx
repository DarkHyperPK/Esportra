
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const Callback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleSession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session) {
        navigate('/auth/signin');
        return;
      }

      // Auto-join Esportra Discord server if user linked Discord and we have provider token
      if (session.provider_token && session.user?.app_metadata?.provider === 'discord') {
        try {
          await apiClient.post('/api/profiles/me/discord-join', { providerToken: session.provider_token });
        } catch {
          // Non-critical — don't block login flow
        }
      }

      // Check for suspension via API (consistent with password login + middleware allowlist)
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
          variant: 'destructive'
        });
        navigate('/suspended', {
          replace: true,
          state: {
            reason: profile.suspension_reason,
            type: profile.suspension_type,
            until: profile.suspension_until
          }
        });
        return;
      }

      toast({ title: "Success!", description: "You have successfully signed in." });
      const postAuthRedirect = sessionStorage.getItem('auth_redirect');
      if (postAuthRedirect) sessionStorage.removeItem('auth_redirect');
      navigate(postAuthRedirect || '/');
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        handleSession(session);
      }
    });

    // Fallback: in case onAuthStateChange doesn't fire (e.g. session already exists)
    const fallback = setTimeout(async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        toast({ title: "Authentication Error", description: error.message, variant: "destructive" });
        navigate('/auth/signin');
        return;
      }
      if (session) handleSession(session);
      else navigate('/auth/signin');
    }, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col justify-center items-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gaming-purple mb-4"></div>
        <h2 className="text-xl font-semibold">Completing authentication...</h2>
        <p className="text-gray-400 mt-2">You'll be redirected shortly</p>
      </div>
    </div>
  );
};

export default Callback;
