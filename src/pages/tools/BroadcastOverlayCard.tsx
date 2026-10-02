import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { OverlayMapState } from "./buildOverlayStepCards";
import { sideCode, teamCode } from "./broadcastOverlayStyles";

export type OverlayPoolMap = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

type CardProps = {
  map: OverlayPoolMap;
  state: OverlayMapState;
  /** Position in the pool: the number shown and the stagger of the first entrance. */
  index: number;
  /** Already settled when the overlay loaded: show the final state without replaying it. */
  quiet: boolean;
};

const STATE_CLASS: Record<OverlayMapState["status"], string> = {
  open: "",
  ban: "banned",
  pick: "picked",
  decider: "decider",
};

/**
 * Layer 6: the slash. Measured in real pixels so the dash trick is exact: one dash
 * the full length of the line, slid into place by the `banned` class. It starts
 * just above the card and ends just below it, so it cuts through rather than sits in.
 */
const Slash = () => {
  const ref = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return undefined;
    const measure = () => setBox({ width: svg.clientWidth, height: svg.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const x1 = box.width * 0.06;
  const x2 = box.width * 0.94;
  const length = Math.hypot(x2 - x1, box.height);

  return (
    <svg
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -bottom-[3%] -top-[3%] z-20 h-[106%] w-full overflow-visible"
      viewBox={`0 0 ${box.width || 1} ${box.height || 1}`}
    >
      {box.width > 0 ? (
        <line
          className="bcv-slash"
          x1={x1}
          y1={0}
          x2={x2}
          y2={box.height}
          stroke="#f43f5e"
          strokeLinecap="square"
          strokeDasharray={length}
          style={{ strokeWidth: "0.27vw", ["--len" as string]: `${length}` }}
        />
      ) : null}
    </svg>
  );
};

/** Layer 7: the verdict stamp, centered. Hidden until a state class slams it in. */
const Stamp = ({ state }: { state: OverlayMapState }) => {
  const status = state.status;
  return (
    <div
      aria-hidden={status === "open"}
      className={cn(
        "bcv-stamp absolute left-1/2 top-[44%] z-30 flex min-w-[80%] flex-col items-center px-[0.9vw] py-[0.7vh] font-mono font-bold uppercase",
        status === "ban" && "border-2 border-rose-500 bg-[#0a0a0c]/95 text-rose-400",
        status === "pick" && "border-2 border-white bg-[#0a0a0c]/90 text-white",
        status === "decider" && "bg-rose-500 text-white",
        status === "open" && "border-2 border-transparent",
      )}
    >
      <span className="text-[1.15vw] leading-tight tracking-[0.32em]">
        {status === "ban" ? "Banned" : status === "decider" ? "Decider" : "Picked"}
      </span>
      {status === "pick" || status === "decider" ? (
        <span className="text-[0.62vw] leading-tight tracking-[0.3em] opacity-85">Map {state.mapNumber ?? ""}</span>
      ) : null}
    </div>
  );
};

function caption(state: OverlayMapState) {
  const side = state.side && state.sideTeamName ? `${teamCode(state.sideTeamName)} ${sideCode(state.side)}` : "";
  if (state.status === "ban") return `${teamCode(state.teamName ?? "")} ban`;
  if (state.status === "pick") return [`${teamCode(state.teamName ?? "")} pick`, side].filter(Boolean).join(" / ");
  if (state.status === "decider") return ["Decider", side].filter(Boolean).join(" / ");
  return " ";
}

/**
 * One map card: a fixed stack of seven layers (image, red tint, readability
 * gradient, number + name, red border, slash, stamp). Nothing is created when an
 * action happens; the state class switches layers on and the CSS animates them.
 */
export const BroadcastOverlayCard = ({ map, state, index, quiet }: CardProps) => (
  <motion.div
    className="h-full min-w-0 max-w-[11.5vw] flex-1"
    initial={{ opacity: 0, y: "2.4vh" }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.2, 0, 0, 1], delay: index * 0.06 }}
  >
    <div
      className={cn("bcv-card relative h-full", STATE_CLASS[state.status], quiet && "bcv-quiet")}
      aria-label={`${map.name}${state.status === "open" ? "" : `, ${state.status}`}`}
    >
      <div className="absolute inset-0 overflow-hidden bg-zinc-900">
        {/* 1. Map image */}
        {map.imageUrl ? (
          <div className="bcv-image absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.imageUrl})` }} />
        ) : null}
        {/* 2. Red tint, invisible until the decider */}
        <div className="bcv-red absolute inset-0 bg-rose-600" />
        {/* 3. Readability gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/30" />
      </div>

      {/* 4. Number and map name */}
      <span className="absolute left-[0.7vw] top-[1.2vh] z-10 font-mono text-[0.75vw] text-zinc-300/80">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="absolute inset-x-[0.8vw] bottom-[1.8vh] z-10">
        <p className="bcv-name truncate font-heading text-[1.75vw] font-black uppercase leading-none tracking-tight">{map.name}</p>
        <p className="bcv-caption mt-[1vh] truncate font-mono text-[0.68vw] uppercase tracking-[0.18em] text-zinc-300">
          {caption(state)}
        </p>
      </div>

      {/* 5. Red border, invisible until the decider */}
      <div aria-hidden className="bcv-border pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_0_2px_#f43f5e]" />

      {/* 6. Slash */}
      <Slash />

      {/* 7. Stamp */}
      <Stamp state={state} />
    </div>
  </motion.div>
);

export default BroadcastOverlayCard;
