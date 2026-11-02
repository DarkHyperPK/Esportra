/**
 * UpNextStrip
 *
 * The single most important scrim action for the caller's team, with a count of
 * what else is waiting. Renders nothing when there is nothing to do.
 * Data comes in via props; the page owns the query (useScrimUpNext).
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Countdown } from '@/components/ui/Countdown';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { describeUpNext } from '@/services/scrimUpNext';
import type { ScrimUpNextItem } from '@/types/competitive';

interface UpNextStripProps {
  lead: ScrimUpNextItem | null;
  /** How many more items are waiting behind the lead. */
  more: number;
  /** Called when a live countdown ends, so the queue can refresh. */
  onDeadlinePassed?: () => void;
  className?: string;
}

function OpponentCrest({ name, logo }: { name: string | null; logo: string | null }) {
  const initials = (name ?? '?').slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.06] font-mono text-[12px] font-semibold text-white/60"
    >
      {logo ? <img src={logo} alt="" className="h-full w-full object-contain p-1" /> : initials}
    </span>
  );
}

export function UpNextStrip({ lead, more, onDeadlinePassed, className }: UpNextStripProps) {
  const reduce = useReducedMotion();
  if (!lead) return null;

  const view = describeUpNext(lead);
  const showCountdown = lead.type === 'checkin_open' && !!lead.deadline;

  return (
    <motion.section
      aria-label="Up next"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'relative flex flex-col gap-4 border bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5',
        view.urgent ? 'border-white/[0.16]' : 'border-white/[0.08]',
        className,
      )}
    >
      {view.urgent && (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-rose-500" />
      )}

      <OpponentCrest name={lead.opponentName} logo={lead.opponentLogo} />

      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn(EYEBROW_CLASS, 'flex items-center gap-2')}>
          {view.urgent && (
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          )}
          Up next
          {more > 0 && <span className="text-zinc-600">· {more} more waiting</span>}
        </p>
        <h2 className="font-heading text-[16px] font-bold leading-tight text-white sm:text-[18px]">
          {view.title}
        </h2>
        <p className="text-[13px] leading-snug text-zinc-400">{view.detail}</p>
      </div>

      <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
        {showCountdown && lead.deadline && (
          <Countdown
            targetDate={lead.deadline}
            onComplete={onDeadlinePassed}
            className="text-[13px] text-white/70"
          />
        )}
        <Link
          to={view.href}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-white px-5 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-black transition-colors hover:bg-rose-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#08080a]"
        >
          {view.cta}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        {more > 0 && (
          <Link
            to="/competitive/scrims/workspace"
            className="text-[12px] text-zinc-500 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            See all
          </Link>
        )}
      </div>
    </motion.section>
  );
}
