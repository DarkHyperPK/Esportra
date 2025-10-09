
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Callback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.getSession();
      
      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
        navigate('/auth/signin');
        return;
      }
      
      // Successfully authenticated
      toast({
        title: "Success!",
        description: "You have successfully signed in.",
      });
      navigate('/');
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
