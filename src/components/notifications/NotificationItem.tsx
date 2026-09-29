import { useState } from 'react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { CommandButton, CommandIconButton } from '@/components/management/CommandSurface';
import { StatusPill, TONE_TEXT } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import type { Notification } from '@/contexts/notification-context';
import type { StaffInviteState } from '@/hooks/useNotificationActions';
import { getNotificationKind } from '@/utils/notificationRegistry';
import { getDenseScheduleNotificationMeta } from '@/utils/notificationDisplay';
import { MatchScheduleNotificationBody } from './MatchScheduleNotificationBody';
import { NotificationVisual } from './NotificationVisual';

interface NotificationItemProps {
  notification: Notification;
  density?: 'compact' | 'comfortable';
  staffInvite?: StaffInviteState;
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  onOpen: (n: Notification) => void;
  onMarkRead: (n: Notification) => void;
  onRespondToStaffInvite: (n: Notification, accept: boolean) => void;
  onDelete?: (n: Notification) => void;
}

function relativeTime(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
}

/**
 * One notification. The row itself is a button (open); its actions sit beside
 * it, never inside it. Unread carries the only rose cue: a 2px inset rule.
 */
export function NotificationItem({
  notification: n, density = 'comfortable', staffInvite, selectable, selected, onSelectedChange,
  onOpen, onMarkRead, onRespondToStaffInvite, onDelete,
}: NotificationItemProps) {
  const [expanded, setExpanded] = useState(false);
  const kind = getNotificationKind(n.type);
  const compact = density === 'compact';
  const hasSchedule = Boolean(getDenseScheduleNotificationMeta(n));
  const isAnnouncement = n.type === 'tournament_announcement';
  const isPendingStaffInvite = n.type === 'staff_invite' && typeof n.data?.organization_staff_id === 'string'
    && staffInvite !== 'accepted' && staffInvite !== 'declined';
  const busy = staffInvite === 'accepting' || staffInvite === 'declining';

  const handleMain = () => {
    if (isAnnouncement) {
      setExpanded((v) => !v);
      onMarkRead(n);
      return;
    }
    if (isPendingStaffInvite) {
      onMarkRead(n);
      return;
    }
    onOpen(n);
  };

  const iconWell = <NotificationVisual notification={n} />;

  return (
    <li
      className={cn(
        'group relative flex gap-3 border-b border-white/[0.05] transition-colors last:border-b-0',
        compact ? 'px-4 py-3 sm:px-5' : 'px-4 py-4 sm:px-5',
        !n.is_read && 'bg-white/[0.025] shadow-[inset_2px_0_0_rgb(244,63,94)]',
        selected && 'bg-white/[0.05]',
      )}
    >
      {selectable && (
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelectedChange?.(v === true)}
          aria-label={`Select “${n.title}”`}
          className="mt-2.5 rounded-none border-white/25 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-matte-black"
        />
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleMain}
          aria-expanded={isAnnouncement ? expanded : undefined}
          className="flex w-full gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {iconWell}
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className={cn('font-mono text-[10px] font-semibold uppercase tracking-[0.16em]', n.is_read ? 'text-zinc-600' : TONE_TEXT[kind.tone])}>
                {kind.label}
                {!n.is_read && <span className="sr-only">, unread</span>}
              </span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">{relativeTime(n.created_at)}</span>
            </span>
            <span className={cn('mt-1 block leading-snug', compact ? 'text-[13px]' : 'text-sm', n.is_read ? 'text-zinc-300' : 'font-semibold text-white')}>
              {n.title}
            </span>
            {hasSchedule ? (
              <MatchScheduleNotificationBody notification={n} compact={compact} showAction={false} />
            ) : n.message ? (
              <span className={cn('mt-1 block whitespace-pre-wrap break-words text-zinc-400', compact ? 'text-xs' : 'text-[13px]', !expanded && 'line-clamp-2')}>
                {n.message}
              </span>
            ) : null}
          </span>
        </button>

        {(isAnnouncement || isPendingStaffInvite || staffInvite === 'accepted' || staffInvite === 'declined') && (
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-[3.5rem]">
            {isAnnouncement && (
              <>
                <CommandButton variant="ghost" size="sm" onClick={handleMain} aria-expanded={expanded}>
                  {expanded ? 'Show less' : 'Read more'}
                </CommandButton>
                {expanded && n.link && (
                  <CommandButton variant="secondary" size="sm" slide onClick={() => onOpen(n)}>View tournament</CommandButton>
                )}
              </>
            )}
            {isPendingStaffInvite && (
              <>
                <CommandButton variant="primary" size="sm" slide disabled={busy} onClick={() => onRespondToStaffInvite(n, true)}>
                  {staffInvite === 'accepting' ? 'Joining' : 'Accept'}
                </CommandButton>
                <CommandButton variant="ghost" size="sm" disabled={busy} onClick={() => onRespondToStaffInvite(n, false)}>
                  {staffInvite === 'declining' ? 'Declining' : 'Decline'}
                </CommandButton>
              </>
            )}
            {staffInvite === 'accepted' && <StatusPill tone="success" label="Accepted" />}
            {staffInvite === 'declined' && <StatusPill tone="neutral" label="Declined" />}
          </div>
        )}
      </div>

      {selectable && !onDelete && <span aria-hidden className="w-9 shrink-0" />}
      {onDelete && (
        <CommandIconButton
          label={`Delete “${n.title}”`}
          variant="ghost"
          onClick={() => onDelete(n)}
          className="shrink-0 self-start border-transparent bg-transparent text-zinc-500 hover:text-white lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
        >
          <Trash2 aria-hidden />
        </CommandIconButton>
      )}
    </li>
  );
}
