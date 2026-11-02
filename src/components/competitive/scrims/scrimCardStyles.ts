/**
 * Depth layering for management cards: raised surface over the stage-black ground,
 * a one-pixel top highlight, hairline border and hover lift.
 */
export const SCRIM_CARD_CLASS =
  'relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-white/[0.055] to-white/[0.02] ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] transition-all duration-200 ' +
  'hover:border-white/[0.16] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_24px_-12px_rgba(0,0,0,0.8)]';

/** Mono-caps eyebrow used for card section labels. */
export const SCRIM_EYEBROW = 'font-mono text-[10px] uppercase tracking-[0.22em] text-white/30';
