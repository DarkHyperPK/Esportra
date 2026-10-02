/**
 * Motion for the broadcast OBS overlay. Every move maps to a broadcast beat:
 * a card settles (punch + flash), a ban is struck (colour drains, slash wipes
 * down, stamp slams), a pick is lit, the decider pulses, and the moment is
 * announced in the lower band (wipe in, hold, wipe out — exit faster than entry).
 */
export const BROADCAST_OVERLAY_CSS = `
@keyframes bcv-card-in { from { opacity: 0; transform: translate3d(0, 2.4vh, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-up { from { opacity: 0; transform: translate3d(0, 4vh, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-left { from { opacity: 0; transform: translate3d(-5vw, 0, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-right { from { opacity: 0; transform: translate3d(5vw, 0, 0); } to { opacity: 1; transform: none; } }

@keyframes bcv-punch { 0% { transform: scale(1.09); } 55% { transform: scale(0.985); } 100% { transform: scale(1); } }
@keyframes bcv-flash { 0% { opacity: 0.9; } 100% { opacity: 0; } }
@keyframes bcv-desat {
  0% { filter: grayscale(0) brightness(1.25); }
  35% { filter: grayscale(0) brightness(1.1); }
  100% { filter: grayscale(1) brightness(1); }
}
@keyframes bcv-dim { from { opacity: 0; } to { opacity: 1; } }
@keyframes bcv-wipe-down { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes bcv-slam {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(-22deg) scale(2.4); }
  55% { opacity: 1; transform: translate(-50%, -50%) rotate(-6deg) scale(0.9); }
  78% { transform: translate(-50%, -50%) rotate(-9deg) scale(1.04); }
  100% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(1); }
}
@keyframes bcv-ring {
  from { opacity: 0.9; transform: translate(-50%, -50%) rotate(-8deg) scale(1); }
  to { opacity: 0; transform: translate(-50%, -50%) rotate(-8deg) scale(1.9); }
}
@keyframes bcv-rise { from { opacity: 0; transform: translateY(1.4vh); } to { opacity: 1; transform: none; } }
@keyframes bcv-lit {
  0% { box-shadow: inset 0 0 0 3px rgba(255,255,255,0.95), 0 0 3.2vw rgba(255,255,255,0.4); }
  100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 0 rgba(255,255,255,0); }
}
@keyframes bcv-decider-pulse {
  0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.85); }
  100% { box-shadow: 0 0 0 1.8vw rgba(244,63,94,0); }
}
@keyframes bcv-caption-flash {
  0%, 35% { background: #f43f5e; color: #fff; }
  100% { background: transparent; }
}
@keyframes bcv-blink { 50% { opacity: 0; } }

@keyframes bcv-banner-in { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes bcv-banner-out { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 0 0 100%); } }
@keyframes bcv-banner-text { from { opacity: 0; transform: translateX(-2.5vw); } to { opacity: 1; transform: none; } }
@keyframes bcv-push-in { from { transform: scale(1.18); } to { transform: scale(1); } }

.bcv-card { animation: bcv-card-in 420ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-enter-up { animation: bcv-enter-up 600ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-enter-left { animation: bcv-enter-left 600ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-enter-right { animation: bcv-enter-right 600ms cubic-bezier(0.2, 0, 0, 1) both; }

.bcv-reveal { animation: bcv-punch 560ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-reveal-flash { animation: bcv-flash 650ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-reveal-desat { animation: bcv-desat 900ms cubic-bezier(0.4, 0, 0.2, 1) both; }
.bcv-reveal-dim { animation: bcv-dim 700ms cubic-bezier(0.4, 0, 0.2, 1) 200ms both; }
.bcv-reveal-slash { animation: bcv-wipe-down 420ms cubic-bezier(0.7, 0, 0.2, 1) 280ms both; }
.bcv-reveal-stamp { animation: bcv-slam 560ms cubic-bezier(0.2, 0, 0, 1) 520ms both; }
.bcv-reveal-ring { animation: bcv-ring 650ms cubic-bezier(0.2, 0, 0, 1) 820ms both; }
.bcv-reveal-rise { animation: bcv-rise 420ms cubic-bezier(0.2, 0, 0, 1) 360ms both; }
.bcv-reveal-lit { animation: bcv-lit 1400ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-reveal-decider { animation: bcv-decider-pulse 900ms cubic-bezier(0.2, 0, 0, 1) 2 both; }
.bcv-caption-flash { animation: bcv-caption-flash 1600ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-cursor { animation: bcv-blink 1s steps(1) infinite; }

.bcv-banner-in { animation: bcv-banner-in 460ms cubic-bezier(0.7, 0, 0.2, 1) both; }
.bcv-banner-out { animation: bcv-banner-out 340ms cubic-bezier(0.4, 0, 1, 1) both; }
.bcv-banner-text { animation: bcv-banner-text 420ms cubic-bezier(0.2, 0, 0, 1) 220ms both; }
.bcv-banner-art { animation: bcv-push-in 3000ms linear both; }

@media (prefers-reduced-motion: reduce) {
  [class*="bcv-"] { animation-duration: 1ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important; }
}
`;

export const overlayEnterClass = (transition: "none" | "up" | "left" | "right") =>
  transition === "none" ? "" : `bcv-enter-${transition}`;

/** Broadcast short code: initials of a multi-word name, else the first letters. */
export const teamCode = (name: string) => {
  const clean = name.trim();
  const initials = clean
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  if (initials.length >= 2) return initials.slice(0, 4);
  return clean.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "TEAM";
};

export const sideCode = (side?: "attack" | "defend" | null) =>
  side === "attack" ? "ATK" : side === "defend" ? "DEF" : "";
