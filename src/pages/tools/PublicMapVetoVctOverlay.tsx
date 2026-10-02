import { cn } from "@/lib/utils";
import { getWebsiteAssetUrl } from "@/lib/storage";
import type { OverlayMapState } from "./overlayBeats";
import { BROADCAST_OVERLAY_CSS, overlayEnterClass, teamCode } from "./broadcastOverlayStyles";
import { LiveClock, TypewriterLine } from "./OverlayParts";
import { useOverlayVetoModel, type OverlayThemeProps } from "./useOverlayVetoModel";
import { VctOverlayCard } from "./VctOverlayCard";
import {
  VCT_CREAM,
  VCT_DISPLAY_FONT,
  VCT_FONTS_HREF,
  VCT_INK,
  VCT_LABEL_FONT,
  VCT_OVERLAY_CSS,
  VCT_RED,
  VCT_TEAL,
} from "./vctOverlayStyles";

const OPEN: OverlayMapState = { status: "open" };
const ESPORTRA_LOGO = getWebsiteAssetUrl("eSportra-Logo/eSPORTRA-white-transparent.png");

const TeamBlock = ({ name, color, align }: { name: string; color: string; align: "left" | "right" }) => (
  <div className={cn("flex items-center gap-[0.8vw]", align === "right" && "flex-row-reverse")}>
    <span aria-hidden className="h-[3.6vw] w-[0.45vw]" style={{ backgroundColor: color }} />
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p className="text-[3.2vw] uppercase leading-[0.9]" style={{ fontFamily: VCT_DISPLAY_FONT, color: VCT_CREAM }}>
        {teamCode(name)}
      </p>
      <p
        className="mt-[0.4vh] max-w-[16vw] truncate text-[0.9vw] font-semibold uppercase tracking-[0.14em] text-[#ece8e1]/60"
        style={{ fontFamily: VCT_LABEL_FONT }}
      >
        {name}
      </p>
    </div>
  </div>
);

/**
 * VCT-style full-frame broadcast graphic for OBS. Same playback and motion as the
 * Esportra theme (useOverlayVetoModel); only the skin differs. Team 1 is red,
 * team 2 is teal, every ban and pick is credited in its team's colour.
 */
export const PublicMapVetoVctOverlay = (props: OverlayThemeProps) => {
  const { maps, cards, gameLabel, bestOf, team1Name, team2Name, status, transparent, transition, onClock, replay, ready } = props;
  const { states, quiet, current, caption } = useOverlayVetoModel({ cards, onClock, ready: ready && maps.length > 0, replay });
  const teamColor = (state: OverlayMapState) => {
    if (!state.teamName || state.status === "decider" || state.status === "open") return null;
    return state.teamName === team1Name ? VCT_RED : VCT_TEAL;
  };

  return (
    <main
      className="bcv-root bcv-vct relative h-dvh w-dvw overflow-hidden"
      style={{ backgroundColor: transparent ? "transparent" : VCT_INK, color: VCT_CREAM }}
      aria-label="Map veto OBS overlay"
    >
      <link rel="stylesheet" href={VCT_FONTS_HREF} />
      <style>{BROADCAST_OVERLAY_CSS + VCT_OVERLAY_CSS}</style>
      {transparent ? null : (
        <>
          <div
            aria-hidden
            className="absolute -right-[6vw] top-0 h-[46vh] w-[44vw] opacity-[0.05]"
            style={{ backgroundImage: `repeating-linear-gradient(135deg, ${VCT_CREAM} 0 2px, transparent 2px 18px)` }}
          />
          <div aria-hidden className="absolute left-0 top-[6vh] h-[14vh] w-[0.5vw]" style={{ backgroundColor: VCT_RED }} />
        </>
      )}

      <div className={cn("absolute inset-0 flex flex-col px-[5vw] pb-[6.5vh] pt-[5vh]", overlayEnterClass(transition))}>
        <div className="flex items-end justify-between gap-[3vw]">
          <div>
            <p
              className="flex items-center gap-[0.6vw] text-[1.05vw] font-semibold uppercase tracking-[0.22em] text-[#ece8e1]/70"
              style={{ fontFamily: VCT_LABEL_FONT }}
            >
              <span aria-hidden className="h-[0.6vw] w-[0.6vw]" style={{ backgroundColor: VCT_RED }} />
              {gameLabel} · Best of {bestOf}
            </p>
            <h1 className="mt-[0.8vh] text-[6.2vw] uppercase leading-[0.86]" style={{ fontFamily: VCT_DISPLAY_FONT }}>
              Map veto
            </h1>
          </div>
          <div className="mb-[0.6vh] flex items-center gap-[1.6vw]">
            <TeamBlock name={team1Name} color={VCT_RED} align="left" />
            <span className="text-[1.2vw] font-bold uppercase tracking-[0.2em] text-[#ece8e1]/45" style={{ fontFamily: VCT_LABEL_FONT }}>
              vs
            </span>
            <TeamBlock name={team2Name} color={VCT_TEAL} align="right" />
          </div>
        </div>

        <div className="mt-[4.5vh] flex min-h-0 flex-1 justify-center gap-[0.7vw]">
          {maps.map((map, index) => {
            const state = states.get(map.name) ?? OPEN;
            return (
              <VctOverlayCard
                key={map.id}
                map={map}
                state={state}
                index={index}
                quiet={quiet.has(map.name)}
                focused={current?.mapName === map.name}
                dimmed={current !== null && current.mapName !== map.name}
                teamColor={teamColor(state)}
              />
            );
          })}
        </div>

        <div className="mt-[3vh] flex h-[5vh] shrink-0 items-center justify-between gap-[2vw]">
          <div style={{ fontFamily: VCT_LABEL_FONT }}>
            <TypewriterLine
              text={caption}
              className="gap-[0.6vw] text-[1.7vw] font-bold uppercase tracking-[0.12em] text-[#ece8e1]"
              cursorClassName="h-[1.5vw] w-[0.55vw] bg-[#ff4655]"
            />
          </div>
          <div className="flex shrink-0 items-center gap-[1vw]" style={{ fontFamily: VCT_LABEL_FONT }}>
            <LiveClock
              label={status === "completed" ? "Final" : "Live"}
              className="text-[1vw] font-semibold uppercase tracking-[0.16em] text-[#ece8e1]/55"
            />
            <img src={ESPORTRA_LOGO} alt="Esportra" className="h-[1.6vw] w-auto opacity-80" />
          </div>
        </div>
      </div>
    </main>
  );
};

export default PublicMapVetoVctOverlay;
