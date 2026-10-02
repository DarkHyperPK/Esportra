import { useMemo } from "react";
import type { VetoStripCard } from "@/components/tournament/map-veto/buildVetoStripCards";
import { buildOverlayBeats, statesFromBeats, type OverlayBeat } from "./overlayBeats";
import { sideCode, teamCode } from "./broadcastOverlayStyles";
import { useOverlayPlayback } from "./useOverlayPlayback";
import type { OverlayPoolMap } from "./overlayCardLayers";

/** Team on the clock and what it must do, while the veto is live. */
export type OverlayOnClock = { teamName: string; action: "ban" | "pick" | "pick_side" } | null;

/** What every broadcast overlay theme receives from the overlay page. */
export type OverlayThemeProps = {
  /** The map pool, in a fixed order. One card per map; cards never move. */
  maps: OverlayPoolMap[];
  /** The veto's map decisions, in veto order. Played back beat by beat onto the cards. */
  cards: VetoStripCard[];
  gameLabel: string;
  bestOf: number;
  team1Name: string;
  team2Name: string;
  status: string;
  onClock?: OverlayOnClock;
  transparent: boolean;
  transition: "none" | "up" | "left" | "right";
  /** Play the whole veto from its first action, for a producer rolling it on air. */
  replay: boolean;
  /** History has loaded, so what's on the board is the real starting point. */
  ready: boolean;
};

type Options = {
  cards: VetoStripCard[];
  onClock?: OverlayOnClock;
  /** History and maps have loaded, so the board is the real starting point. */
  ready: boolean;
  replay: boolean;
};

export function beatLine(beat: OverlayBeat) {
  switch (beat.kind) {
    case "ban":
      return `${teamCode(beat.teamName ?? "")} bans ${beat.mapName}`;
    case "pick":
      return `${teamCode(beat.teamName ?? "")} picks ${beat.mapName}`;
    case "decider":
      return `Decider: ${beat.mapName}`;
    default:
      return `${teamCode(beat.sideTeamName ?? "")} ${sideCode(beat.side)} on ${beat.mapName}`;
  }
}

export function restingLine(onClock: OverlayOnClock | undefined, decider?: string) {
  if (decider) return `Decider: ${decider}`;
  if (!onClock) return "";
  const verb = onClock.action === "ban" ? "to ban" : onClock.action === "pick" ? "to pick" : "to choose side";
  return `${teamCode(onClock.teamName)} ${verb}`;
}

/**
 * Everything a broadcast overlay theme needs to draw the veto: the beats played
 * so far as per-map states, which maps were settled before playback started,
 * the beat on stage, and the caption line. Themes only differ in how they draw it.
 */
export function useOverlayVetoModel({ cards, onClock, ready, replay }: Options) {
  const beats = useMemo(() => buildOverlayBeats(cards), [cards]);
  const { current, shown, initial, lastPlayed, busy } = useOverlayPlayback(beats, { ready, replay });
  const states = useMemo(() => statesFromBeats(shown), [shown]);
  const quiet = useMemo(
    () => new Set(beats.filter((beat) => beat.kind !== "side" && initial.has(beat.id)).map((beat) => beat.mapName)),
    [beats, initial],
  );
  const decider = [...states.entries()].find(([, state]) => state.status === "decider" && state.side)?.[0];
  // Between beats the last moment stays up; the resting line only returns once playback has caught up.
  const onStage = current ?? (busy ? lastPlayed : null);
  const caption = onStage ? beatLine(onStage) : busy ? "" : restingLine(onClock, decider);

  return { states, quiet, current, caption };
}
