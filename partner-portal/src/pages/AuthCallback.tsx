import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { readInvitationToken } from '@/lib/partnerInvitation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Completing secure sign-in…');

  useEffect(() => {
    let isActive = true;

    const completeSignIn = async () => {
      try {
        let session = (await supabase.auth.getSession()).data.session;
        if (!session) {
          await new Promise(resolve => window.setTimeout(resolve, 300));
          session = (await supabase.auth.getSession()).data.session;
        }
        if (!session) throw new Error('Authentication session is missing.');

        const invitationToken = readInvitationToken();
        if (invitationToken) {
          if (isActive) navigate('/invite/accept', { replace: true });
          return;
        }

        await apiClient.get('/api/sponsors/me');
        if (isActive) navigate('/dashboard', { replace: true });
      } catch {
        await supabase.auth.signOut({ scope: 'local' });
        if (isActive) {
          setMessage('This identity cannot accept the invitation. Sign in with the invited email address.');
        }
      }
    };

    void completeSignIn();
    return () => {
      isActive = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-white">
      <div className="max-w-md space-y-4 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-rose-500" />
        <p className="text-sm text-zinc-300">{message}</p>
        {message.startsWith('This identity') && (
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="text-sm font-semibold text-rose-400 hover:text-rose-300"
          >
            Return to sign in
          </button>
        )}
      </div>
    </div>
  );
}
