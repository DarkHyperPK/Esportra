import { describe, expect, it } from "vitest";
import { buildOverlayStepCards, toOverlayEventSlots } from "../buildOverlayStepCards";
import type { GameMap, MatchMapVeto } from "@/hooks/useMapVetoMachine";
import type { VetoHistoryEntry } from "@/hooks/useVetoHistory";

const maps: GameMap[] = ["Split", "Abyss", "Haven", "Sunset", "Ascent", "Summit", "Lotus"]
  .map((name, i) => ({ id: `m${i}`, game: "valorant", map_name: name, map_image_url: null, is_active: true }));

const entry = (actionNumber: number, teamSide: "team1" | "team2", action: VetoHistoryEntry["action"], i: number, side?: "attack" | "defend"): VetoHistoryEntry => ({
  actionNumber, teamSide, teamId: teamSide === "team1" ? "a" : "b", teamName: teamSide === "team1" ? "Alpha" : "Beta",
  action, mapId: maps[i].id, mapName: maps[i].map_name, mapImageUrl: null, side: side ?? null, createdAt: "",
});

const veto = (overrides: Partial<MatchMapVeto>): MatchMapVeto => ({
  id: "v", match_id: "x", tournament_id: "t", team1_id: "a", team2_id: "b", team1_link_token: null, team2_link_token: null,
  best_of: 3, status: "in_progress", current_team_id: "a", current_action: "ban", current_action_number: 1,
  turn_started_at: null, turn_duration_seconds: 0, team1_banned_maps: [], team2_banned_maps: [], team1_picked_maps: [],
  team2_picked_maps: [], selected_map_id: null, selected_map_pool: [], started_at: null, completed_at: null, game: "valorant",
  ...overrides,
});

const build = (v: MatchMapVeto, history: VetoHistoryEntry[]) =>
  buildOverlayStepCards({ veto: v, history, maps, game: "valorant", bestOf: 3, team1Name: "Alpha", team2Name: "Beta", team1Id: "a", team2Id: "b" });

describe("buildOverlayStepCards", () => {
  it("lays out every map decision before the veto starts, with nothing settled", () => {
    const cards = build(veto({ status: "pending", current_action: null, current_team_id: null, current_action_number: 0 }), []);

    expect(cards.length).toBe(7);
    expect(cards.every((card) => !card.mapSettled && card.status === "upcoming")).toBe(true);
  });

  it("keeps slots in the same order as the veto advances", () => {
    const early = build(veto({ current_action_number: 2, current_team_id: "b" }), [entry(1, "team1", "ban", 0)]);
    const later = build(veto({ current_action_number: 3, current_team_id: "a", current_action: "pick" }), [entry(1, "team1", "ban", 0), entry(2, "team2", "ban", 1)]);

    expect(later.map((card) => card.stepNumber)).toEqual(early.map((card) => card.stepNumber));
  });

  it("settles a pick before its side is chosen, and airs the side only once chosen", () => {
    const history = [entry(1, "team1", "ban", 0), entry(2, "team2", "ban", 1), entry(3, "team1", "pick", 2)];
    const sideOpen = toOverlayEventSlots(build(veto({ current_action_number: 4, current_action: "pick_side", current_team_id: "b" }), history));
    expect(sideOpen[2]).toMatchObject({ kind: "pick", mapName: "Haven", side: null });

    const sideChosen = toOverlayEventSlots(build(
      veto({ current_action_number: 5, current_action: "pick", current_team_id: "b" }),
      [...history, entry(4, "team2", "pick_side", 2, "defend")],
    ));
    expect(sideChosen[2]).toMatchObject({ kind: "pick", side: "defend", bottomTeam: "Beta" });
  });
});

describe("buildMapStates", () => {
  it("marks banned and picked maps and numbers the series", async () => {
    const { buildMapStates } = await import("../buildOverlayStepCards");
    const history = [
      entry(1, "team1", "ban", 0), entry(2, "team2", "ban", 1), entry(3, "team1", "pick", 2), entry(4, "team2", "pick_side", 2, "defend"),
      entry(5, "team2", "pick", 3),
    ];
    const states = buildMapStates(build(veto({ current_action_number: 6, current_action: "pick_side", current_team_id: "a" }), history));

    expect(states.get("Split")).toMatchObject({ status: "ban", teamName: "Alpha" });
    expect(states.get("Haven")).toMatchObject({ status: "pick", teamName: "Alpha", mapNumber: 1, side: "defend", sideTeamName: "Beta" });
    expect(states.get("Sunset")).toMatchObject({ status: "pick", mapNumber: 2, side: null });
    expect(states.has("Lotus")).toBe(false);
  });

  it("marks the last map as the decider once it's the one left", async () => {
    const { buildMapStates } = await import("../buildOverlayStepCards");
    const history = [
      entry(1, "team1", "ban", 0), entry(2, "team2", "ban", 1), entry(3, "team1", "pick", 2), entry(4, "team2", "pick_side", 2, "defend"),
      entry(5, "team2", "pick", 3), entry(6, "team1", "pick_side", 3, "attack"), entry(7, "team1", "ban", 4), entry(8, "team2", "ban", 5),
    ];
    const states = buildMapStates(build(veto({
      current_action_number: 9,
      current_action: "pick_side",
      current_team_id: "a",
      team1_banned_maps: ["m0", "m4"],
      team2_banned_maps: ["m1", "m5"],
      team1_picked_maps: [{ map_id: "m2", side: "defend" }],
      team2_picked_maps: [{ map_id: "m3", side: "attack" }],
    }), history));

    expect(states.get("Lotus")).toMatchObject({ status: "decider", mapNumber: 3 });
    expect(states.get("Split")).toMatchObject({ status: "ban" });
  });
});
