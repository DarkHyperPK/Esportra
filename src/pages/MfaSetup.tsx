/**
 * MfaSetup.tsx
 *
 * Full MFA enrollment page for admins required to set up TOTP.
 * Three-step flow: Info → QR Code → Verify
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useEnrollTotp, useVerifyTotp } from '@/hooks/useMfa';
import type { MfaEnrollment } from '@/hooks/useMfa';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Information', 'Scan QR Code', 'Verify Code'] as const;

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {STEPS.map((label, idx) => (
      <React.Fragment key={label}>
        {idx > 0 && (
          <div
            className={cn(
              'h-px w-8 transition-colors duration-300',
              idx <= currentStep ? 'bg-rose-500' : 'bg-white/10',
            )}
          />
        )}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
              idx < currentStep
                ? 'bg-rose-500 text-white'
                : idx === currentStep
                  ? 'bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/50'
                  : 'bg-white/5 text-zinc-500',
            )}
          >
            {idx < currentStep ? <Check className="w-3.5 h-3.5" /> : idx + 1}
          </div>
          <span
            className={cn(
              'text-xs font-medium hidden sm:block transition-colors duration-300',
              idx === currentStep ? 'text-white' : 'text-zinc-500',
            )}
          >
            {label}
          </span>
        </div>
      </React.Fragment>
    ))}
  </div>
);

// ── Step 1: Info ─────────────────────────────────────────────────────────────

const StepInfo = ({ onSetup, isLoading }: { onSetup: () => void; isLoading: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    className="text-center"
  >
    <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
      <Shield className="w-8 h-8 text-rose-400" />
    </div>

    <h2 className="text-2xl font-bold text-white mb-3 font-[Poppins]">
      Two-Factor Authentication Required
    </h2>

    <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mx-auto mb-8">
      Your admin role requires two-factor authentication. Set up a TOTP
      authenticator app to secure your account and continue accessing the
      admin panel.
    </p>

    <div className="space-y-3 mb-8 text-left">
      {[
        { icon: Smartphone, text: 'Download an authenticator app (Google Authenticator, Authy, 1Password)' },
        { icon: Shield, text: 'Scan a QR code to link your account' },
        { icon: ShieldCheck, text: 'Enter a verification code to confirm setup' },
      ].map(({ icon: Icon, text }, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"
        >
          <div className="p-1.5 rounded-lg bg-rose-500/10 shrink-0 mt-0.5">
            <Icon className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-sm text-zinc-300">{text}</span>
        </div>
      ))}
    </div>

    <Button
      onClick={onSetup}
      disabled={isLoading}
      className="w-full h-12 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold rounded-xl"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Setting up…
        </>
      ) : (
        <>
          Set Up Now
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </Button>
  </motion.div>
);

// ── Step 2: QR Code ──────────────────────────────────────────────────────────

const StepQrCode = ({
  enrollment,
  onNext,
}: {
  enrollment: MfaEnrollment;
  onNext: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(enrollment.totp.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const el = document.createElement('textarea');
      el.value = enrollment.totp.secret;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [enrollment.totp.secret]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
        <Smartphone className="w-8 h-8 text-rose-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 font-[Poppins]">
        Scan QR Code
      </h2>
      <p className="text-zinc-400 text-sm mb-6">
        Open your authenticator app and scan this QR code to link your account.
      </p>

      {/* QR Code */}
      <div className="mx-auto mb-6 p-4 bg-white rounded-2xl w-fit">
        <img
          src={enrollment.totp.qr_code}
          alt="TOTP QR Code — scan with your authenticator app"
          className="w-48 h-48"
          draggable={false}
        />
      </div>

      {/* Manual entry secret */}
      <div className="mb-6">
        <p className="text-xs text-zinc-500 mb-2">
          Can't scan? Enter this secret manually:
        </p>
        <div className="flex items-center justify-center gap-2">
          <code className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-rose-400 font-mono tracking-wider select-all">
            {enrollment.totp.secret}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            aria-label={copied ? 'Copied to clipboard' : 'Copy secret to clipboard'}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>
      </div>

      <Button
        onClick={onNext}
        className="w-full h-12 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-semibold rounded-xl"
      >
        I've Scanned the Code
        <ArrowRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
};

// ── Step 3: Verify ───────────────────────────────────────────────────────────

const StepVerify = ({
  factorId,
  onSuccess,
}: {
  factorId: string;
  onSuccess: () => void;
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const verify = useVerifyTotp();
  const { toast } = useToast();

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError('');

    try {
      await verify.mutateAsync({ factorId, code });
      toast({
        title: '2FA Enabled Successfully',
        description: 'Your account is now protected with two-factor authentication.',
      });
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid code. Please try again.';
      setError(message);
    }
  }, [code, factorId, verify, toast, onSuccess]);

  // Auto-submit when 6 digits entered
  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      setError('');
    },
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="text-center"
    >
      <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
        <ShieldCheck className="w-8 h-8 text-rose-400" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 font-[Poppins]">
        Verify Setup
      </h2>
      <p className="text-zinc-400 text-sm mb-8">
        Enter the 6-digit code from your authenticator app to complete setup.
      </p>

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
          'Verify & Enable 2FA'
        )}
      </Button>

      <p className="text-xs text-zinc-500 mt-4">
        Make sure the time on your device is synchronized for accurate codes.
      </p>
    </motion.div>
  );
};

// ── Main page component ──────────────────────────────────────────────────────

const MfaSetup: React.FC = () => {
  const [step, setStep] = useState(0);
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);
  const enrollTotp = useEnrollTotp();
  const navigate = useNavigate();

  const handleStartSetup = useCallback(async () => {
    try {
      const data = await enrollTotp.mutateAsync();
      setEnrollment(data);
      setStep(1);
    } catch {
      // Error is surfaced via toast or enrollment error
    }
  }, [enrollTotp]);

  const handleVerified = useCallback(() => {
    navigate('/admin/dashboard', { replace: true });
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
          <StepIndicator currentStep={step} />

          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepInfo
                key="info"
                onSetup={handleStartSetup}
                isLoading={enrollTotp.isPending}
              />
            )}
            {step === 1 && enrollment && (
              <StepQrCode
                key="qr"
                enrollment={enrollment}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && enrollment && (
              <StepVerify
                key="verify"
                factorId={enrollment.id}
                onSuccess={handleVerified}
              />
            )}
          </AnimatePresence>

          {/* Enrollment error */}
          <AnimatePresence>
            {enrollTotp.isError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="text-sm text-red-400">
                    Failed to start enrollment. Please try again.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Help link */}
        <p className="text-center text-xs text-zinc-600 mt-4">
          Need help? Contact your system administrator.
        </p>
      </motion.div>
    </div>
  );
};

export default MfaSetup;
