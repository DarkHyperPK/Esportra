import { useEffect, useMemo, useState } from "react";
import type { VetoStripCard } from "@/components/tournament/map-veto/buildVetoStripCards";
import { toOverlayEventSlots } from "./buildOverlayStepCards";
import { cn } from "@/lib/utils";
import { BROADCAST_OVERLAY_CSS, overlayEnterClass, teamCode } from "./broadcastOverlayStyles";
import { BroadcastOverlayCard } from "./BroadcastOverlayCard";
import { BroadcastOverlayAnnouncement } from "./BroadcastOverlayAnnouncement";
import { useOverlayEventQueue } from "./useOverlayEventQueue";

type Props = {
  /** One fixed slot per map decision, in veto order. */
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

/**
 * Steps already settled when the overlay first rendered (OBS load or refresh) stay
 * still; everything that settles afterwards animates. A reset re-arms every step.
 * `null` until the first effect runs, which callers treat as "all quiet".
 */
function useQuietSteps(cards: VetoStripCard[]) {
  const [quietSteps, setQuietSteps] = useState<Set<number> | null>(null);
  useEffect(() => {
    if (cards.length === 0) return;
    if (quietSteps === null) {
      setQuietSteps(new Set(cards.filter((card) => card.mapSettled).map((card) => card.stepNumber)));
    } else if (quietSteps.size > 0 && cards.every((card) => !card.mapSettled)) {
      setQuietSteps(new Set());
    }
  }, [cards, quietSteps]);
  return quietSteps;
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

const FooterLine = ({ onClock, decider }: { onClock: Props["onClock"]; decider?: VetoStripCard }) => {
  if (decider) {
    return <p className="font-mono text-[1.35vw] uppercase tracking-[0.3em] text-rose-400">Decider: {decider.mapName}</p>;
  }
  if (!onClock) return null;
  const verb = onClock.action === "ban" ? "to ban" : onClock.action === "pick" ? "to pick" : "to choose side";
  return (
    <p className="flex items-center gap-[0.6vw] font-mono text-[1.35vw] uppercase tracking-[0.3em] text-rose-400">
      {teamCode(onClock.teamName)} {verb}
      <span aria-hidden className="bcv-cursor inline-block h-[1.3vw] w-[0.7vw] bg-rose-500" />
    </p>
  );
};

/**
 * Full-frame 16:9 broadcast graphic for OBS: the veto as a row of tall map cards.
 * Each new ban, pick, decider or side choice airs as a moment: the card settles
 * with a stamp and the lower band announces it.
 */
export const PublicMapVetoBroadcastOverlay = (props: Props) => {
  const { cards, gameLabel, bestOf, team1Name, team2Name, status, transparent, transition, onClock } = props;
  const eventSlots = useMemo(() => toOverlayEventSlots(cards), [cards]);
  const { current, phase } = useOverlayEventQueue(eventSlots, cards.length > 0);
  const quietSteps = useQuietSteps(cards);
  const decider = cards.find((card) => card.kind === "decider" && card.mapSettled);
  const mapNumbers = new Map<number, number>();
  cards
    .filter((card) => card.kind !== "ban")
    .forEach((card, index) => mapNumbers.set(card.stepNumber, index + 1));
  const currentStep = current ? Number(current.slotKey.replace("step-", "")) : null;

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
          {cards.map((card, index) => (
            <BroadcastOverlayCard
              key={card.stepNumber}
              card={card}
              index={index}
              mapNumber={mapNumbers.get(card.stepNumber)}
              quiet={quietSteps === null || quietSteps.has(card.stepNumber)}
            />
          ))}
        </div>

        <div className="relative mt-[3.5vh] flex h-[9vh] shrink-0 items-center">
          <FooterLine onClock={onClock} decider={decider} />
          {current ? (
            <BroadcastOverlayAnnouncement
              event={current}
              phase={phase}
              mapNumber={currentStep === null ? undefined : mapNumbers.get(currentStep)}
            />
          ) : null}
        </div>
      </div>

      <div className="absolute bottom-[3.6vh] left-[5.2vw]">
        <LiveClock label={status === "completed" ? "Final" : "Live"} />
      </div>
    </main>
  );
};

export default PublicMapVetoBroadcastOverlay;
