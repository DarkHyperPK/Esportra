import { describe, expect, it } from "vitest";
import { diffOverlayEvents, settledEventIds, type OverlayEventSlot } from "../overlayVetoEvents";

const pending = (key: string, mapName: string): OverlayEventSlot => ({ key, kind: "pending", mapName });

describe("overlay veto events", () => {
  it("treats everything already on screen as seen", () => {
    const slots: OverlayEventSlot[] = [
      { key: "h1", kind: "ban", mapName: "Split", topTeam: "FNC" },
      { key: "h2", kind: "pick", mapName: "Haven", topTeam: "PRX", bottomTeam: "FNC", side: "defend" },
      pending("p3", "Lotus"),
    ];
    expect(diffOverlayEvents(settledEventIds(slots), slots)).toEqual([]);
  });

  it("reports a new ban with the team that made it", () => {
    const before = [pending("p1", "Split")];
    const after: OverlayEventSlot[] = [{ key: "h1", kind: "ban", mapName: "Split", topTeam: "FNC" }];

    expect(diffOverlayEvents(settledEventIds(before), after)).toEqual([
      expect.objectContaining({ kind: "ban", mapName: "Split", teamName: "FNC", slotKey: "h1" }),
    ]);
  });

  it("reports a side choice on an existing pick as its own moment", () => {
    const before: OverlayEventSlot[] = [{ key: "h3", kind: "pick", mapName: "Haven", topTeam: "PRX" }];
    const after: OverlayEventSlot[] = [{ key: "h3", kind: "pick", mapName: "Haven", topTeam: "PRX", bottomTeam: "FNC", side: "attack" }];

    expect(diffOverlayEvents(settledEventIds(before), after)).toEqual([
      expect.objectContaining({ kind: "side", teamName: "FNC", side: "attack", slotKey: "h3" }),
    ]);
  });

  it("orders several new moments the way the veto happened", () => {
    const after: OverlayEventSlot[] = [
      { key: "h1", kind: "pick", mapName: "Haven", topTeam: "PRX", bottomTeam: "FNC", side: "defend" },
      { key: "h2", kind: "decider", mapName: "Lotus" },
    ];

    expect(diffOverlayEvents(new Set(), after).map((event) => event.kind)).toEqual(["pick", "side", "decider"]);
  });
});
