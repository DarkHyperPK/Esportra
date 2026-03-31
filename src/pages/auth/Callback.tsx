
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Callback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Capture hash immediately before any async processing clears it
    const initialHash = window.location.hash;

    const handleSession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session) {
        navigate('/auth/signin');
        return;
      }

      // Check for suspension
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_suspended, suspension_until, suspension_reason, suspension_type')
        .eq('id', session.user.id)
        .single();

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
      navigate('/');
    };

    // PASSWORD_RECOVERY fires reliably before getSession() resolves — use it as primary handler
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('password_recovery_pending', 'true');
        toast({ title: "Link verified", description: "Please set your new password." });
        navigate('/auth/reset-password');
        return;
      }

      if (event === 'SIGNED_IN') {
        // Fallback: check captured hash for recovery in case event fires as SIGNED_IN
        if (initialHash.includes('type=recovery')) {
          sessionStorage.setItem('password_recovery_pending', 'true');
          toast({ title: "Link verified", description: "Please set your new password." });
          navigate('/auth/reset-password');
          return;
        }
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
      if (initialHash.includes('type=recovery') && session) {
        sessionStorage.setItem('password_recovery_pending', 'true');
        toast({ title: "Link verified", description: "Please set your new password." });
        navigate('/auth/reset-password');
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
    <div className="min-h-screen bg-esports-dark text-white flex flex-col justify-center items-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gaming-purple mb-4"></div>
        <h2 className="text-xl font-semibold">Completing authentication...</h2>
        <p className="text-gray-400 mt-2">You'll be redirected shortly</p>
      </div>
    </div>
  );
};

export default Callback;
