import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { sideCode, teamCode } from "./broadcastOverlayStyles";
import type { BroadcastOverlaySlot } from "./PublicMapVetoBroadcastOverlay";
import type { OverlayVetoEvent } from "./overlayVetoEvents";

type CardProps = {
  slot: BroadcastOverlaySlot;
  index: number;
  mapNumber?: number;
  /** The moment playing on air for this card, if any. Its id restarts the animations. */
  reveal?: OverlayVetoEvent | null;
  /** This card's settle moment is still queued: keep it looking open until it plays. */
  awaitingSettle: boolean;
  /** This card's side choice is still queued: hold the side caption back. */
  awaitingSide: boolean;
};

const caption = (slot: BroadcastOverlaySlot, showSide: boolean) => {
  const side = showSide && slot.side && slot.bottomTeam ? `${teamCode(slot.bottomTeam)} ${sideCode(slot.side)}` : "";
  if (slot.kind === "ban") return `${teamCode(slot.topTeam ?? "")} ban`;
  if (slot.kind === "pick") return [`${teamCode(slot.topTeam ?? "")} pick`, side].filter(Boolean).join(" / ");
  if (slot.kind === "decider") return ["Decider", side].filter(Boolean).join(" / ");
  return "";
};

const Stamp = ({ kind, slot, mapNumber, animate }: {
  kind: BroadcastOverlaySlot["kind"];
  slot: BroadcastOverlaySlot;
  mapNumber?: number;
  animate: boolean;
}) => {
  if (kind === "pending") return null;
  const isBan = kind === "ban";
  const isDecider = kind === "decider";
  const frame = cn(
    "absolute left-1/2 top-[44%] z-20 flex min-w-[78%] flex-col items-center px-[0.9vw] py-[0.7vh] font-mono font-bold uppercase",
    isBan && "border-2 border-rose-500 bg-black/85 text-rose-400",
    kind === "pick" && "border-2 border-white bg-black/80 text-white",
    isDecider && "bg-rose-500 text-white",
  );
  const restingTransform = { transform: "translate(-50%, -50%) rotate(-8deg)" };

  return (
    <>
      {animate ? (
        <span
          aria-hidden
          className={cn(frame, "bcv-reveal-ring bg-transparent text-transparent", isDecider ? "border-2 border-rose-400" : "")}
          style={restingTransform}
        >
          <span className="text-[1.15vw] leading-tight tracking-[0.32em]">.</span>
        </span>
      ) : null}
      <div className={cn(frame, animate && "bcv-reveal-stamp")} style={restingTransform}>
        <span className="text-[1.15vw] leading-tight tracking-[0.32em]">
          {isBan ? "Banned" : isDecider ? "Decider" : "Picked"}
        </span>
        {!isBan && (
          <span className="text-[0.62vw] leading-tight tracking-[0.3em] opacity-80">
            {isDecider ? `Map ${mapNumber ?? ""}` : teamCode(slot.topTeam ?? "")}
          </span>
        )}
      </div>
    </>
  );
};

/** One map in the broadcast row. Settles with a punch, a flash and a stamp when its moment airs. */
export const BroadcastOverlayCard = ({ slot, index, mapNumber, reveal, awaitingSettle, awaitingSide }: CardProps) => {
  const kind = awaitingSettle ? "pending" : slot.kind;
  const isBan = kind === "ban";
  const isPending = kind === "pending";
  const isDecider = kind === "decider";
  const settling = Boolean(reveal && reveal.kind !== "side");
  const sideAiring = reveal?.kind === "side";
  const revealKey = reveal?.id ?? "rest";

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.5, ease: [0.2, 0, 0, 1] } }}
      className="relative h-full min-w-0 max-w-[11.5vw] flex-1"
    >
      {/*
        Entrance lives on an inner layer so it never fights the layout transform, and is
        driven by framer so a card moved in the DOM during a reshuffle doesn't replay it.
      */}
      <motion.div
        className="h-full"
        initial={{ opacity: 0, y: "2.4vh" }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.2, 0, 0, 1], delay: index * 0.07 }}
      >
      <div
        key={revealKey}
        className={cn(
          "relative isolate h-full overflow-hidden bg-zinc-900",
          settling && "bcv-reveal",
          settling && kind === "pick" && "bcv-reveal-lit",
          settling && isDecider && "bcv-reveal-decider",
          isDecider && "outline outline-2 -outline-offset-2 outline-rose-500",
          isPending && "outline outline-1 -outline-offset-1 outline-dashed outline-white/15",
        )}
      >
        {slot.mapImageUrl ? (
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center",
              isBan && (settling ? "bcv-reveal-desat" : "grayscale"),
              isPending && "opacity-25 grayscale",
            )}
            style={{ backgroundImage: `url(${slot.mapImageUrl})` }}
          />
        ) : null}
        <div className={cn(
          "absolute inset-0",
          isBan ? cn("bg-black/55", settling && "bcv-reveal-dim") : "bg-gradient-to-t from-black/90 via-black/10 to-black/30",
        )} />

        {isBan ? (
          <svg
            className={cn("absolute inset-0 z-10 h-full w-full", settling && "bcv-reveal-slash")}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <line x1="8" y1="0" x2="92" y2="100" stroke="#f43f5e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : null}

        {settling ? <div aria-hidden className="bcv-reveal-flash absolute inset-0 z-30 bg-white mix-blend-overlay" /> : null}

        <span className="absolute left-[0.7vw] top-[1.2vh] z-20 font-mono text-[0.75vw] text-zinc-300/80">
          {String(index + 1).padStart(2, "0")}
        </span>

        <Stamp kind={kind} slot={slot} mapNumber={mapNumber} animate={settling} />

        <div className={cn("absolute inset-x-[0.8vw] bottom-[1.8vh] z-20", settling && "bcv-reveal-rise")}>
          <p className={cn(
            "truncate font-heading text-[1.75vw] font-black uppercase leading-none tracking-tight",
            isBan ? "text-zinc-500" : isPending ? "text-zinc-600" : "text-white",
          )}>
            {slot.mapName}
          </p>
          <p
            key={sideAiring ? revealKey : "caption"}
            className={cn(
              "mt-[1vh] h-[1.2vw] w-fit max-w-full truncate px-[0.2vw] font-mono text-[0.68vw] uppercase tracking-[0.18em] text-zinc-300",
              sideAiring && "bcv-caption-flash",
            )}
          >
            {isPending ? "" : caption(slot, !awaitingSide)}
          </p>
        </div>
      </div>
      </motion.div>
    </motion.div>
  );
};

export default BroadcastOverlayCard;
