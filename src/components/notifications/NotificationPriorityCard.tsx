import { formatDistanceToNowStrict, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { Clock } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { StatusPill, TONE_TEXT } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import type { Notification } from '@/contexts/notification-context';
import type { StaffInviteState } from '@/hooks/useNotificationActions';
import { getNotificationKind } from '@/utils/notificationRegistry';
import { notificationDeadline, priorityActionLabel } from '@/utils/notificationSubject';
import { getDenseScheduleNotificationMeta } from '@/utils/notificationDisplay';
import { MatchScheduleNotificationBody } from './MatchScheduleNotificationBody';
import { NotificationVisual } from './NotificationVisual';

interface NotificationPriorityCardProps {
  notification: Notification;
  compact?: boolean;
  staffInvite?: StaffInviteState;
  onOpen: (n: Notification) => void;
  onMarkRead: (n: Notification) => void;
  onRespondToStaffInvite: (n: Notification, accept: boolean) => void;
}

/**
 * An unread item that needs the user now: bigger, with who it's about, the
 * clock if there is one, and the one action that resolves it.
 */
export function NotificationPriorityCard({
  notification: n, compact, staffInvite, onOpen, onMarkRead, onRespondToStaffInvite,
}: NotificationPriorityCardProps) {
  const kind = getNotificationKind(n.type);
  const deadline = notificationDeadline(n);
  const created = parseISO(n.created_at);
  const isStaffInvite = n.type === 'staff_invite' && typeof n.data?.organization_staff_id === 'string';
  const busy = staffInvite === 'accepting' || staffInvite === 'declining';
  const resolved = staffInvite === 'accepted' || staffInvite === 'declined';

  return (
    <article
      aria-label={n.title}
      className={cn(
        'relative border border-white/[0.1] bg-[#111114]',
        compact ? 'p-4' : 'p-5',
      )}
    >
      <div className="flex gap-4">
        <NotificationVisual notification={n} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={cn('font-mono text-[10px] font-bold uppercase tracking-[0.18em]', TONE_TEXT[kind.tone])}>{kind.label}</span>
            {deadline ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
                <Clock className="h-3 w-3" aria-hidden />
                {deadline.label} in {formatDistanceToNowStrict(deadline.at)}
              </span>
            ) : isValid(created) ? (
              <span className="font-mono text-[10px] tabular-nums text-zinc-500">{formatDistanceToNow(created, { addSuffix: true })}</span>
            ) : null}
          </div>
          <h3 className={cn('mt-1.5 font-heading font-bold leading-snug tracking-tight text-white', compact ? 'text-base' : 'text-lg')}>
            {n.title}
          </h3>
          {getDenseScheduleNotificationMeta(n) ? (
            <MatchScheduleNotificationBody notification={n} compact={compact} showAction={false} />
          ) : n.message ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-zinc-400">{n.message}</p>
          ) : null}
        </div>
      </div>

      <div className={'mt-4 flex flex-wrap items-center gap-2 sm:pl-20'}>
        {isStaffInvite ? (
          resolved ? (
            <StatusPill tone={staffInvite === 'accepted' ? 'success' : 'neutral'} label={staffInvite === 'accepted' ? 'Accepted' : 'Declined'} />
          ) : (
            <>
              <CommandButton variant="primary" size="sm" slide disabled={busy} onClick={() => onRespondToStaffInvite(n, true)}>
                {staffInvite === 'accepting' ? 'Joining' : 'Accept'}
              </CommandButton>
              <CommandButton variant="ghost" size="sm" disabled={busy} onClick={() => onRespondToStaffInvite(n, false)}>
                {staffInvite === 'declining' ? 'Declining' : 'Decline'}
              </CommandButton>
            </>
          )
        ) : (
          <>
            <CommandButton variant="primary" size="sm" slide onClick={() => onOpen(n)}>{priorityActionLabel(n.type)}</CommandButton>
            <CommandButton variant="ghost" size="sm" onClick={() => onMarkRead(n)}>Mark seen</CommandButton>
          </>
        )}
      </div>
    </article>
  );
}
