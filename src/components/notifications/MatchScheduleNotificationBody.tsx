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

export function MatchScheduleNotificationBody({
  notification,
  compact = false,
  showAction = true,
}: MatchScheduleNotificationBodyProps) {
  const meta = getDenseScheduleNotificationMeta(notification);
  if (!meta) return null;

  return (
    <div className={cn('space-y-1', compact ? 'mt-1' : 'mt-1.5')}>
      {meta.detailLines.map((line) => (
        <p
          key={line}
          className={cn(
            'text-sky-300/80 leading-relaxed',
            compact ? 'text-[11px]' : 'text-xs sm:text-sm',
          )}
        >
          {line}
        </p>
      ))}
      {showAction && (
        <div className="flex items-center gap-1 text-sky-400 text-[10px] font-medium uppercase tracking-wider pt-0.5">
          <span>{meta.actionLabel}</span>
          <ArrowRight className="h-2.5 w-2.5" />
        </div>
      )}
    </div>
  );
}
