import { cn } from "@/lib/utils";
import { CoinToss } from "@/components/tournament/map-veto/toss/CoinToss";
import type { PublicVetoState } from "./publicMapVetoUtils";
import { tossWinnerSide } from "./tossPresentation";
import { useTossReveal } from "./useTossReveal";

type Props = { state: PublicVetoState; transparent: boolean };

const OverlayTeam = ({ name, won, lost, align }: { name: string; won: boolean; lost: boolean; align: "left" | "right" }) => (
  <div className={cn("min-w-0 flex-1", align === "right" ? "text-right" : "text-left")}>
    <div className={cn(
      "truncate text-[clamp(18px,1.9vw,40px)] font-black uppercase tracking-tight transition-colors duration-500",
      lost ? "text-white/35" : "text-white",
    )}>
      {name}
    </div>
    <div className={cn("mt-1 flex h-[1.2em] items-center gap-2 text-[clamp(9px,0.75vw,15px)]", align === "right" && "justify-end")}>
      {won ? (
        <>
          <span aria-hidden className="h-0.5 w-[2em] bg-rose-500" />
          <span className="font-bold uppercase tracking-[0.2em] text-white">Won the toss</span>
        </>
      ) : null}
    </div>
  </div>
);

/** The pre-veto toss on stream: both teams, the coin between them, and who's choosing once it lands. */
export const OverlayTossScreen = ({ state, transparent }: Props) => {
  const { phase, land } = useTossReveal(state.status);
  const side = tossWinnerSide(state);
  const landed = phase === "landed";
  const caption = state.status === "pending_toss"
    ? "Pre-veto toss"
    : !landed
      ? "The coin is in the air"
      : `${state.tossWinnerName ?? "The winner"} is choosing who opens the veto`;

  return (
    <main className={cn("h-dvh w-dvw overflow-hidden text-white", transparent ? "bg-transparent" : "bg-[#050505]")}>
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <section
          className="w-full overflow-hidden bg-[#050505] shadow-[0_18px_70px_rgba(0,0,0,0.45)]"
          style={{ maxHeight: "min(24vh, 250px)" }}
          aria-label="Map veto OBS overlay"
        >
          <div className="flex w-full flex-col items-center justify-center gap-[0.6vh] px-[4vw]" style={{ height: "clamp(168px, 22vh, 238px)" }}>
            <div className="flex w-full items-center gap-[3vw]">
              <OverlayTeam name={state.team1Name} won={landed && side === "team1"} lost={landed && side === "team2"} align="right" />
              <CoinToss
                team1Name={state.team1Name}
                team2Name={state.team2Name}
                winner={side}
                phase={phase}
                onLanded={land}
                className="text-[clamp(13px,1.15vw,24px)]"
              />
              <OverlayTeam name={state.team2Name} won={landed && side === "team2"} lost={landed && side === "team1"} align="left" />
            </div>
            <div aria-live="polite" className="text-[clamp(10px,0.85vw,17px)] font-bold uppercase tracking-[0.18em] text-white/55">
              {caption}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default OverlayTossScreen;
