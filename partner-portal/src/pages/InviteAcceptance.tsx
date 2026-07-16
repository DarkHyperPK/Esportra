import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import {
  clearInvitationToken,
  exchangeInvitationOtp,
  markInvitationPasswordSetup,
  readInvitationToken,
  storeInvitationToken,
} from '@/lib/partnerInvitation';

type InvitationPreview = { accountExists: boolean; requiresPasswordSetup: boolean };

export default function InviteAcceptance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Verifying your invitation…');
  const hasHandledSession = useRef(false);

  useEffect(() => {
    const token = searchParams.get('token') ?? readInvitationToken();
    if (!token || !/^[A-Fa-f0-9]{64}$/.test(token)) {
      clearInvitationToken();
      navigate('/login', { replace: true });
      return;
    }

    storeInvitationToken(token);
    const authTokenHash = searchParams.get('auth_token_hash');
    const authType = (searchParams.get('auth_type') ?? 'invite') as 'invite' | 'magiclink';
    let isActive = true;

    const continueWithSession = async (preview: InvitationPreview) => {
      if (hasHandledSession.current || !isActive) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!isActive || hasHandledSession.current) return;

      if (!session) return;

      hasHandledSession.current = true;
      if (preview.requiresPasswordSetup) {
        try {
          await apiClient.post('/api/sponsor-invitations/accept', { token });
          markInvitationPasswordSetup();
          navigate('/invite/setup-password', { replace: true });
          return;
        } catch {
          await supabase.auth.signOut({ scope: 'local' });
          hasHandledSession.current = false;
          navigate('/login?error=invitation_claim_failed', { replace: true });
          return;
        }
      }

      try {
        await apiClient.post('/api/sponsor-invitations/accept', { token });
        clearInvitationToken();
        navigate('/onboarding', { replace: true });
      } catch {
        await supabase.auth.signOut({ scope: 'local' });
        hasHandledSession.current = false;
        navigate('/login?error=invitation_claim_failed', { replace: true });
      }
    };

    const initialize = async () => {
      try {
        const preview = await apiClient.post<InvitationPreview>('/api/sponsor-invitations/preview', { token });
        if (!isActive) return null;

        if (!preview.requiresPasswordSetup) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!isActive) return null;
          if (session) {
            await continueWithSession(preview);
            return null;
          }
          navigate('/login', { replace: true });
          return null;
        }

        if (authTokenHash) {
          setMessage('Setting up your account…');
          const { error } = await exchangeInvitationOtp(authTokenHash, authType, () =>
            supabase.auth.verifyOtp({ token_hash: authTokenHash, type: authType }));
          if (!isActive) return null;
          if (error) {
            navigate('/login?expired_auth_link=1', { replace: true });
            return null;
          }
          await continueWithSession(preview);
          return null;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
            void continueWithSession(preview);
          }
        });
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await continueWithSession(preview);
        } else {
          setMessage('Preparing your account setup…');
        }
        return subscription;
      } catch {
        setMessage('This invitation cannot be accepted. Ask your Esportra contact for a new invitation.');
        return null;
      }
    };

    let unsubscribe: (() => void) | undefined;
    void initialize().then((subscription) => {
      if (!isActive) {
        subscription?.unsubscribe();
        return;
      }
      unsubscribe = () => subscription?.unsubscribe();
    });
    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-white">
      <div className="max-w-md text-center space-y-4">
        <Loader2 className="w-7 h-7 mx-auto animate-spin text-rose-500" />
        <p className="text-sm text-zinc-300">{message}</p>
      </div>
    </div>
  );
}