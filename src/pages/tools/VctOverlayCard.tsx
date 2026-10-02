import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { OverlayMapState } from "./overlayBeats";
import { sideCode, teamCode } from "./broadcastOverlayStyles";
import { Frame, Slash, type OverlayPoolMap } from "./overlayCardLayers";
import { VCT_DISPLAY_FONT, VCT_INK, VCT_LABEL_FONT, VCT_RED } from "./vctOverlayStyles";

type CardProps = {
  map: OverlayPoolMap;
  state: OverlayMapState;
  index: number;
  quiet: boolean;
  focused: boolean;
  dimmed: boolean;
  /** Colour of the team that banned or picked this map; null when open or the decider. */
  teamColor: string | null;
};

const STATE_CLASS: Record<OverlayMapState["status"], string> = {
  open: "",
  ban: "banned",
  pick: "picked",
  decider: "decider",
};

/** The verdict, straight and solid, as VCT graphics set it. */
const Stamp = ({ state }: { state: OverlayMapState }) => (
  <div
    aria-hidden={state.status === "open"}
    className={cn(
      "bcv-stamp absolute left-1/2 top-[46%] z-30 min-w-[78%] px-[0.8vw] py-[0.5vh] text-center uppercase leading-none",
      state.status === "ban" && "text-[#ece8e1]",
      state.status === "pick" && "bg-[#ece8e1] text-[#0f1923]",
      state.status === "decider" && "border-2 border-[#ece8e1] bg-[#0f1923] text-[#ece8e1]",
    )}
    style={{ fontFamily: VCT_DISPLAY_FONT, backgroundColor: state.status === "ban" ? VCT_RED : undefined }}
  >
    <span className="block text-[1.5vw] tracking-[0.06em]">
      {state.status === "ban" ? "Banned" : state.status === "decider" ? "Decider" : "Pick"}
    </span>
  </div>
);

function tagLine(state: OverlayMapState) {
  if (state.status === "decider") return "Decider";
  if (state.status === "open") return "";
  return `${teamCode(state.teamName ?? "")} ${state.status === "ban" ? "ban" : "pick"}`;
}

function plateLine(state: OverlayMapState) {
  if (state.status !== "pick" && state.status !== "decider") return " ";
  const side = state.side && state.sideTeamName ? `${teamCode(state.sideTeamName)} ${sideCode(state.side)}` : "";
  return [`Map ${state.mapNumber ?? ""}`, side].filter(Boolean).join(" · ");
}

/**
 * VCT-style map card: angled art over a cream nameplate, with a team-coloured
 * record tag. Same layer classes as the Esportra card, so the same paced
 * timeline plays on it (see broadcastOverlayStyles and vctOverlayStyles).
 */
export const VctOverlayCard = ({ map, state, index, quiet, focused, dimmed, teamColor }: CardProps) => (
  <motion.div
    className="bcv-slot h-full min-w-0 max-w-[12vw] flex-1"
    initial={{ opacity: 0, y: "2.4vh" }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: [0.2, 0, 0, 1], delay: index * 0.08 }}
  >
    <div className={cn("bcv-focus h-full", focused && "is-focused", dimmed && "is-dimmed")}>
      <div
        className={cn("bcv-card relative h-full", STATE_CLASS[state.status], quiet && "bcv-quiet")}
        style={{ ["--team" as string]: teamColor ?? "#ece8e1" }}
        aria-label={`${map.name}${state.status === "open" ? "" : `, ${state.status}`}`}
      >
        <div className="bcv-shake absolute inset-0 flex flex-col">
          <div className="relative min-h-0 flex-1">
            <div className="vct-cut absolute inset-0 overflow-hidden bg-[#1b2733]">
              {map.imageUrl ? (
                <div className="bcv-image absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${map.imageUrl})` }} />
              ) : null}
              <div className="bcv-red absolute inset-0 bg-rose-600" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1923]/85 via-transparent to-[#0f1923]/25" />
              <div aria-hidden className="bcv-shine absolute inset-y-0 -left-1/2 w-1/2" />
            </div>
            <span
              className="absolute left-[0.6vw] top-[1vh] z-10 text-[0.85vw] font-semibold text-[#ece8e1]/80"
              style={{ fontFamily: VCT_LABEL_FONT }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <Frame cut={0.14} />
            <Slash color={VCT_RED} tipColor="#ffe9eb" />
            <Stamp state={state} />
            <div
              className="vct-tag absolute inset-x-0 bottom-0 z-20 px-[0.6vw] py-[0.45vh] text-[0.95vw] font-bold uppercase tracking-[0.14em]"
              style={{
                fontFamily: VCT_LABEL_FONT,
                backgroundColor: state.status === "decider" ? "#ece8e1" : teamColor ?? "transparent",
                color: VCT_INK,
              }}
            >
              {tagLine(state) || " "}
            </div>
          </div>
          <div className="vct-plate flex h-[7.4vh] shrink-0 flex-col justify-center px-[0.7vw]">
            <p className="bcv-name truncate text-[1.75vw] uppercase leading-none" style={{ fontFamily: VCT_DISPLAY_FONT }}>
              {map.name}
            </p>
            <p
              className="bcv-caption mt-[0.5vh] truncate text-[0.8vw] font-semibold uppercase tracking-[0.12em] text-[#0f1923]/70"
              style={{ fontFamily: VCT_LABEL_FONT }}
            >
              {plateLine(state)}
            </p>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default VctOverlayCard;
