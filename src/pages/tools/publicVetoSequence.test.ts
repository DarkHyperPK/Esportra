import { describe, expect, it } from "vitest";
import { effectivePublicVetoSequence, type PublicVetoStep } from "./publicMapVetoUtils";

const steps: PublicVetoStep[] = [
  { actionNumber: 1, action: "ban", team: "T1", isDecider: false },
  { actionNumber: 2, action: "ban", team: "T2", isDecider: false },
];

describe("effectivePublicVetoSequence", () => {
  it("shows the actual first actor after Team B wins the opening choice", () => {
    expect(effectivePublicVetoSequence({ sequence: steps, tossFirstActorSide: "team2", currentTeamSide: null, currentActionNumber: 0 }))
      .toEqual([{ ...steps[0], team: "T2" }, { ...steps[1], team: "T1" }]);
  });

  it("keeps the configured sides when toss is off", () => {
    expect(effectivePublicVetoSequence({ sequence: steps, tossFirstActorSide: null, currentTeamSide: "team1", currentActionNumber: 1 })).toEqual(steps);
  });

  it("maps upcoming logos from the current turn after the toss winner gives the opener away", () => {
    const sequence: PublicVetoStep[] = [
      ...steps,
      { actionNumber: 3, action: "ban", team: "T1", isDecider: false },
      { actionNumber: 4, action: "ban", team: "T2", isDecider: false },
    ];
    const result = effectivePublicVetoSequence({
      sequence,
      tossFirstActorSide: null,
      currentTeamSide: "team1",
      currentActionNumber: 4,
    });
    expect(result.map((step) => step.team)).toEqual(["T2", "T1", "T2", "T1"]);
  });

  it("respects a custom order whose first step belongs to the second toss side", () => {
    const sequence: PublicVetoStep[] = [{ ...steps[0], team: "T2" }, { ...steps[1], team: "T1" }];
    const result = effectivePublicVetoSequence({
      sequence,
      tossFirstActorSide: null,
      currentTeamSide: "team1",
      currentActionNumber: 1,
    });
    expect(result.map((step) => step.team)).toEqual(["T1", "T2"]);
  });
});
