import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';

const RECOVERY_KEY = 'partner_password_recovery';

function hasRecoveryLink(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return search.get('type') === 'recovery' || hash.get('type') === 'recovery';
}

export default function Recovery() {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;
    let shouldCleanUrl = false;
    let invalidTimer: number | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem(RECOVERY_KEY, 'true');
        shouldCleanUrl = true;
      }
      if (shouldCleanUrl && session && isActive) {
        window.history.replaceState({}, '', window.location.pathname);
        shouldCleanUrl = false;
        setIsReady(true);
      }
    });

    const initialize = async () => {
      if (hasRecoveryLink()) {
        sessionStorage.setItem(RECOVERY_KEY, 'true');
        shouldCleanUrl = true;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!isActive) return;
      if (!session || sessionStorage.getItem(RECOVERY_KEY) !== 'true') {
        invalidTimer = window.setTimeout(() => {
          if (isActive) setIsInvalid(true);
        }, 1_500);
      } else {
        if (shouldCleanUrl) {
          window.history.replaceState({}, '', window.location.pathname);
          shouldCleanUrl = false;
        }
        setIsReady(true);
      }
    };

    void initialize();
    return () => {
      isActive = false;
      subscription.unsubscribe();
      if (invalidTimer) window.clearTimeout(invalidTimer);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation || password.length < 8) {
      setMessage('Use matching passwords with at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await apiClient.post('/api/auth/password-reset-completed');
      await supabase.auth.signOut({ scope: 'local' });
      sessionStorage.removeItem(RECOVERY_KEY);
      navigate('/login?success=password_updated', { replace: true });
    } catch {
      setMessage('Unable to update your password. Request a new recovery link and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInvalid) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-3xl border border-white/5 bg-[#0a0a0c] p-8">
        <div>
          <h1 className="text-xl font-bold">Reset password</h1>
          <p className="mt-1 text-sm text-zinc-400">Choose a new password for your partner account.</p>
        </div>
        {!isReady ? <Loader2 className="mx-auto animate-spin text-rose-500" /> : <>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="New password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" required />
          <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Confirm new password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" required />
          {message && <p className="text-sm text-rose-400">{message}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-rose-600 py-3 font-bold disabled:opacity-50">
            {isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </>}
      </form>
    </div>
  );
}