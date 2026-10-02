/** A settled veto moment worth putting on stream. */
export type OverlayVetoEvent = {
  /** Unique per moment, so a side choice on an existing pick is its own event. */
  id: string;
  slotKey: string;
  kind: "ban" | "pick" | "decider" | "side";
  mapName: string;
  mapImageUrl?: string | null;
  /** Team that acted (banned, picked, or chose the side). */
  teamName?: string;
  side?: "attack" | "defend" | null;
};

export type OverlayEventSlot = {
  key: string;
  kind: "ban" | "pick" | "decider" | "pending";
  mapName: string;
  mapImageUrl?: string | null;
  topTeam?: string;
  bottomTeam?: string;
  side?: "attack" | "defend" | null;
};

/** Everything already on screen, as event ids. */
export function settledEventIds(slots: OverlayEventSlot[]): Set<string> {
  const ids = new Set<string>();
  slots.forEach((slot) => {
    if (slot.kind === "pending") return;
    ids.add(`${slot.key}:${slot.kind}`);
    if (slot.side) ids.add(`${slot.key}:side:${slot.side}`);
  });
  return ids;
}

/**
 * New moments since the last render, in slot (veto) order: a ban, a pick or
 * the decider settling, and a starting side being chosen on a map.
 */
export function diffOverlayEvents(seen: Set<string>, slots: OverlayEventSlot[]): OverlayVetoEvent[] {
  const events: OverlayVetoEvent[] = [];

  slots.forEach((slot) => {
    if (slot.kind === "pending") return;

    const settleId = `${slot.key}:${slot.kind}`;
    if (!seen.has(settleId)) {
      events.push({
        id: settleId,
        slotKey: slot.key,
        kind: slot.kind,
        mapName: slot.mapName,
        mapImageUrl: slot.mapImageUrl,
        teamName: slot.kind === "decider" ? undefined : slot.topTeam,
      });
    }

    if (slot.side) {
      const sideId = `${slot.key}:side:${slot.side}`;
      if (!seen.has(sideId)) {
        events.push({
          id: sideId,
          slotKey: slot.key,
          kind: "side",
          mapName: slot.mapName,
          mapImageUrl: slot.mapImageUrl,
          teamName: slot.bottomTeam,
          side: slot.side,
        });
      }
    }
  });

  return events;
}
