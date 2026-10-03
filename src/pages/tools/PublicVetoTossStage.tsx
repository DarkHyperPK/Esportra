import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandButton } from "@/components/management/CommandSurface";
import { CoinToss } from "@/components/tournament/map-veto/toss/CoinToss";
import type { PublicVetoState } from "./publicMapVetoUtils";
import { tossWinnerSide } from "./tossPresentation";
import { useTossReveal } from "./useTossReveal";

type Props = {
  state: PublicVetoState;
  isHost: boolean;
  acting: boolean;
  onPerformToss?: () => Promise<void>;
  onPerformTossChoice?: (goFirst: boolean) => Promise<void>;
};

const TeamName = ({ name, won, lost, align }: { name: string; won: boolean; lost: boolean; align: "left" | "right" }) => (
  <div className={cn("min-w-0", align === "right" && "text-right")}>
    <p className={cn(
      "truncate font-heading text-lg font-black tracking-tight transition-colors duration-500 sm:text-3xl",
      lost ? "text-zinc-600" : "text-white",
    )}>
      {name}
    </p>
    <div className={cn("mt-2 flex h-4 items-center gap-2", align === "right" && "justify-end")}>
      {won ? (
        <>
          <span aria-hidden className="h-0.5 w-6 bg-rose-500" />
          <span className="whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white">Won the toss</span>
        </>
      ) : null}
    </div>
  </div>
);

/**
 * Before the veto: the coin between the two teams. The host flips it, every
 * link watches it land, then only the winner picks who opens the veto while
 * everyone else is told who's choosing.
 */
export const PublicVetoTossStage = ({ state, isHost, acting, onPerformToss, onPerformTossChoice }: Props) => {
  const { phase, land } = useTossReveal(state.status);
  const [choice, setChoice] = useState<boolean | null>(null);
  const side = tossWinnerSide(state);
  const landed = phase === "landed";
  const winnerName = state.tossWinnerName ?? (side === "team1" ? state.team1Name : side === "team2" ? state.team2Name : null);
  const isWinnerLink = !isHost && state.isTossWinner === true;
  const opponentName = state.role === "team1" ? state.team2Name : state.team1Name;

  const choose = (goFirst: boolean) => {
    setChoice(goFirst);
    void onPerformTossChoice?.(goFirst);
  };

  const message = (() => {
    if (state.status === "pending_toss") {
      return isHost ? "Flip the coin. The winner chooses who opens the veto." : "Waiting for the host to flip the coin.";
    }
    if (!landed) return "The coin is in the air.";
    if (isWinnerLink) return "You won the toss. Choose who opens the veto.";
    return `${winnerName ?? "The winner"} won the toss and is choosing who opens the veto.`;
  })();

  return (
    <section aria-label="Pre-veto toss" className="border-y border-white/[0.07] py-8 sm:py-10">
      <p className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Pre-veto toss</p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-10">
        <TeamName name={state.team1Name} won={landed && side === "team1"} lost={landed && side === "team2"} align="right" />
        <CoinToss
          team1Name={state.team1Name}
          team2Name={state.team2Name}
          winner={side}
          phase={phase}
          onLanded={land}
          className="text-[16px] sm:text-[30px]"
        />
        <TeamName name={state.team2Name} won={landed && side === "team2"} lost={landed && side === "team1"} align="left" />
      </div>

      <p role="status" aria-live="polite" className="mx-auto mt-8 max-w-xl text-center text-sm text-zinc-300 sm:text-base">
        {message}
      </p>

      {state.status === "pending_toss" && isHost ? (
        <div className="mt-5 flex justify-center">
          <CommandButton size="lg" disabled={acting} onClick={() => { void onPerformToss?.(); }}>
            {acting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Flip the coin
          </CommandButton>
        </div>
      ) : null}

      {state.status === "toss_choice_pending" && landed && isWinnerLink ? (
        <div className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
          <CommandButton variant="secondary" size="lg" disabled={acting} onClick={() => choose(true)}>
            {acting && choice === true ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            We go first
          </CommandButton>
          <CommandButton variant="secondary" size="lg" disabled={acting} onClick={() => choose(false)}>
            {acting && choice === false ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            <span className="truncate">{opponentName} goes first</span>
          </CommandButton>
        </div>
      ) : null}
    </section>
  );
};

export default PublicVetoTossStage;
