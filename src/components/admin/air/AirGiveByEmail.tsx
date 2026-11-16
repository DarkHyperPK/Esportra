import { useState } from 'react';
import { CommandButton } from '@/components/management/CommandSurface';
import { useAirFindByEmail } from '@/hooks/useAirAdmin';
import type { AirGrantTarget } from './AirGrantSheet';
import { errorText, fieldClass } from './airFormat';

/** Finds an Esportra account by email (creating its Air account) so access can be given before the person opens Air. */
export function AirGiveByEmail({ onGrant }: { onGrant: (target: AirGrantTarget) => void }) {
  const find = useAirFindByEmail();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setError('Enter an email address.');
    setError('');
    try {
      const { userId } = await find.mutateAsync(value);
      onGrant({ userId, email: value, name: null, status: null, validUntil: null, trialEndsAt: null });
      setEmail('');
    } catch (err) {
      setError(errorText(err, 'No Esportra account uses that email.'));
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-start gap-2">
      <div className="min-w-[260px] flex-1">
        <input className={fieldClass} type="email" placeholder="Give access by email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email of the Esportra account" />
        {error ? <p role="alert" className="mt-1 text-xs text-rose-300">{error}</p> : null}
      </div>
      <CommandButton type="submit" size="sm" variant="secondary" disabled={find.isPending}>Give access</CommandButton>
    </form>
  );
}
