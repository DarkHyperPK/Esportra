import { cn } from '@/lib/utils';
import type { CompetitiveProvenance } from '@/types/competitive';

interface RankBadgeProps {
  tierDisplayName: string;
  provenance: CompetitiveProvenance;
  /** "full" = 20px hero badge; "inline" = 14px beside text */
  size?: 'full' | 'inline';
  className?: string;
}

function ProvenanceLabel({ provenance, size }: { provenance: CompetitiveProvenance; size: 'full' | 'inline' }) {
  const text =
    provenance === 'provider_verified'
      ? 'Verified'
      : provenance === 'provider_linked'
        ? 'Linked account'
        : 'Self-reported';

  const colorClass =
    provenance === 'provider_verified' || provenance === 'provider_linked'
      ? 'text-emerald-400'
      : 'text-white/35';

  return (
    <span
      className={cn(
        'font-sans not-italic',
        colorClass,
        size === 'full' ? 'text-[11px]' : 'text-[10px]',
      )}
    >
      {text}
    </span>
  );
}

function TierInitial({ displayName }: { displayName: string }) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center bg-white/[0.07] font-rajdhani text-base font-semibold text-white"
      aria-hidden
    >
      {displayName.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * RankBadge — displays a player's rank tier with mandatory provenance label.
 * Provenance must never be hidden (contractual honesty requirement).
 */
export function RankBadge({ tierDisplayName, provenance, size = 'full', className }: RankBadgeProps) {
  const bgClass =
    provenance === 'provider_verified' || provenance === 'provider_linked'
      ? 'bg-emerald-500/[0.12]'
      : 'bg-rose-500/[0.15]';

  const ariaLabel = `${tierDisplayName}, ${
    provenance === 'provider_verified'
      ? 'verified rank'
      : provenance === 'provider_linked'
        ? 'linked account rank'
        : 'self-reported rank'
  }`;

  if (size === 'full') {
    return (
      <div
        aria-label={ariaLabel}
        className={cn(
          'flex items-center gap-3 border border-white/[0.08] px-4 py-3',
          bgClass,
          className,
        )}
      >
        <TierInitial displayName={tierDisplayName} />
        <div className="flex flex-col">
          <span className="font-rajdhani text-[20px] font-bold leading-tight text-white">
            {tierDisplayName}
          </span>
          <ProvenanceLabel provenance={provenance} size="full" />
        </div>
      </div>
    );
  }

  return (
    <span
      aria-label={ariaLabel}
      className={cn('inline-flex items-baseline gap-1.5', className)}
    >
      <span className="font-rajdhani text-[14px] font-bold text-white">{tierDisplayName}</span>
      <ProvenanceLabel provenance={provenance} size="inline" />
    </span>
  );
}
