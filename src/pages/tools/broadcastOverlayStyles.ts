/**
 * Motion for the broadcast OBS overlay, paced like an edited motion-design
 * sequence rather than a live UI. Every card is a fixed stack of layers that
 * already exist; when a beat goes on air its card lifts into focus (the rest of
 * the row steps back) and its state class plays the layers as a timeline:
 *
 *   ban      0.0 lift  ->  0.45 the slash is drawn end to end over 1.3s, a glowing
 *            pen tip at its head  ->  0.55 the colour drains over 1.4s  ->  1.8 the
 *            BANNED stamp drops in from large and blurred  ->  2.2 the card takes
 *            the hit (small shake)  ->  2.4 the caption fades up
 *   pick     0.0 lift  ->  0.4 light sweeps across, the image warms  ->  0.7 a white
 *            frame draws itself around the edge  ->  1.7 PICKED stamp  ->  2.3 caption
 *   decider  0.0 lift  ->  0.4 red tint bleeds in over 1.4s while a red frame draws
 *            ->  2.0 DECIDER stamp  ->  2.5 caption; the card stays raised after
 *
 * Curves are ease-in-out so nothing starts or stops abruptly. Beat lengths live
 * in overlayBeats (BEAT_MS) and leave room after the last layer lands.
 *
 * Every transition and animation here is !important on purpose. index.css cuts
 * all motion to 0.01ms under prefers-reduced-motion (an OS setting: Windows'
 * "Animation effects" off, which OBS's browser source inherits). That is right
 * for the app, but this overlay is footage for viewers on stream; the setting of
 * the PC that renders it must not turn every ban into an instant cut. More
 * specific selectors + !important outrank the global `*` rule.
 */
export const BROADCAST_OVERLAY_CSS = `
@keyframes bcv-enter-up { from { opacity: 0; transform: translate3d(0, 4vh, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-left { from { opacity: 0; transform: translate3d(-5vw, 0, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-enter-right { from { opacity: 0; transform: translate3d(5vw, 0, 0); } to { opacity: 1; transform: none; } }
.bcv-enter-up { animation: bcv-enter-up 600ms cubic-bezier(0.2, 0, 0, 1) both !important; }
.bcv-enter-left { animation: bcv-enter-left 600ms cubic-bezier(0.2, 0, 0, 1) both !important; }
.bcv-enter-right { animation: bcv-enter-right 600ms cubic-bezier(0.2, 0, 0, 1) both !important; }

/* Focus: the card on air rises, the rest of the row steps back. */
.bcv-focus { transition: transform .8s cubic-bezier(.65,0,.35,1), filter .8s cubic-bezier(.65,0,.35,1) !important; }
.bcv-focus.is-focused { transform: translateY(-1.4vw) scale(1.045); }
.bcv-focus.is-dimmed { filter: brightness(.5) saturate(.75); }

/* Card at rest (open). Base transitions are what a reset uses to clear a card. */
.bcv-card { --tilt: -16deg; transition: transform .6s cubic-bezier(.65,0,.35,1) !important; }
.bcv-card .bcv-image { filter: grayscale(0) brightness(1) saturate(1); transition: filter .6s cubic-bezier(.65,0,.35,1) !important; }
.bcv-card .bcv-red { opacity: 0; mix-blend-mode: color; transition: opacity .6s cubic-bezier(.65,0,.35,1) !important; }
.bcv-card .bcv-name { color: #fafafa; transition: color .6s cubic-bezier(.65,0,.35,1) !important; }
.bcv-card .bcv-caption { opacity: 0; transform: translateY(.6vh); transition: opacity .4s ease, transform .4s ease !important; }
.bcv-card .bcv-slash { stroke-dashoffset: var(--len); transition: stroke-dashoffset .5s cubic-bezier(.65,0,.35,1) !important; }
.bcv-card .bcv-slash-tip { opacity: 0; stroke-dashoffset: var(--tip); }
.bcv-card .bcv-frame { stroke: transparent; stroke-dashoffset: var(--perimeter); transition: stroke-dashoffset .5s cubic-bezier(.65,0,.35,1) !important; }
.bcv-card .bcv-shine {
  opacity: 0;
  background: linear-gradient(100deg, transparent 10%, rgba(255,255,255,.42) 50%, transparent 90%);
  mix-blend-mode: soft-light;
}
.bcv-card .bcv-stamp { opacity: 0; transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1.8); }

/* Ban. The pen stroke: eases in, travels steadily through the card, eases out as it lands. */
.bcv-card.banned .bcv-slash { stroke-dashoffset: 0; transition: stroke-dashoffset 1.3s cubic-bezier(.65,0,.35,1) .45s !important; }
.bcv-card.banned .bcv-slash-tip { animation: bcv-tip 1.3s cubic-bezier(.65,0,.35,1) .45s both !important; }
@keyframes bcv-tip {
  0% { stroke-dashoffset: var(--tip); opacity: 0; }
  6% { opacity: 1; }
  88% { opacity: 1; }
  100% { stroke-dashoffset: var(--tip-end); opacity: 0; }
}
/* The colour drains while it's being cut. */
.bcv-card.banned .bcv-image { filter: grayscale(1) brightness(.4) saturate(1); transition: filter 1.4s cubic-bezier(.45,0,.55,1) .55s !important; }
.bcv-card.banned .bcv-name { color: #71717a; transition: color .7s cubic-bezier(.45,0,.55,1) 1.1s !important; }
.bcv-card.banned .bcv-stamp { animation: bcv-stamp-in .65s cubic-bezier(.5,0,.3,1) 1.8s both !important; }
/* The card takes the stamp's impact. */
.bcv-card.banned .bcv-shake { animation: bcv-shake .45s ease-out 2.2s both !important; }
.bcv-card.banned .bcv-caption { transition-delay: 2.4s !important; transition-duration: .6s !important; }

/* Pick: alive and lit. */
.bcv-card.picked { --tilt: -8deg; }
.bcv-card.picked .bcv-image { filter: grayscale(0) brightness(1.08) saturate(1.15); transition: filter 1s cubic-bezier(.45,0,.55,1) .4s !important; }
.bcv-card.picked .bcv-shine { animation: bcv-shine 1.2s cubic-bezier(.65,0,.35,1) .4s both !important; }
.bcv-card.picked .bcv-frame { stroke: #fafafa; stroke-dashoffset: 0; transition: stroke-dashoffset 1.2s cubic-bezier(.65,0,.35,1) .7s !important; }
.bcv-card.picked .bcv-stamp { animation: bcv-stamp-in .65s cubic-bezier(.5,0,.3,1) 1.7s both !important; }
.bcv-card.picked .bcv-caption { transition-delay: 2.3s !important; transition-duration: .6s !important; }

/* Decider: red bleeds in, the frame draws in red, the card stays raised. */
.bcv-card.decider { --tilt: -6deg; transform: translateY(-1.1vw); transition: transform 1s cubic-bezier(.65,0,.35,1) .3s !important; }
.bcv-card.decider .bcv-red { opacity: .55; transition: opacity 1.4s cubic-bezier(.45,0,.55,1) .4s !important; }
.bcv-card.decider .bcv-frame { stroke: #f43f5e; stroke-dashoffset: 0; transition: stroke-dashoffset 1.4s cubic-bezier(.65,0,.35,1) .6s !important; }
.bcv-card.decider .bcv-stamp { animation: bcv-stamp-in .65s cubic-bezier(.5,0,.3,1) 2s both !important; }
.bcv-card.decider .bcv-caption { transition-delay: 2.5s !important; transition-duration: .6s !important; }

.bcv-card.banned .bcv-caption, .bcv-card.picked .bcv-caption, .bcv-card.decider .bcv-caption { opacity: 1; transform: none; }

/* The stamp drops in large and out of focus, lands slightly under size, settles. */
@keyframes bcv-stamp-in {
  0% { opacity: 0; filter: blur(8px); transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1.8); }
  55% { opacity: 1; filter: blur(0); transform: translate(-50%, -50%) rotate(var(--tilt)) scale(.93); }
  78% { transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1.03); }
  100% { opacity: 1; filter: blur(0); transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1); }
}
@keyframes bcv-shake {
  0%, 100% { transform: none; }
  18% { transform: translate(-.22vw, .12vw); }
  38% { transform: translate(.18vw, -.1vw); }
  58% { transform: translate(-.1vw, .06vw); }
  78% { transform: translate(.05vw, 0); }
}
@keyframes bcv-shine {
  0% { opacity: 0; transform: translateX(0) skewX(-12deg); }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translateX(340%) skewX(-12deg); }
}

/* Settled before playback started: final state, nothing replays. Scoped under
   .bcv-root so it outranks the state rules above, which are !important too. */
.bcv-root .bcv-card.bcv-quiet, .bcv-root .bcv-card.bcv-quiet * { transition: none !important; animation: none !important; }
.bcv-card.bcv-quiet .bcv-stamp { opacity: 1; filter: none; transform: translate(-50%, -50%) rotate(var(--tilt)) scale(1); }
.bcv-card.bcv-quiet .bcv-slash-tip, .bcv-card.bcv-quiet .bcv-shine { opacity: 0; }
.bcv-card.bcv-quiet:not(.banned):not(.picked):not(.decider) .bcv-stamp { opacity: 0; }

/* Caption typewriter cursor. */
@keyframes bcv-blink { 50% { opacity: 0; } }
.bcv-cursor { animation: bcv-blink 1s steps(1) infinite !important; }
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
