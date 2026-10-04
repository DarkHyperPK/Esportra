import { BadgeCheck, CircleDashed, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VERIFICATION_LABELS } from '@/services/scoreboardOcr';
import type { VerificationStatus } from '@/types/scoreboardOcr';

const TONE = {
  good: 'text-emerald-300',
  neutral: 'text-zinc-400',
  check: 'text-amber-300',
} as const;

const ICON = { good: BadgeCheck, neutral: CircleDashed, check: ScanSearch } as const;

/** How a player on a screenshot report matched the competitors' rosters. */
export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  const { label, tone } = VERIFICATION_LABELS[status];
  const Icon = ICON[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em]', TONE[tone], className)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
