/**
 * Motion for the broadcast OBS overlay. Every card is a fixed stack of layers
 * that already exist; a state class (banned / picked / decider) switches layers
 * on and animates them:
 *
 *   ban      image greys to 40% over 0.23s, name dims, slash draws in 0.19s,
 *            stamp slams 0.06s later (0.2s, overshooting curve), tilt -16deg
 *   pick     card stays alive, white stamp, same slam, tilt -8deg
 *   decider  red tint fades to 55% and red border in over 0.29s, card lifts,
 *            solid red stamp, tilt -6deg
 */
export const BROADCAST_OVERLAY_CSS = `
@keyframes bcv-enter-up { from { opacity: 0; transform: translate3d(0, 4vh, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-left { from { opacity: 0; transform: translate3d(-5vw, 0, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-right { from { opacity: 0; transform: translate3d(5vw, 0, 0); } to { opacity: 1; transform: none; } }
.bcv-enter-up { animation: bcv-enter-up 600ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-enter-left { animation: bcv-enter-left 600ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-enter-right { animation: bcv-enter-right 600ms cubic-bezier(0.2, 0, 0, 1) both; }

/* Card: layers exist from the start, in their resting (open) state. */
.bcv-card { --tilt: -16deg; transition: transform .29s cubic-bezier(.2,.8,.2,1); }
.bcv-card .bcv-image { transition: filter .23s cubic-bezier(.2,.8,.2,1); filter: grayscale(0) brightness(1); }
.bcv-card .bcv-red { opacity: 0; mix-blend-mode: color; transition: opacity .29s cubic-bezier(.2,.8,.2,1); }
.bcv-card .bcv-border { opacity: 0; transition: opacity .29s cubic-bezier(.2,.8,.2,1); }
.bcv-card .bcv-name { color: #fafafa; transition: color .23s cubic-bezier(.2,.8,.2,1); }
.bcv-card .bcv-caption { opacity: 0; transition: opacity .2s cubic-bezier(.2,.8,.2,1) .12s; }
.bcv-card .bcv-slash { stroke-dashoffset: var(--len); }
.bcv-card .bcv-stamp { opacity: 0; transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1.9); }

/* Ban: the card dies, the slash cuts through, the stamp lands. */
.bcv-card.banned .bcv-image { filter: grayscale(1) brightness(.4); }
.bcv-card.banned .bcv-name { color: #71717a; }
.bcv-card.banned .bcv-slash { stroke-dashoffset: 0; transition: stroke-dashoffset .19s cubic-bezier(.2,.8,.2,1); }

/* Pick: alive, white, calmer angle. */
.bcv-card.picked { --tilt: -8deg; }

/* Decider: tinted red, framed, lifted. */
.bcv-card.decider { --tilt: -6deg; transform: translateY(-1.1vw); }
.bcv-card.decider .bcv-red { opacity: .55; }
.bcv-card.decider .bcv-border { opacity: 1; }

.bcv-card.banned .bcv-caption, .bcv-card.picked .bcv-caption, .bcv-card.decider .bcv-caption { opacity: 1; }
.bcv-card.banned .bcv-stamp, .bcv-card.picked .bcv-stamp, .bcv-card.decider .bcv-stamp {
  animation: bcv-slam .2s .06s cubic-bezier(.3,1.6,.5,1) both;
}
@keyframes bcv-slam {
  from { transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1.9); opacity: 0; }
  to { transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1); opacity: 1; }
}

/* Settled before the overlay loaded: final state, nothing replays. */
.bcv-card.bcv-quiet, .bcv-card.bcv-quiet * { transition: none !important; }
.bcv-card.bcv-quiet .bcv-stamp { animation: none !important; opacity: 1; transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1); }

/* Caption typewriter cursor. */
@keyframes bcv-blink { 50% { opacity: 0; } }
.bcv-cursor { animation: bcv-blink 1s steps(1) infinite; }

@media (prefers-reduced-motion: reduce) {
  .bcv-card, .bcv-card * { transition-duration: 1ms !important; }
  .bcv-card .bcv-stamp { animation-duration: 1ms !important; animation-delay: 0ms !important; }
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
