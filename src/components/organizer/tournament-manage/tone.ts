/**
 * Semantic colour for the tournament dashboard.
 * accent = brand / "you are here", success = done or healthy,
 * warning = needs attention, critical = blocked or destructive.
 */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'critical';

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-zinc-500',
  accent: 'bg-rose-500',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  critical: 'bg-red-500',
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-zinc-300',
  accent: 'text-rose-300',
  success: 'text-emerald-300',
  warning: 'text-amber-200',
  critical: 'text-red-300',
};

export const TONE_SURFACE: Record<Tone, string> = {
  neutral: 'border-white/10 bg-white/[0.03]',
  accent: 'border-rose-500/30 bg-rose-500/10',
  success: 'border-emerald-500/30 bg-emerald-500/10',
  warning: 'border-amber-400/30 bg-amber-400/10',
  critical: 'border-red-500/30 bg-red-500/10',
};

/** Shared surface for dashboard panels — token-based, no hard-coded hex. */
export const PANEL_CLASS = 'border border-white/[0.07] bg-card/70 backdrop-blur-sm';

/** Mono uppercase micro-label used for every section and stat caption. */
export const EYEBROW_CLASS = 'font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500';
