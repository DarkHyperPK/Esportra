import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import {
  clearInvitationPasswordSetup,
  clearInvitationToken,
  hasInvitationPasswordSetup,
  readInvitationToken,
} from '@/lib/partnerInvitation';

export default function InvitePasswordSetup() {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsReady(Boolean(session && hasInvitationPasswordSetup()));
    };
    void initialize();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation || password.length < 8) {
      setMessage('Use matching passwords with at least 8 characters.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setIsReady(false);
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const invitationToken = readInvitationToken();
      if (!invitationToken) throw new Error('Invitation token is missing.');

      await apiClient.post('/api/sponsor-invitations/accept', { token: invitationToken });
      clearInvitationToken();
      await apiClient.postWithToken('/api/auth/password-reset-completed', session.access_token);

      await supabase.auth.signOut({ scope: 'local' });
      clearInvitationPasswordSetup();
      navigate('/login?accepted=1', { replace: true });
    } catch {
      setMessage('Unable to set your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-3xl border border-white/5 bg-[#0a0a0c] p-8">
        <div>
          <h1 className="text-xl font-bold">Set your password</h1>
          <p className="mt-1 text-sm text-zinc-400">Finish setting up your partner account.</p>
        </div>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="New password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" required />
        <input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" placeholder="Confirm new password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3" required />
        {message && <p className="text-sm text-rose-400">{message}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-rose-600 py-3 font-bold disabled:opacity-50">
          {isSubmitting ? 'Setting password…' : 'Set password'}
        </button>
      </form>
    </div>
  );
}