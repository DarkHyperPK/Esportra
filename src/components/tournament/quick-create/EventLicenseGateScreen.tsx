import { CalendarOff, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type GateReason = 'quota_exhausted' | 'bracket_upgrade_required';

interface EventLicenseGateScreenProps {
  reason: GateReason;
  resetsAt?: string; // ISO 8601, only present for quota_exhausted
}

function formatResetDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Shown when tournament creation returns 402.
 * Follows the CreateGateScreen layout. No toast — this screen is the complete response.
 */
export function EventLicenseGateScreen({ reason, resetsAt }: EventLicenseGateScreenProps) {
  const reducedMotion = useReducedMotion();

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.2 },
      };

  const isQuotaExhausted = reason === 'quota_exhausted';
  const formattedDate = resetsAt ? formatResetDate(resetsAt) : '';

  return (
    <motion.div
      className="mx-auto w-full max-w-xl px-4 py-16 sm:py-24"
      {...motionProps}
    >
      <div className="mb-8 flex h-14 w-14 items-center justify-center bg-white/[0.04] text-rose-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
        {isQuotaExhausted ? (
          <CalendarOff className="h-6 w-6" aria-hidden />
        ) : (
          <Users className="h-6 w-6" aria-hidden />
        )}
      </div>

      <p className={EYEBROW_CLASS}>
        {isQuotaExhausted ? 'QUOTA REACHED' : 'BRACKET TOO LARGE'}
      </p>

      <h1 className="mt-3 font-heading text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
        {isQuotaExhausted
          ? "You've used both events this month"
          : 'Events with more than 32 teams require a paid bracket'}
      </h1>

      <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
        {isQuotaExhausted ? (
          <>
            Free accounts can create 2 events per month.
            {formattedDate && ` Your quota resets on ${formattedDate}.`}{' '}
            Contact us for Organizer Pro, which removes the monthly limit.
          </>
        ) : (
          'The free tier supports events up to 32 teams. Brackets above this size are priced per event. Contact us to discuss pricing for your event size.'
        )}
      </p>

      <CommandButton variant="primary" size="md" slide asChild className="mt-8">
        <a href="/contact">Contact us</a>
      </CommandButton>

      <p className="mt-4 text-xs text-zinc-500">
        {isQuotaExhausted ? (
          'Already created events are unaffected.'
        ) : (
          <>
            See{' '}
            <Link to="/pricing" className="underline underline-offset-2 hover:text-zinc-300 transition-colors">
              pricing
            </Link>{' '}
            for bracket tier prices.
          </>
        )}
      </p>
    </motion.div>
  );
}
