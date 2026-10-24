import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ─── StatusPill ───────────────────────────────────────────────────────────────

export type StatusTone = 'accent' | 'neutral' | 'critical' | 'success';

const TONE_CLASSES: Record<StatusTone, string> = {
  accent:   'bg-rose-500/15 text-rose-400',
  neutral:  'bg-white/[0.07] text-white/40',
  critical: 'bg-amber-500/15 text-amber-400',
  success:  'bg-emerald-500/15 text-emerald-400',
};

interface StatusPillProps {
  label: string;
  tone: StatusTone;
}

/**
 * Compact status indicator used on all discovery cards.
 * Exported so card components can import it alongside GlowCard.
 */
export function StatusPill({ label, tone }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] shrink-0',
        TONE_CLASSES[tone],
      )}
    >
      {label}
    </span>
  );
}

// ─── GlowCard ─────────────────────────────────────────────────────────────────

interface GlowCardProps {
  children: ReactNode;
  /** Rose 2px accent bar at top edge — use for active-status listings only. */
  accentTop?: boolean;
  /** Layout overrides (e.g. custom padding). */
  className?: string;
}

/**
 * Shared container for all discovery cards.
 * Base: #0f0f11 bg, white/08 border, hover border brightens to white/14.
 * accentTop: replaces top border with a 2px rose bar (active-status signal).
 * Border radius: none (brand invariant — square corners).
 */
export function GlowCard({ children, accentTop, className }: GlowCardProps) {
  return (
    <div
      className={cn(
        'bg-[#0f0f11] border border-white/[0.08] hover:border-white/[0.14] transition-colors duration-150 p-4',
        accentTop && 'border-t-2 border-t-[#FF2D55]',
        className,
      )}
    >
      {children}
    </div>
  );
}
