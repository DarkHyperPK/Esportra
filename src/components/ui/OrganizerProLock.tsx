import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrganizerProLockProps {
  feature: string;
  className?: string;
}

/**
 * Inline lock block shown when an Organizer Pro feature is gated.
 * No rose anywhere — neutral tone only.
 */
export function OrganizerProLock({ feature, className }: OrganizerProLockProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 border border-white/10 bg-white/[0.02] px-4 py-3',
        className,
      )}
      role="note"
      aria-label={`${feature} requires Organizer Pro`}
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-mono font-semibold uppercase tracking-[0.18em] text-zinc-500">
          ORGANIZER PRO REQUIRED
        </p>
        <p className="mt-0.5 text-[13px] text-zinc-400">
          {feature} require{feature.endsWith('s') ? '' : 's'} Organizer Pro.{' '}
          <a
            href="/contact"
            className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors"
          >
            Contact us to unlock.
          </a>
        </p>
      </div>
    </div>
  );
}
