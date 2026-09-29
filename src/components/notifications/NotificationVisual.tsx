import { useState, type ReactNode } from 'react';
import { TONE_SURFACE, TONE_TEXT } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import type { Notification } from '@/contexts/notification-context';
import { resolveGameLogoUrl } from '@/utils/gameLogoResolver';
import { getNotificationKind } from '@/utils/notificationRegistry';
import { getNotificationSubject, initials } from '@/utils/notificationSubject';

interface NotificationVisualProps {
  notification: Notification;
  size?: 'sm' | 'lg';
}

const SIZE = { sm: 44, lg: 64 } as const;
const RING = 'shadow-[0_0_0_2px_hsl(var(--background))]';

function Monogram({ name, px, muted, className }: { name: string; px: number; muted?: boolean; className?: string }) {
  return (
    <span
      title={name}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.36) }}
      className={cn(
        'flex shrink-0 items-center justify-center border font-heading font-black tracking-tight',
        muted ? 'border-white/[0.08] bg-[#131316] text-zinc-400' : 'border-white/[0.14] bg-[#1b1b1f] text-white',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Shows who or what a notification is about (both teams, the org, the game)
 * with a small type badge in the corner. Falls back to a solid type glyph.
 */
export function NotificationVisual({ notification: n, size = 'sm' }: NotificationVisualProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const kind = getNotificationKind(n.type);
  const subject = getNotificationSubject(n);
  const px = SIZE[size];
  const Icon = kind.icon;
  const tone = n.is_read ? 'neutral' : kind.tone;

  if (subject.kind === 'glyph') {
    return (
      <span
        aria-hidden
        style={{ width: px, height: px }}
        className={cn(
          'flex shrink-0 items-center justify-center border',
          n.is_read ? 'border-white/[0.07] bg-white/[0.02] text-zinc-500' : cn(TONE_SURFACE[kind.tone], TONE_TEXT[kind.tone]),
        )}
      >
        <Icon className={size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} strokeWidth={2.25} />
      </span>
    );
  }

  let body: ReactNode;
  if (subject.kind === 'versus') {
    const fs = Math.round(px * 0.26);
    body = (
      <span
        title={`${subject.a} vs ${subject.b}`}
        style={{ width: px, height: px, fontSize: fs }}
        className="grid grid-rows-2 border border-white/[0.14] bg-[#1b1b1f] font-heading font-black leading-none tracking-tight"
      >
        <span className="flex items-center justify-center text-white">{initials(subject.a)}</span>
        <span className="flex items-center justify-center border-t border-white/[0.1] bg-[#131316] text-zinc-500">{initials(subject.b)}</span>
      </span>
    );
  } else if (subject.kind === 'game' && !logoFailed) {
    body = (
      <span style={{ width: px, height: px }} className="flex items-center justify-center border border-white/[0.1] bg-[#131316] p-1.5">
        <img
          src={resolveGameLogoUrl(subject.game)}
          alt={subject.game}
          onError={() => setLogoFailed(true)}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
        />
      </span>
    );
  } else {
    body = <Monogram name={subject.kind === 'game' ? subject.game : subject.name} px={px} />;
  }

  const badge = size === 'lg' ? 22 : 18;
  return (
    <span className="relative shrink-0" style={{ width: px, height: px }}>
      {body}
      <span aria-hidden style={{ width: badge, height: badge }} className={cn('absolute -bottom-1.5 -right-1.5 bg-background', RING)}>
        <span
          className={cn(
            'flex h-full w-full items-center justify-center border',
            tone === 'neutral' ? 'border-white/15 bg-[#1b1b1f] text-zinc-400' : cn(TONE_SURFACE[tone], TONE_TEXT[tone]),
          )}
        >
          <Icon className={size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5'} strokeWidth={2.5} />
        </span>
      </span>
    </span>
  );
}
