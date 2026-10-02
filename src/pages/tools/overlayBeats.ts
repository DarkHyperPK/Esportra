import type { VetoStripCard } from "@/components/tournament/map-veto/buildVetoStripCards";

export type OverlayMapState = {
  status: "open" | "ban" | "pick" | "decider";
  /** Team that banned or picked. */
  teamName?: string;
  /** Position in the series for picks and the decider. */
  mapNumber?: number;
  side?: "attack" | "defend" | null;
  sideTeamName?: string;
};

/**
 * One on-air moment of the broadcast playback: a ban, a pick, the decider
 * being revealed, or a starting side being chosen. The overlay plays beats
 * one at a time, in veto order, however fast the real veto happened.
 */
export type OverlayBeat = {
  /** Stable per moment: a side choice on a pick is its own beat. */
  id: string;
  kind: "ban" | "pick" | "decider" | "side";
  mapName: string;
  /** Team that banned or picked. */
  teamName?: string;
  mapNumber?: number;
  side?: "attack" | "defend" | null;
  /** Team that chose the side. */
  sideTeamName?: string;
};

/** How long each beat holds the stage. Long enough for the whole motion to read. */
export const BEAT_MS: Record<OverlayBeat["kind"], number> = {
  ban: 3600,
  pick: 3600,
  decider: 3900,
  side: 2400,
};

/**
 * Every moment the veto has produced so far, in veto order. The decider is a
 * beat as soon as it's the map left, even while its side is still open.
 */
export function buildOverlayBeats(cards: VetoStripCard[]): OverlayBeat[] {
  const beats: OverlayBeat[] = [];
  let mapNumber = 0;

  cards.forEach((card) => {
    if (!card.mapName) return;
    const isDecider = card.kind === "decider" && (card.mapSettled || card.status === "current");
    if (!card.mapSettled && !isDecider) return;
    if (card.kind !== "ban") mapNumber += 1;

    beats.push({
      id: `${card.key}:${card.kind}`,
      kind: isDecider ? "decider" : card.kind,
      mapName: card.mapName,
      teamName: card.kind === "decider" ? undefined : card.teamName,
      mapNumber: card.kind === "ban" ? undefined : mapNumber,
    });

    if (card.sideStatus === "done" && card.side) {
      beats.push({
        id: `${card.key}:side:${card.side}`,
        kind: "side",
        mapName: card.mapName,
        side: card.side,
        sideTeamName: card.sideTeamName,
      });
    }
  });

  return beats;
}

/** What each map looks like once the given beats have played, keyed by map name. */
export function statesFromBeats(beats: OverlayBeat[]): Map<string, OverlayMapState> {
  const states = new Map<string, OverlayMapState>();

  beats.forEach((beat) => {
    const existing = states.get(beat.mapName);
    if (beat.kind === "side") {
      if (existing) states.set(beat.mapName, { ...existing, side: beat.side, sideTeamName: beat.sideTeamName });
      return;
    }
    states.set(beat.mapName, {
      status: beat.kind,
      teamName: beat.teamName,
      mapNumber: beat.mapNumber,
      side: existing?.side ?? null,
      sideTeamName: existing?.sideTeamName,
    });
  });

  return states;
}
