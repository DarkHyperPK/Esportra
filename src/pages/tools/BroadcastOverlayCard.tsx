import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { VetoStripCard } from "@/components/tournament/map-veto/buildVetoStripCards";
import { sideCode, teamCode } from "./broadcastOverlayStyles";

type CardProps = {
  card: VetoStripCard;
  mapNumber?: number;
  /** Position in the row: the slot number shown, and the stagger of the first entrance. */
  index: number;
  /** Already settled when the overlay loaded: show the final state without replaying it. */
  quiet: boolean;
};

const ACTION_WORD: Record<VetoStripCard["kind"], string> = {
  ban: "Ban",
  pick: "Pick",
  decider: "Decider",
};

const STAMP_TRANSFORM = { transform: "translate(-50%, -50%) rotate(-8deg)" };

/** The verdict stamp. Mounted once when the map settles, so its slam plays exactly once. */
const Stamp = ({ card, mapNumber }: { card: VetoStripCard; mapNumber?: number }) => {
  const isBan = card.kind === "ban";
  const isDecider = card.kind === "decider";
  const frame = cn(
    "absolute left-1/2 top-[44%] z-20 flex min-w-[78%] flex-col items-center px-[0.9vw] py-[0.7vh] font-mono font-bold uppercase",
    isBan && "border-2 border-rose-500 bg-black/85 text-rose-400",
    card.kind === "pick" && "border-2 border-white bg-black/80 text-white",
    isDecider && "bg-rose-500 text-white",
  );

  return (
    <>
      <span aria-hidden className={cn(frame, "bcv-ring text-transparent", isDecider ? "border-2 border-rose-400 bg-transparent" : "bg-transparent")} style={STAMP_TRANSFORM}>
        <span className="text-[1.15vw] leading-tight tracking-[0.32em]">.</span>
      </span>
      <div className={cn(frame, "bcv-slam")} style={STAMP_TRANSFORM}>
        <span className="text-[1.15vw] leading-tight tracking-[0.32em]">
          {isBan ? "Banned" : isDecider ? "Decider" : "Picked"}
        </span>
        {!isBan && (
          <span className="text-[0.62vw] leading-tight tracking-[0.3em] opacity-80">
            {isDecider ? `Map ${mapNumber ?? ""}` : teamCode(card.teamName ?? "")}
          </span>
        )}
      </div>
    </>
  );
};

/** The map art filling its slot: wipes up from the bottom while easing in from a slight zoom. */
const Art = ({ card }: { card: VetoStripCard }) => (
  <div className="bcv-fill absolute inset-0 overflow-hidden">
    {card.mapImageUrl ? (
      <div
        className={cn("bcv-settle absolute inset-0 bg-cover bg-center", card.kind === "ban" && "bcv-drain")}
        style={{ backgroundImage: `url(${card.mapImageUrl})` }}
      />
    ) : (
      <div className="absolute inset-0 bg-zinc-800" />
    )}
    <div className={cn(
      "absolute inset-0",
      card.kind === "ban" ? "bcv-dim bg-black/55" : "bg-gradient-to-t from-black/90 via-black/10 to-black/30",
    )} />
    {card.kind === "ban" ? (
      <svg className="bcv-slash absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <line x1="8" y1="0" x2="92" y2="100" stroke="#f43f5e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    ) : null}
  </div>
);

const sideText = (card: VetoStripCard) =>
  card.side && card.sideTeamName && card.sideStatus === "done" ? `${teamCode(card.sideTeamName)} ${sideCode(card.side)}` : "";

/**
 * One fixed slot in the veto row. It never moves or re-mounts: an open slot
 * shows who acts and how; when the decision lands, the art wipes in and the
 * stamp lands, each layer animating once on its own mount.
 */
export const BroadcastOverlayCard = ({ card, mapNumber, index, quiet }: CardProps) => {
  const showArt = card.mapSettled || (card.kind === "decider" && Boolean(card.mapName) && card.status !== "upcoming");
  const isBan = card.kind === "ban";
  const onClock = card.status === "current" && !card.mapSettled;
  const actor = card.kind === "decider" ? "" : teamCode(card.teamName ?? "");
  const side = sideText(card);
  const captionMain = card.kind === "decider" ? "Decider" : `${actor} ${card.kind}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: "2.4vh" }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0, 0, 1], delay: index * 0.06 }}
      className={cn(
        "relative isolate h-full min-w-0 max-w-[11.5vw] flex-1 overflow-hidden bg-[#0d0d11]",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
        card.kind === "decider" && showArt && "outline outline-2 -outline-offset-2 outline-rose-500",
        onClock && "bcv-on-clock",
        card.mapSettled && card.kind === "pick" && !quiet && "bcv-lit",
        card.mapSettled && card.kind === "decider" && !quiet && "bcv-decider",
        card.mapSettled && card.kind === "pick" && "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]",
        quiet && "bcv-static",
      )}
    >
      <AnimatePresence>
        {!showArt ? (
          <motion.div
            key="open"
            className="absolute inset-0 flex flex-col items-center justify-center gap-[1vh] border border-dashed border-white/10"
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <span className={cn("font-mono text-[0.85vw] font-bold uppercase tracking-[0.3em]", onClock ? "text-white" : "text-zinc-600")}>
              {actor}
            </span>
            <span className={cn(
              "font-heading text-[1.9vw] font-black uppercase leading-none tracking-tight",
              onClock ? "text-white" : "text-zinc-800",
            )}>
              {ACTION_WORD[card.kind]}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showArt ? <Art key={`art-${card.mapName}`} card={card} /> : null}

      {card.mapSettled ? <div aria-hidden className="bcv-flash pointer-events-none absolute inset-0 z-30 bg-white mix-blend-overlay" /> : null}

      <span className="absolute left-[0.7vw] top-[1.2vh] z-20 font-mono text-[0.75vw] text-zinc-300/80">
        {String(index + 1).padStart(2, "0")}
      </span>

      {card.mapSettled ? <Stamp key={`stamp-${card.kind}`} card={card} mapNumber={mapNumber} /> : null}

      {showArt ? (
        <div className="bcv-rise absolute inset-x-[0.8vw] bottom-[1.8vh] z-20">
          <p className={cn(
            "truncate font-heading text-[1.75vw] font-black uppercase leading-none tracking-tight",
            isBan ? "text-zinc-500" : "text-white",
          )}>
            {card.mapName}
          </p>
          <p className="mt-[1vh] flex h-[1.2vw] items-center gap-[0.4vw] truncate font-mono text-[0.68vw] uppercase tracking-[0.18em] text-zinc-300">
            <span>{captionMain}</span>
            {side ? <span key={side} className="bcv-side-in">/ {side}</span> : null}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
};

export default BroadcastOverlayCard;
