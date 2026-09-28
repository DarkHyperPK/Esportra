/**
 * Motion constants for QuickCreateForm.
 *
 * Design philosophy: Mechanical precision. Springs that feel engineered, not decorative.
 * Every animation value is deliberate — nothing is eyeballed or approximated.
 *
 * Naming convention: [element]-[action] (e.g., BANNER_ENTER, CHIP_PRESS)
 */

// ── Banner entrance — the one dramatic moment ─────────────────────────────────

/** Banner enters with scale + opacity, sets the tone for the whole experience */
export const BANNER_ENTER = {
  duration: 0.28,
  ease: [0, 0, 0.2, 1], // cubic-bezier(0, 0, 0.2, 1) — strong ease-out
};

// ── Spring configurations — mechanical feel ───────────────────────────────────

/** Mode chip chevron rotation — crisp, responsive */
export const SPRING_CHEVRON = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
};

/** Row expand spring — mode chip + venue address expansion */
export const SPRING_EXPAND = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 28,
};

/** Venue address reveal — slightly softer than mode expansion */
export const SPRING_VENUE = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 28,
};

/** Team count chip press — crisp snap, mechanical precision */
export const SPRING_CHIP_PRESS = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 30,
};

// ── whileTap variants — press feedback ────────────────────────────────────────

/** Format card press — scale 0.97, spring-driven */
export const CARD_STRIKE_TAP = {
  scale: 0.97,
  transition: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 32,
  },
};

/** Chip press variant — slightly more pronounced than cards */
export const CHIP_PRESS_TAP = {
  scale: 0.96,
  transition: SPRING_CHIP_PRESS,
};

// ── Legacy exports (referenced by tests + external consumers) ────────────────

/** @deprecated Use CARD_STRIKE_TAP — kept for test compatibility */
export const FORMAT_CARD_TAP = {
  scale: 0.96,
  transition: { type: 'spring' as const, stiffness: 500, damping: 32 },
};

export function fieldTransition(index: number, reducedMotion: boolean) {
  if (reducedMotion) return { duration: 0.15 };
  return {
    type: 'spring' as const,
    stiffness: 300,
    damping: 26,
    delay: 0.28 + index * 0.045,
  };
}

export function fieldInitial(reducedMotion: boolean) {
  return reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 };
}

export function fieldAnimate(reducedMotion: boolean) {
  return reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
}
