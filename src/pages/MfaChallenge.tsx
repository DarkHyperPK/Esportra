/**
 * MfaChallenge.tsx
 *
 * MFA challenge page for admins who already have TOTP enrolled
 * but logged in with password only (aal1). They need to verify
 * with their authenticator to upgrade to aal2.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useMfaFactors, useVerifyTotp } from '@/hooks/useMfa';
import { useToast } from '@/hooks/use-toast';

// ── Loading skeleton ─────────────────────────────────────────────────────────

const ChallengeSkeleton = () => (
  <div className="text-center animate-pulse">
    <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-white/5" />
    <div className="h-7 w-48 mx-auto mb-3 rounded-lg bg-white/5" />
    <div className="h-4 w-64 mx-auto mb-8 rounded bg-white/5" />
    <div className="flex justify-center gap-2 mb-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-12 h-14 rounded-lg bg-white/5" />
      ))}
    </div>
    <div className="h-12 w-full rounded-xl bg-white/5" />
  </div>
);

// ── Error state ──────────────────────────────────────────────────────────────

const ChallengeError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="text-center">
    <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
      <AlertTriangle className="w-8 h-8 text-red-400" />
    </div>
    <h2 className="text-xl font-bold text-white mb-2 font-[Poppins]">
      Verification Error
    </h2>
    <p className="text-zinc-400 text-sm mb-6">{message}</p>
    <Button
      onClick={onRetry}
      variant="outline"
      className="border-white/10 hover:bg-white/5"
    >
      <RefreshCw className="w-4 h-4" />
      Try Again
    </Button>
  </div>
);

// ── Main challenge page ──────────────────────────────────────────────────────

const MfaChallenge: React.FC = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const {
    data: factors,
    isLoading: loadingFactors,
    isError: factorsError,
    refetch: refetchFactors,
  } = useMfaFactors();
  const verify = useVerifyTotp();

  // Determine where to redirect after successful challenge
  const returnTo =
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    '/admin/dashboard';

  // Get the first verified TOTP factor
  const activeFactor = factors?.find((f) => f.status === 'verified') ?? factors?.[0];

  // If no factors exist, redirect to setup instead
  useEffect(() => {
    if (!loadingFactors && factors && factors.length === 0) {
      navigate('/mfa/setup', { replace: true });
    }
  }, [loadingFactors, factors, navigate]);

  const handleVerify = useCallback(async () => {
    if (!activeFactor) return;
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError('');

    try {
      await verify.mutateAsync({ factorId: activeFactor.id, code });
      toast({
        title: 'Identity Verified',
        description: 'You are now authenticated with two-factor verification.',
      });
      navigate(returnTo, { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid code. Please try again.';
      setError(message);
      setCode('');
    }
  }, [code, activeFactor, verify, toast, navigate, returnTo]);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
    setError('');
  }, []);

  const handleSignOut = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    navigate('/auth/signin', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 sm:p-6">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-rose-600/8 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/5 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="p-8 sm:p-10 rounded-3xl bg-[#0a0a0c] border border-white/5 shadow-2xl shadow-black/50 backdrop-blur-sm">
          {loadingFactors ? (
            <ChallengeSkeleton />
          ) : factorsError ? (
            <ChallengeError
              message="Could not load your authentication factors."
              onRetry={() => refetchFactors()}
            />
          ) : !activeFactor ? (
            <div className="text-center">
              <div className="text-zinc-400 text-sm">Redirecting to setup...</div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Icon */}
              <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-rose-400" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2 font-[Poppins]">
                Verify Your Identity
              </h2>
              <p className="text-zinc-400 text-sm mb-8">
                Enter the 6-digit code from your authenticator app to continue.
              </p>

              {/* Factor info */}
              {activeFactor.friendly_name && (
                <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-zinc-400">
                    {activeFactor.friendly_name}
                  </span>
                </div>
              )}

              {/* OTP Input */}
              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={handleCodeChange}
                  autoFocus
                >
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={0}
                      className="w-12 h-14 text-lg font-semibold bg-white/5 border-white/10 text-white"
                    />
                    <InputOTPSlot
                      index={1}
                      className="w-12 h-14 text-lg font-semibold bg-white/5 border-white/10 text-white"
                    />
                    <InputOTPSlot
                      index={2}
                      className="w-12 h-14 text-lg font-semibold bg-white/5 border-white/10 text-white"
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator className="text-zinc-600" />
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={3}
                      className="w-12 h-14 text-lg font-semibold bg-white/5 border-white/10 text-white"
                    />
                    <InputOTPSlot
                      index={4}
                      className="w-12 h-14 text-lg font-semibold bg-white/5 border-white/10 text-white"
                    />
                    <InputOTPSlot
                      index={5}
                      className="w-12 h-14 text-lg font-semibold bg-white/5 border-white/10 text-white"
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="text-sm text-red-400">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Verify button */}
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || verify.isPending}
                className="w-full h-12 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {verify.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  'Verify'
                )}
              </Button>

              {/* Sign out link */}
              <button
                type="button"
                onClick={handleSignOut}
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Sign in with a different account
              </button>
            </motion.div>
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-zinc-600 mt-4">
          Lost access to your authenticator? Contact your system administrator.
        </p>
      </motion.div>
    </div>
  );
};

export default MfaChallenge;
