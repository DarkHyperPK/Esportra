import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_SURFACE, TONE_TEXT, type Tone } from './tone';

type NoticeTone = Extract<Tone, 'neutral' | 'success' | 'warning' | 'critical'>;

interface InlineNoticeProps {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

const ICONS: Record<NoticeTone, typeof Info> = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertCircle,
};

/** A short message tied to the content around it. One sentence, one optional action. */
export function InlineNotice({ tone = 'neutral', title, children, action, className }: InlineNoticeProps) {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === 'critical' ? 'alert' : 'note'}
      className={cn('flex items-start gap-3 border px-4 py-3', TONE_SURFACE[tone], className)}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONE_TEXT[tone])} aria-hidden />
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-zinc-300">
        {title && <p className={cn('font-semibold', TONE_TEXT[tone])}>{title}</p>}
        <div>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
