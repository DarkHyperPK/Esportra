/**
 * TeamRecordStrip
 *
 * A team's scrim record at a glance: W-L, win rate, show rate and recent form.
 * Renders nothing when the record is hidden by the team (null/undefined).
 * Presentation comes from describeRecord; this only lays it out.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { describeRecord, type FormResult } from '@/services/scrimRecord';
import type { ScrimTeamRecord } from '@/types/competitive';

interface TeamRecordStripProps {
  record: ScrimTeamRecord | null | undefined;
  /** Rounded form pips, for the soft-cornered listing cards. */
  soft?: boolean;
  /** One compact line (no captions, small pips) for tight cards. */
  dense?: boolean;
  className?: string;
}

const PIP_STYLE: Record<FormResult, string> = {
  W: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300',
  L: 'border-white/10 bg-white/[0.04] text-zinc-500',
  D: 'border-white/10 bg-transparent text-zinc-400',
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-semibold tabular-nums text-white/85">{value}</p>
      <p className="text-[11px] font-medium text-zinc-500">{label}</p>
    </div>
  );
}

export function TeamRecordStrip({ record, soft = false, dense = false, className }: TeamRecordStripProps) {
  const reduce = useReducedMotion();
  const view = describeRecord(record);
  if (!view) return null;

  if (view.isNew) {
    return (
      <p
        className={cn('text-[11px] font-medium text-zinc-500', className)}
        aria-label={view.summary}
      >
        New to scrims
      </p>
    );
  }

  if (dense) {
    return (
      <div role="group" aria-label={view.summary} className={cn('flex items-center gap-2.5', className)}>
        <p className="shrink-0 whitespace-nowrap font-heading text-[20px] font-black leading-none tabular-nums tracking-tight text-white">{view.record}</p>
        <p className="min-w-0 flex-1 truncate text-[11px] tabular-nums text-zinc-400">
          {[view.winRate && `${view.winRate} win`, view.showRate && `${view.showRate} show`].filter(Boolean).join(' · ')}
        </p>
        {view.form.length > 0 && (
          <div className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
            {view.form.map((pip, i) => (
              <span
                key={`${i}-${pip.result}`}
                className={cn(
                  'flex h-4 w-4 items-center justify-center border font-mono text-[9px] font-bold',
                  soft && 'rounded',
                  PIP_STYLE[pip.result],
                  pip.isLatest && 'border-white/50',
                )}
              >
                {pip.result}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={view.summary}
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-white/[0.06] py-2.5', className)}
    >
      <div className="min-w-0">
        <p className="font-heading text-[22px] font-black leading-none tabular-nums tracking-tight text-white">
          {view.record}
        </p>
        <p className="mt-1 text-[11px] font-medium text-zinc-500">Record</p>
      </div>

      {view.winRate && <Stat value={view.winRate} label="Win rate" />}
      {view.showRate && <Stat value={view.showRate} label="Shows up" />}

      {view.form.length > 0 && (
        <div className="ml-auto flex items-center gap-1.5" aria-hidden="true">
          {view.streak && (
            <span
              className={cn(
                'mr-1 font-mono text-[10px] font-semibold tabular-nums',
                view.streak.kind === 'win' ? 'text-emerald-300' : 'text-zinc-400',
              )}
            >
              {view.streak.label}
            </span>
          )}
          {view.form.map((pip, i) => (
            <motion.span
              key={`${i}-${pip.result}`}
              initial={reduce ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.16, delay: reduce ? 0 : i * 0.04 }}
              className={cn(
                'flex h-5 w-5 items-center justify-center border font-mono text-[10px] font-bold',
                soft && 'rounded-md',
                PIP_STYLE[pip.result],
                pip.isLatest && 'border-white/50',
              )}
            >
              {pip.result}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}
