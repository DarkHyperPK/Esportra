/**
 * Motion for the broadcast OBS overlay. Slots never move; a decision fills its
 * slot in place (art wipes up, ban drains and is struck, stamp slams), the slot
 * on the clock breathes, and each moment is announced in the lower band
 * (wipe in, hold, wipe out — exit faster than entry).
 */
export const BROADCAST_OVERLAY_CSS = `
@keyframes bcv-enter-up { from { opacity: 0; transform: translate3d(0, 4vh, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-left { from { opacity: 0; transform: translate3d(-5vw, 0, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-right { from { opacity: 0; transform: translate3d(5vw, 0, 0); } to { opacity: 1; transform: none; } }

@keyframes bcv-fill { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes bcv-settle { from { transform: scale(1.16); } to { transform: scale(1); } }
@keyframes bcv-drain { from { filter: grayscale(0) brightness(1.15); } to { filter: grayscale(1) brightness(1); } }
@keyframes bcv-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes bcv-wipe-down { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes bcv-flash { 0% { opacity: 0; } 30% { opacity: 0.85; } 100% { opacity: 0; } }
@keyframes bcv-slam {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(-22deg) scale(2.3); }
  60% { opacity: 1; transform: translate(-50%, -50%) rotate(-6deg) scale(0.93); }
  100% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(1); }
}
@keyframes bcv-ring {
  from { opacity: 0.85; transform: translate(-50%, -50%) rotate(-8deg) scale(1); }
  to { opacity: 0; transform: translate(-50%, -50%) rotate(-8deg) scale(1.9); }
}
@keyframes bcv-rise { from { opacity: 0; transform: translateY(1.4vh); } to { opacity: 1; transform: none; } }
@keyframes bcv-lit {
  0% { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 rgba(255,255,255,0); }
  35% { box-shadow: inset 0 0 0 3px rgba(255,255,255,0.95), 0 0 3.2vw rgba(255,255,255,0.35); }
  100% { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 0 rgba(255,255,255,0); }
}
@keyframes bcv-decider-pulse {
  0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.85); }
  100% { box-shadow: 0 0 0 1.8vw rgba(244,63,94,0); }
}
@keyframes bcv-breathe {
  from { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35), 0 0 0 rgba(255,255,255,0); }
  to { box-shadow: inset 0 0 0 2px rgba(255,255,255,0.9), 0 0 2vw rgba(255,255,255,0.12); }
}
@keyframes bcv-blink { 50% { opacity: 0; } }

@keyframes bcv-banner-in { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes bcv-banner-out { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(0 0 0 100%); } }
@keyframes bcv-banner-text { from { opacity: 0; transform: translateX(-2.5vw); } to { opacity: 1; transform: none; } }
@keyframes bcv-push-in { from { transform: scale(1.18); } to { transform: scale(1); } }

.bcv-enter-up { animation: bcv-enter-up 600ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-enter-left { animation: bcv-enter-left 600ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-enter-right { animation: bcv-enter-right 600ms cubic-bezier(0.2, 0, 0, 1) both; }

/* A decision landing, in order: art wipes up (0-700ms), light flash, colour drains
   on a ban, slash wipes down, stamp slams, ring fades out. ~1.6s end to end. */
.bcv-fill { animation: bcv-fill 700ms cubic-bezier(0.7, 0, 0.2, 1) both; }
.bcv-settle { animation: bcv-settle 1600ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-flash { animation: bcv-flash 700ms cubic-bezier(0.2, 0, 0, 1) 450ms both; }
.bcv-drain { animation: bcv-settle 1600ms cubic-bezier(0.2, 0, 0, 1) both, bcv-drain 900ms cubic-bezier(0.4, 0, 0.2, 1) 550ms both; }
.bcv-dim { animation: bcv-fade-in 800ms cubic-bezier(0.4, 0, 0.2, 1) 550ms both; }
.bcv-slash { animation: bcv-wipe-down 420ms cubic-bezier(0.7, 0, 0.2, 1) 850ms both; }
.bcv-slam { animation: bcv-slam 520ms cubic-bezier(0.2, 0, 0, 1) 950ms both; }
.bcv-ring { animation: bcv-ring 650ms cubic-bezier(0.2, 0, 0, 1) 1250ms both; }
.bcv-rise { animation: bcv-rise 450ms cubic-bezier(0.2, 0, 0, 1) 450ms both; }
.bcv-lit { animation: bcv-lit 1600ms cubic-bezier(0.2, 0, 0, 1) 500ms both; }
.bcv-decider { animation: bcv-decider-pulse 900ms cubic-bezier(0.2, 0, 0, 1) 900ms 2 both; }
.bcv-side-in { animation: bcv-rise 450ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-on-clock { animation: bcv-breathe 1.4s ease-in-out infinite alternate; }
.bcv-cursor { animation: bcv-blink 1s steps(1) infinite; }

/* Settled before the overlay loaded: show the final state, play nothing. */
.bcv-static, .bcv-static .bcv-fill, .bcv-static .bcv-settle, .bcv-static .bcv-flash, .bcv-static .bcv-drain,
.bcv-static .bcv-dim, .bcv-static .bcv-slash, .bcv-static .bcv-slam, .bcv-static .bcv-ring, .bcv-static .bcv-rise {
  animation-duration: 1ms !important;
  animation-delay: 0ms !important;
  animation-iteration-count: 1 !important;
}
.bcv-static .bcv-flash, .bcv-static .bcv-ring { display: none; }

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
