import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RecoveryFactor } from '@/hooks/usePasswordRecovery';

interface MfaTotpChallengeProps {
  factors: RecoveryFactor[];
  selectedFactorId: string | null;
  isVerifying: boolean;
  error: string | null;
  onSelectFactor: (factorId: string) => void;
  onVerify: (code: string) => Promise<boolean>;
}

export function MfaTotpChallenge({
  factors,
  selectedFactorId,
  isVerifying,
  error,
  onSelectFactor,
  onVerify,
}: MfaTotpChallengeProps) {
  const [code, setCode] = useState('');
  const isValidCode = /^\d{6}$/.test(code);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidCode || isVerifying) return;
    await onVerify(code);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-start gap-3 border border-amber-500/20 bg-amber-500/10 p-4">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-sm leading-relaxed text-zinc-300">
            This account has two-factor authentication enabled. Enter the six-digit code from the authenticator app before setting a new password.
          </p>
        </div>
      </div>

      {factors.length > 1 && (
        <div className="space-y-2">
          <label htmlFor="recovery-factor" className="text-sm font-medium text-white/70">
            Authenticator
          </label>
          <select
            id="recovery-factor"
            value={selectedFactorId ?? ''}
            onChange={(event) => onSelectFactor(event.target.value)}
            disabled={isVerifying}
            className="h-12 w-full border border-zinc-800 bg-zinc-900/50 px-3 text-white focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            {factors.map((factor) => (
              <option key={factor.id} value={factor.id}>{factor.friendlyName}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="mfa-code" className="text-sm font-medium text-white/70">
          Authentication code
        </label>
        <Input
          id="mfa-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          disabled={isVerifying}
          className="h-12 bg-zinc-900/50 text-center font-mono text-lg tracking-[0.35em]"
        />
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={!isValidCode || isVerifying} className="h-12 w-full">
        {isVerifying ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Verifying...
          </>
        ) : 'Verify and continue'}
      </Button>
    </form>
  );
}
