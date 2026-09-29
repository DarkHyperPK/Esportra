import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDenseScheduleNotificationMeta } from '@/utils/notificationDisplay';

interface MatchScheduleNotificationBodyProps {
  notification: {
    type?: string;
    title?: string;
    message?: string | null;
    data?: Record<string, unknown> | null;
  };
  compact?: boolean;
  showAction?: boolean;
}

/** Structured lines for schedule, BR lobby and walkover notifications: stage, matchup, time. */
export function MatchScheduleNotificationBody({
  notification,
  compact = false,
  showAction = true,
}: MatchScheduleNotificationBodyProps) {
  const meta = getDenseScheduleNotificationMeta(notification);
  if (!meta) return null;

  return (
    <div className={cn('space-y-0.5', compact ? 'mt-1' : 'mt-1.5')}>
      {meta.detailLines.map((line, i) => (
        <p
          key={line}
          className={cn(
            'leading-relaxed',
            i === meta.detailLines.length - 1 ? 'font-mono tabular-nums text-zinc-200' : 'text-zinc-400',
            compact ? 'text-xs' : 'text-[13px]',
          )}
        >
          {line}
        </p>
      ))}
      {showAction && (
        <p className="flex items-center gap-1 pt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          {meta.actionLabel}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </p>
      )}
    </div>
  );
}
