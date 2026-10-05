import { BadgeCheck, CircleDashed, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { badgeFor } from '@/services/scoreboardOcr';
import type { RiotStatus, VerificationStatus } from '@/types/scoreboardOcr';

const TONE = {
  good: 'text-emerald-300',
  neutral: 'text-zinc-400',
  check: 'text-amber-300',
} as const;

const ICON = { good: BadgeCheck, neutral: CircleDashed, check: ScanSearch } as const;

interface Props {
  status: VerificationStatus;
  /** Riot's own check of the match, when it has run: it outranks the screenshot's name match. */
  riotStatus?: RiotStatus | null;
  /** Icon only (dense rows); the label is the tooltip and screen-reader text. */
  compact?: boolean;
  className?: string;
}

/** How a player on a screenshot report matched the competitors' rosters (and Riot's record, once checked). */
export function VerificationBadge({ status, riotStatus, compact = false, className }: Props) {
  const { label, tone, hint } = badgeFor({ status, riotStatus });
  const Icon = ICON[tone];
  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            title={label}
            className={cn('inline-flex h-6 w-5 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40', TONE[tone], className)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 rounded-none border-white/10 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300">
          <p className={cn('font-mono text-[10px] uppercase tracking-[0.18em]', TONE[tone])}>{label}</p>
          {hint ? <p className="mt-1">{hint}</p> : null}
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <span
      title={hint}
      className={cn('inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em]', TONE[tone], className)}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
      {hint ? <span className="sr-only">. {hint}</span> : null}
    </span>
  );
}
