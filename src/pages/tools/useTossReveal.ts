import { useCallback, useEffect, useRef, useState } from "react";
import type { CoinPhase } from "@/components/tournament/map-veto/toss/CoinToss";

/**
 * Whether the coin is waiting, in the air or landed for this viewer. It flips
 * only when this page sees the toss happen (pending → result); a page opened
 * after the toss shows the coin already landed.
 */
export function useTossReveal(status: string) {
  const previous = useRef(status);
  const [phase, setPhase] = useState<CoinPhase>(status === "pending_toss" ? "idle" : "landed");

  useEffect(() => {
    const before = previous.current;
    previous.current = status;
    if (status === "pending_toss") setPhase("idle");
    else if (before === "pending_toss") setPhase("flipping");
  }, [status]);

  const land = useCallback(() => setPhase((current) => (current === "flipping" ? "landed" : current)), []);

  return { phase, land };
}
