import { useEffect, useMemo, useState } from "react";
import type { VetoStripCard } from "@/components/tournament/map-veto/buildVetoStripCards";
import { cn } from "@/lib/utils";
import { buildMapStates, toOverlayEventSlots, type OverlayMapState } from "./buildOverlayStepCards";
import { BROADCAST_OVERLAY_CSS, overlayEnterClass, sideCode, teamCode } from "./broadcastOverlayStyles";
import { BroadcastOverlayCard, type OverlayPoolMap } from "./BroadcastOverlayCard";
import { useOverlayEventQueue } from "./useOverlayEventQueue";
import type { OverlayVetoEvent } from "./overlayVetoEvents";

type Props = {
  /** The map pool, in a fixed order. One card per map; cards never move. */
  maps: OverlayPoolMap[];
  /** The veto's map decisions, in veto order. Drives each card's state and the caption. */
  cards: VetoStripCard[];
  gameLabel: string;
  bestOf: number;
  team1Name: string;
  team2Name: string;
  status: string;
  /** Team on the clock and what it must do, while the veto is live. */
  onClock?: { teamName: string; action: "ban" | "pick" | "pick_side" } | null;
  transparent: boolean;
  transition: "none" | "up" | "left" | "right";
};

const OPEN: OverlayMapState = { status: "open" };
const TYPE_MS_PER_CHAR = 28;

/**
 * Maps already settled when the overlay first rendered (OBS load or refresh) show
 * their final state without replaying; anything that settles later animates.
 * A reset re-arms every card. `null` until the first effect runs = all quiet.
 */
function useQuietMaps(states: Map<string, OverlayMapState>, ready: boolean) {
  const [quiet, setQuiet] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (quiet === null) {
      setQuiet(new Set(states.keys()));
    } else if (quiet.size > 0 && states.size === 0) {
      setQuiet(new Set());
    }
  }, [quiet, ready, states]);
  return quiet;
}

/** Types its text out character by character whenever the text changes. */
const TypewriterLine = ({ text }: { text: string }) => {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (!text) {
      setShown("");
      return undefined;
    }
    let count = 0;
    setShown("");
    const timer = window.setInterval(() => {
      count += 1;
      setShown(text.slice(0, count));
      if (count >= text.length) window.clearInterval(timer);
    }, TYPE_MS_PER_CHAR);
    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <p className="flex items-center gap-[0.5vw] font-mono text-[1.35vw] uppercase tracking-[0.3em] text-rose-400" aria-live="polite">
      <span>{shown}</span>
      {text ? <span aria-hidden className="bcv-cursor inline-block h-[1.3vw] w-[0.7vw] bg-rose-500" /> : null}
    </p>
  );
};

function eventLine(event: OverlayVetoEvent) {
  const team = event.teamName ? teamCode(event.teamName) : "";
  switch (event.kind) {
    case "ban":
      return `${team} bans ${event.mapName}`;
    case "pick":
      return `${team} picks ${event.mapName}`;
    case "decider":
      return `Decider: ${event.mapName}`;
    default:
      return `${team} ${sideCode(event.side)} on ${event.mapName}`;
  }
}

function restingLine(onClock: Props["onClock"], decider?: string) {
  if (decider) return `Decider: ${decider}`;
  if (!onClock) return "";
  const verb = onClock.action === "ban" ? "to ban" : onClock.action === "pick" ? "to pick" : "to choose side";
  return `${teamCode(onClock.teamName)} ${verb}`;
}

const Bracket = ({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) => (
  <span
    aria-hidden
    className={cn(
      "absolute h-[3.4vh] w-[3.4vh] border-white/45",
      corner === "tl" && "left-[2.4vw] top-[4.2vh] border-l-2 border-t-2",
      corner === "tr" && "right-[2.4vw] top-[4.2vh] border-r-2 border-t-2",
      corner === "bl" && "bottom-[4.2vh] left-[2.4vw] border-b-2 border-l-2",
      corner === "br" && "bottom-[4.2vh] right-[2.4vw] border-b-2 border-r-2",
    )}
  />
);

const LiveClock = ({ label }: { label: string }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return (
    <span className="font-mono text-[0.95vw] uppercase tracking-[0.14em] text-zinc-400">
      {time} {label}
    </span>
  );
};

/**
 * Full-frame 16:9 broadcast graphic for OBS: the map pool as a row of tall cards.
 * A ban, pick or decider switches layers on the map's own card (see
 * broadcastOverlayStyles) and the caption types the moment out.
 */
export const PublicMapVetoBroadcastOverlay = (props: Props) => {
  const { maps, cards, gameLabel, bestOf, team1Name, team2Name, status, transparent, transition, onClock } = props;
  const states = useMemo(() => buildMapStates(cards), [cards]);
  const eventSlots = useMemo(() => toOverlayEventSlots(cards), [cards]);
  const { current } = useOverlayEventQueue(eventSlots, cards.length > 0);
  const quiet = useQuietMaps(states, maps.length > 0);
  const decider = [...states.entries()].find(([, state]) => state.status === "decider" && state.side)?.[0];
  const caption = current ? eventLine(current) : restingLine(onClock, decider);

  return (
    <main
      className={cn(
        "relative h-dvh w-dvw overflow-hidden text-white",
        transparent ? "bg-transparent" : "bg-[radial-gradient(ellipse_at_20%_0%,rgba(244,63,94,0.10),transparent_55%),linear-gradient(180deg,#0b0b0f,#09090b)]",
      )}
      aria-label="Map veto OBS overlay"
    >
      <style>{BROADCAST_OVERLAY_CSS}</style>
      <Bracket corner="tl" />
      <Bracket corner="tr" />
      <Bracket corner="bl" />
      <Bracket corner="br" />

      <div className={cn("absolute inset-0 flex flex-col px-[5.6vw] pb-[8vh] pt-[5.2vh]", overlayEnterClass(transition))}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-[0.6vw] font-mono text-[0.85vw] uppercase tracking-[0.24em] text-zinc-400">
            <img src="/logo.svg" alt="" className="h-[1.3vw] w-[1.3vw]" />
            Esportra / Best of {bestOf}
          </div>
          <span className="font-mono text-[0.85vw] uppercase tracking-[0.24em] text-zinc-400">Map veto</span>
        </div>

        <div className="mt-[4vh] flex items-end justify-between gap-[2vw]">
          <h1 className="font-heading text-[4.6vw] font-black uppercase leading-none tracking-[-0.03em] text-zinc-100">
            Map veto
          </h1>
          <p className="mb-[0.6vh] truncate font-mono text-[1.3vw] uppercase tracking-[0.3em] text-zinc-100">
            {gameLabel} / {teamCode(team1Name)} vs {teamCode(team2Name)}
          </p>
        </div>

        <div className="mt-[5vh] flex min-h-0 flex-1 justify-center gap-[0.9vw]">
          {maps.map((map, index) => (
            <BroadcastOverlayCard
              key={map.id}
              map={map}
              state={states.get(map.name) ?? OPEN}
              index={index}
              quiet={quiet === null || quiet.has(map.name)}
            />
          ))}
        </div>

        <div className="mt-[3.5vh] flex h-[6vh] shrink-0 items-center">
          <TypewriterLine text={caption} />
        </div>
      </div>

      <div className="absolute bottom-[3.6vh] left-[5.2vw]">
        <LiveClock label={status === "completed" ? "Final" : "Live"} />
      </div>
    </main>
  );
};

export default PublicMapVetoBroadcastOverlay;
