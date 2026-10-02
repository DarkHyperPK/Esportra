import { cn } from "@/lib/utils";
import { getWebsiteAssetUrl } from "@/lib/storage";
import type { OverlayMapState } from "./overlayBeats";
import { BROADCAST_OVERLAY_CSS, overlayEnterClass, teamCode } from "./broadcastOverlayStyles";
import { BroadcastOverlayCard } from "./BroadcastOverlayCard";
import { LiveClock, TypewriterLine } from "./OverlayParts";
import { useOverlayVetoModel, type OverlayThemeProps } from "./useOverlayVetoModel";

const OPEN: OverlayMapState = { status: "open" };
/** The official mark, the same file the navbar uses. */
const ESPORTRA_LOGO = getWebsiteAssetUrl("eSportra-Logo/eSPORTRA-white-transparent.png");

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

/**
 * Full-frame 16:9 broadcast graphic for OBS: the map pool as a row of tall cards.
 * It doesn't mirror the veto live; it plays it back one beat at a time (see
 * useOverlayPlayback). Each beat lifts its card, plays the layers on it (see
 * broadcastOverlayStyles) and types the moment out in the caption.
 */
export const PublicMapVetoBroadcastOverlay = (props: OverlayThemeProps) => {
  const { maps, cards, gameLabel, bestOf, team1Name, team2Name, status, transparent, transition, onClock, replay, ready } = props;
  const { states, quiet, current, caption } = useOverlayVetoModel({ cards, onClock, ready: ready && maps.length > 0, replay });

  return (
    <main
      className={cn(
        "bcv-root relative h-dvh w-dvw overflow-hidden text-white",
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
          <div className="flex items-center gap-[0.9vw] font-mono text-[0.85vw] uppercase tracking-[0.24em] text-zinc-400">
            <img src={ESPORTRA_LOGO} alt="Esportra" className="h-[1.5vw] w-auto" />
            <span aria-hidden className="h-[1.1vw] w-px bg-white/25" />
            Best of {bestOf}
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
              quiet={quiet.has(map.name)}
              focused={current?.mapName === map.name}
              dimmed={current !== null && current.mapName !== map.name}
            />
          ))}
        </div>

        <div className="mt-[3.5vh] flex h-[6vh] shrink-0 items-center">
          <TypewriterLine
            text={caption}
            className="gap-[0.5vw] font-mono text-[1.35vw] uppercase tracking-[0.3em] text-rose-400"
            cursorClassName="h-[1.3vw] w-[0.7vw] bg-rose-500"
          />
        </div>
      </div>

      <div className="absolute bottom-[3.6vh] left-[5.2vw]">
        <LiveClock
          label={status === "completed" ? "Final" : "Live"}
          className="font-mono text-[0.95vw] uppercase tracking-[0.14em] text-zinc-400"
        />
      </div>
    </main>
  );
};

export default PublicMapVetoBroadcastOverlay;
