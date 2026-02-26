
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Callback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
        navigate('/auth/signin');
        return;
      }

      if (session) {
        // Check for suspension
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_suspended, suspension_until, suspension_reason, suspension_type')
          .eq('id', session.user.id)
          .single();

        if (profile?.is_suspended) {
          console.warn("[AuthCallback] Suspended user attempted OAuth login:", session.user.id);
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

        // If we are here because of a password recovery link
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
          toast({
            title: "Security Check Passed",
            description: "Please set your new password.",
          });
          navigate('/auth/reset-password');
          return;
        }

        // Successfully authenticated
        toast({
          title: "Success!",
          description: "You have successfully signed in.",
        });
        navigate('/');
      } else {
        navigate('/auth/signin');
      }
    };

    handleAuthCallback();
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
