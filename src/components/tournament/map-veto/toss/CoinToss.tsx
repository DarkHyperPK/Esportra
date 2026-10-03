import { useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { teamHue } from "@/components/bracket/teamTint";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type CoinPhase = "idle" | "flipping" | "landed";
type Side = "team1" | "team2";

type Props = {
  team1Name: string;
  team2Name: string;
  /** The side the coin lands on; null before the toss (and when it can't be told). */
  winner: Side | null;
  phase: CoinPhase;
  onLanded?: () => void;
  className?: string;
};

const FLIP_SECONDS = 2.6;
const SPINS = 6;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase() || name.slice(0, 2).toUpperCase();

/** One face of the coin: the team's initials on stage black, ringed in the team's own colour. */
const Face = ({ name, back }: { name: string; back?: boolean }) => {
  const hue = teamHue(name);
  return (
    <span
      aria-hidden
      className="absolute inset-0 flex items-center justify-center rounded-full"
      style={{
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transform: back ? "rotateX(180deg)" : undefined,
        background: `radial-gradient(circle at 35% 30%, hsl(${hue} 30% 22%), #0b0b0e 70%)`,
        boxShadow: `inset 0 0 0 3px hsl(${hue} 60% 52%), inset 0 0 0 7px #0b0b0e, inset 0 0 0 8px hsl(${hue} 55% 45% / 0.5)`,
      }}
    >
      <span className="font-heading text-[1.7em] font-black leading-none tracking-tight" style={{ color: `hsl(${hue} 85% 82%)` }}>
        {initials(name)}
      </span>
    </span>
  );
};

/**
 * The pre-veto coin. Team 1 is on the front, team 2 on the back. On a flip it
 * rises, spins and always settles on the winner's face (whole turns, plus a
 * half turn for team 2). Round because it's a coin; everything around it stays
 * square. With Reduce motion on it simply shows the landed face.
 */
export const CoinToss = ({ team1Name, team2Name, winner, phase, onLanded, className }: Props) => {
  const reduceMotion = useReducedMotion();
  const restAngle = winner === "team2" ? 180 : 0;
  const finalAngle = SPINS * 360 + restAngle;
  const flipping = phase === "flipping" && !reduceMotion;

  useEffect(() => {
    if (phase === "flipping" && reduceMotion) onLanded?.();
  }, [phase, reduceMotion, onLanded]);

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div className="relative h-[5em] w-[5em]" style={{ perspective: "40em" }}>
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
          initial={false}
          animate={
            flipping
              ? { rotateX: [0, finalAngle * 0.6, finalAngle * 0.94, finalAngle], y: ["0em", "-2.6em", "-0.6em", "0em"], scale: [1, 1.08, 1.02, 1] }
              : phase === "idle"
                ? { rotateX: 0, y: ["0em", "-0.25em", "0em"], scale: 1 }
                : { rotateX: restAngle, y: "0em", scale: 1 }
          }
          transition={
            flipping
              ? { duration: FLIP_SECONDS, times: [0, 0.45, 0.82, 1], ease: [0.2, 0.7, 0.25, 1] }
              : phase === "idle"
                ? { y: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }, rotateX: { duration: 0 } }
                : { duration: 0 }
          }
          onAnimationComplete={() => {
            if (flipping) onLanded?.();
          }}
        >
          <Face name={team1Name} />
          <Face name={team2Name} back />
        </motion.div>
      </div>
      {/* Shadow on the floor: shrinks while the coin is in the air. */}
      <motion.span
        aria-hidden
        className="mt-[0.5em] block h-[0.4em] w-[3.6em] rounded-[50%] bg-black/70 blur-[3px]"
        initial={false}
        animate={flipping ? { scaleX: [1, 0.45, 0.85, 1], opacity: [0.8, 0.3, 0.7, 0.8] } : { scaleX: 1, opacity: 0.8 }}
        transition={flipping ? { duration: FLIP_SECONDS, times: [0, 0.45, 0.82, 1] } : { duration: 0 }}
      />
    </div>
  );
};

export default CoinToss;
