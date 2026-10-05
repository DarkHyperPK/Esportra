import { BadgeCheck, CircleDashed, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  className?: string;
}

/** How a player on a screenshot report matched the competitors' rosters (and Riot's record, once checked). */
export function VerificationBadge({ status, riotStatus, className }: Props) {
  const { label, tone, hint } = badgeFor({ status, riotStatus });
  const Icon = ICON[tone];
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
