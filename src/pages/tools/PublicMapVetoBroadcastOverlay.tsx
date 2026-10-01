import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type BroadcastOverlaySlot = {
  key: string;
  mapId: string;
  mapName: string;
  mapImageUrl?: string | null;
  kind: "ban" | "pick" | "decider" | "pending";
  /** Team that banned or picked. */
  topTeam?: string;
  /** Team that chose the starting side. */
  bottomTeam?: string;
  side?: "attack" | "defend" | null;
};

type Props = {
  slots: BroadcastOverlaySlot[];
  gameLabel: string;
  bestOf: number;
  team1Name: string;
  team2Name: string;
  status: string;
  /** Team on the clock and what it must do, while the veto is live. */
  onClock?: { teamName: string; action: "ban" | "pick" | "pick_side" } | null;
  transparent: boolean;
  enterClassName: string;
};

const teamCode = (name: string) => {
  const clean = name.trim();
  const initials = clean
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();
  if (initials.length >= 2) return initials.slice(0, 4);
  return (clean.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "TEAM");
};

const sideCode = (side?: "attack" | "defend" | null) => (side === "attack" ? "ATK" : side === "defend" ? "DEF" : "");

const BROADCAST_CSS = `
@keyframes bcv-card-in { from { opacity: 0; transform: translate3d(0, 2.4vh, 0); } to { opacity: 1; transform: none; } }
@keyframes bcv-stamp-in {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(-8deg) scale(1.35); }
  70% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(0.96); }
  100% { opacity: 1; transform: translate(-50%, -50%) rotate(-8deg) scale(1); }
}
@keyframes bcv-slash-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes bcv-fade-up { from { opacity: 0; transform: translateY(1vh); } to { opacity: 1; transform: none; } }
.bcv-card { animation: bcv-card-in 420ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-stamp { animation: bcv-stamp-in 420ms cubic-bezier(0.2, 0, 0, 1) 120ms both; }
.bcv-slash { animation: bcv-slash-in 360ms cubic-bezier(0.2, 0, 0, 1) both; }
.bcv-enter { animation: bcv-fade-up 520ms cubic-bezier(0.2, 0, 0, 1) both; }
@media (prefers-reduced-motion: reduce) {
  .bcv-card, .bcv-stamp, .bcv-slash, .bcv-enter { animation: none !important; }
}
`;

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

const Stamp = ({ slot, mapNumber }: { slot: BroadcastOverlaySlot; mapNumber?: number }) => {
  if (slot.kind === "pending") return null;
  const isBan = slot.kind === "ban";
  const isDecider = slot.kind === "decider";
  return (
    <div
      className={cn(
        "bcv-stamp absolute left-1/2 top-[44%] z-20 flex min-w-[78%] flex-col items-center px-[0.9vw] py-[0.7vh] font-mono font-bold uppercase",
        isBan && "border-2 border-rose-500 bg-black/85 text-rose-400",
        slot.kind === "pick" && "border-2 border-white bg-black/80 text-white",
        isDecider && "bg-rose-500 text-white",
      )}
      style={{ transform: "translate(-50%, -50%) rotate(-8deg)" }}
    >
      <span className="text-[1.15vw] leading-tight tracking-[0.32em]">
        {isBan ? "Banned" : isDecider ? "Decider" : "Picked"}
      </span>
      {!isBan && (
        <span className="text-[0.62vw] leading-tight tracking-[0.3em] opacity-80">
          {isDecider ? `Map ${mapNumber ?? ""}` : teamCode(slot.topTeam ?? "")}
        </span>
      )}
    </div>
  );
};

const caption = (slot: BroadcastOverlaySlot) => {
  const side = slot.side && slot.bottomTeam ? `${teamCode(slot.bottomTeam)} ${sideCode(slot.side)}` : "";
  if (slot.kind === "ban") return `${teamCode(slot.topTeam ?? "")} ban`;
  if (slot.kind === "pick") return [`${teamCode(slot.topTeam ?? "")} pick`, side].filter(Boolean).join(" / ");
  if (slot.kind === "decider") return ["Decider", side].filter(Boolean).join(" / ");
  return "";
};

const Card = ({ slot, index, mapNumber }: { slot: BroadcastOverlaySlot; index: number; mapNumber?: number }) => {
  const isBan = slot.kind === "ban";
  const isPending = slot.kind === "pending";
  const isDecider = slot.kind === "decider";

  return (
    <div
      className={cn(
        "bcv-card relative isolate h-full min-w-0 max-w-[11.5vw] flex-1 overflow-hidden bg-zinc-900",
        isDecider && "outline outline-2 -outline-offset-2 outline-rose-500",
        isPending && "outline outline-1 -outline-offset-1 outline-dashed outline-white/15",
      )}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {slot.mapImageUrl ? (
        <div
          className={cn(
            "absolute inset-0 bg-cover bg-center",
            isBan && "grayscale",
            isPending && "opacity-25 grayscale",
          )}
          style={{ backgroundImage: `url(${slot.mapImageUrl})` }}
        />
      ) : null}
      <div className={cn(
        "absolute inset-0",
        isBan ? "bg-black/55" : "bg-gradient-to-t from-black/90 via-black/10 to-black/30",
      )} />

      {isBan ? (
        <svg className="absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <line className="bcv-slash" x1="8" y1="0" x2="92" y2="100" stroke="#f43f5e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}

      <span className="absolute left-[0.7vw] top-[1.2vh] z-20 font-mono text-[0.75vw] text-zinc-300/80">
        {String(index + 1).padStart(2, "0")}
      </span>

      <Stamp slot={slot} mapNumber={mapNumber} />

      <div className="absolute inset-x-[0.8vw] bottom-[1.8vh] z-20">
        <p className={cn(
          "truncate font-heading text-[1.75vw] font-black uppercase leading-none tracking-tight",
          isBan ? "text-zinc-500" : isPending ? "text-zinc-600" : "text-white",
        )}>
          {slot.mapName}
        </p>
        <p className="mt-[1vh] h-[1.2vw] truncate font-mono text-[0.68vw] uppercase tracking-[0.18em] text-zinc-300">
          {caption(slot)}
        </p>
      </div>
    </div>
  );
};

const footerLine = (props: Props, decider?: BroadcastOverlaySlot) => {
  if (decider) return `Decider: ${decider.mapName}`;
  if (props.onClock) {
    const verb = props.onClock.action === "ban" ? "to ban" : props.onClock.action === "pick" ? "to pick" : "to choose side";
    return `${teamCode(props.onClock.teamName)} ${verb}`;
  }
  return "";
};

/** Full-frame 16:9 broadcast graphic for OBS: the veto as a row of tall map cards. */
export const PublicMapVetoBroadcastOverlay = (props: Props) => {
  const { slots, gameLabel, bestOf, team1Name, team2Name, status, transparent, enterClassName } = props;
  const decider = slots.find((slot) => slot.kind === "decider");
  const pickNumbers = new Map<string, number>();
  slots
    .filter((slot) => slot.kind === "pick" || slot.kind === "decider")
    .forEach((slot, index) => pickNumbers.set(slot.key, index + 1));

  return (
    <main
      className={cn(
        "relative h-dvh w-dvw overflow-hidden text-white",
        transparent ? "bg-transparent" : "bg-[radial-gradient(ellipse_at_20%_0%,rgba(244,63,94,0.10),transparent_55%),linear-gradient(180deg,#0b0b0f,#09090b)]",
      )}
      aria-label="Map veto OBS overlay"
    >
      <style>{BROADCAST_CSS}</style>
      <Bracket corner="tl" />
      <Bracket corner="tr" />
      <Bracket corner="bl" />
      <Bracket corner="br" />

      <div className={cn("absolute inset-0 flex flex-col px-[5.6vw] pb-[9vh] pt-[5.2vh]", enterClassName || "bcv-enter")}>
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

        <div className="mt-[6vh] flex min-h-0 flex-1 justify-center gap-[0.9vw]">
          {slots.map((slot, index) => (
            <Card key={`${slot.key}:${slot.kind}:${slot.side ?? ""}`} slot={slot} index={index} mapNumber={pickNumbers.get(slot.key)} />
          ))}
        </div>

        <p className="mt-[5vh] h-[2vw] font-mono text-[1.35vw] uppercase tracking-[0.3em] text-rose-400">
          {footerLine(props, decider)}
        </p>
      </div>

      <div className="absolute bottom-[3.6vh] left-[5.2vw]">
        <LiveClock label={status === "completed" ? "Final" : "Live"} />
      </div>
    </main>
  );
};

export default PublicMapVetoBroadcastOverlay;
