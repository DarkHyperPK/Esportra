import { cn } from "@/lib/utils";
import { sideCode, teamCode } from "./broadcastOverlayStyles";
import type { OverlayVetoEvent } from "./overlayVetoEvents";
import type { OverlayEventPhase } from "./useOverlayEventQueue";

type Props = {
  event: OverlayVetoEvent;
  phase: OverlayEventPhase;
  mapNumber?: number;
};

function blockText(event: OverlayVetoEvent) {
  const team = event.teamName ? teamCode(event.teamName) : "";
  switch (event.kind) {
    case "ban":
      return { top: team, bottom: "Bans" };
    case "pick":
      return { top: team, bottom: "Picks" };
    case "decider":
      return { top: "Decider", bottom: "Map left" };
    default:
      return { top: team, bottom: `Start ${sideCode(event.side)}` };
  }
}

/**
 * The lower band that names the moment on air: who did what to which map.
 * Wipes in from the left, holds, wipes out to the right.
 */
export const BroadcastOverlayAnnouncement = ({ event, phase, mapNumber }: Props) => {
  const { top, bottom } = blockText(event);
  const rose = event.kind === "ban" || event.kind === "decider";

  return (
    <div
      key={event.id}
      className={cn(
        "absolute inset-0 z-30 flex overflow-hidden bg-black shadow-[0_1.4vh_4vh_rgba(0,0,0,0.6)]",
        phase === "in" ? "bcv-banner-in" : "bcv-banner-out",
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn(
        "flex w-[13vw] shrink-0 flex-col justify-center px-[1.4vw]",
        rose ? "bg-rose-500 text-white" : "bg-white text-[#09090b]",
      )}>
        <span className="bcv-banner-text truncate font-heading text-[2.4vw] font-black uppercase leading-none tracking-tight">
          {top}
        </span>
        <span className="bcv-banner-text mt-[0.5vh] font-mono text-[0.9vw] font-bold uppercase tracking-[0.32em]">
          {bottom}
        </span>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden">
        {event.mapImageUrl ? (
          <div
            className={cn("bcv-banner-art absolute inset-0 bg-cover bg-center", event.kind === "ban" && "grayscale")}
            style={{ backgroundImage: `url(${event.mapImageUrl})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
        <div className="relative flex h-full items-center justify-between gap-[2vw] px-[1.8vw]">
          <span className="bcv-banner-text truncate font-heading text-[3.2vw] font-black uppercase leading-none tracking-[-0.02em] text-white">
            {event.mapName}
          </span>
          {mapNumber && event.kind !== "ban" ? (
            <span className="bcv-banner-text shrink-0 font-mono text-[1vw] uppercase tracking-[0.3em] text-zinc-300">
              Map {mapNumber}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default BroadcastOverlayAnnouncement;
