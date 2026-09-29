/**
 * Esportra kit tokens.
 *
 * Colour is meaning, not decoration:
 *   accent   = brand / "you are here" / the one primary choice
 *   success  = done or healthy
 *   warning  = needs attention soon
 *   critical = blocked or destructive
 *   neutral  = everything else
 *
 * Type scale (use these, not ad-hoc sizes):
 *   display  font-heading 30–48px black   — one per screen, the thing being made
 *   title    font-heading 18–20px bold    — section and card titles
 *   body     14px                         — sentences, field values
 *   label    13px medium zinc-200         — field labels (sentence case)
 *   hint     12px zinc-500                — help text under a field
 *   eyebrow  10px mono caps zinc-500      — context above a title, stat captions
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

/** Raised surface for panels and cards — token-based, no hard-coded hex. */
export const PANEL_CLASS = 'border border-white/[0.07] bg-card/70 backdrop-blur-sm';

/** Mono uppercase micro-label: context above a title, stat captions. Never for field labels. */
export const EYEBROW_CLASS = 'font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500';

/** Field label: sentence case, readable, quiet. */
export const LABEL_CLASS = 'text-[13px] font-medium text-zinc-200';

/** Help text under a field. */
export const HINT_CLASS = 'text-xs leading-relaxed text-zinc-500';

/** Every text-like control (Input, Textarea, SelectTrigger) uses this so forms read as one system. */
export const CONTROL_CLASS =
  'h-11 rounded-none border-white/10 bg-black/30 text-[15px] text-white placeholder:text-zinc-600 transition-colors ' +
  'hover:border-white/20 focus-visible:border-rose-400/60 focus-visible:ring-0 focus-visible:ring-offset-0 ' +
  '[color-scheme:dark] disabled:cursor-not-allowed disabled:opacity-50';

export const CONTROL_ERROR_CLASS = 'border-red-500/70 hover:border-red-500/70';

/** Readable measure for forms: wide enough to breathe, narrow enough to read. */
export const FORM_MEASURE_CLASS = 'max-w-3xl';
