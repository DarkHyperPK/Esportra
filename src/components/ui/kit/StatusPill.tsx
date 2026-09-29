import { cn } from '@/lib/utils';
import { TONE_DOT, TONE_SURFACE, TONE_TEXT, type Tone } from './tone';

interface StatusPillProps {
  label: string;
  tone: Tone;
  className?: string;
}

export function StatusPill({ label, tone, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]',
        TONE_SURFACE[tone],
        TONE_TEXT[tone],
        className,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} />
      {label}
    </span>
  );
}
