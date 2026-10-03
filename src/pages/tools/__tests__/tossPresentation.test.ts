import { describe, expect, it } from "vitest";
import { tossDecisionLine, tossWinnerSide, type TossView } from "../tossPresentation";

const WIN = "w-1";
const LOSE = "l-2";

const view = (overrides: Partial<TossView> = {}): TossView => ({
  role: "viewer",
  team1Name: "Alpha",
  team2Name: "Beta",
  team1Id: "",
  team2Id: "",
  tossWinnerTeamId: WIN,
  tossWinnerName: "Alpha",
  tossFirstActorTeamId: WIN,
  tossFirstActorName: "Alpha",
  isTossWinner: null,
  currentAction: "ban",
  ...overrides,
});

describe("tossWinnerSide", () => {
  it("compares ids on the host link", () => {
    expect(tossWinnerSide(view({ role: "host", team1Id: LOSE, team2Id: WIN, tossWinnerName: "Beta" }))).toBe("team2");
  });

  it("uses isTossWinner and the role on team links", () => {
    expect(tossWinnerSide(view({ role: "team2", isTossWinner: true, tossWinnerName: "Beta" }))).toBe("team2");
    expect(tossWinnerSide(view({ role: "team2", isTossWinner: false }))).toBe("team1");
  });

  it("matches the winner's name for viewers and the overlay", () => {
    expect(tossWinnerSide(view({ tossWinnerName: "Beta" }))).toBe("team2");
    expect(tossWinnerSide(view())).toBe("team1");
  });

  it("can't name a side when both teams share a name", () => {
    expect(tossWinnerSide(view({ team2Name: "Alpha" }))).toBeNull();
  });

  it("is null before the toss", () => {
    expect(tossWinnerSide(view({ tossWinnerTeamId: null, tossWinnerName: null }))).toBeNull();
  });
});

describe("tossDecisionLine", () => {
  it("tells the winner what they chose", () => {
    expect(tossDecisionLine(view({ role: "team1", isTossWinner: true }))).toBe("You won the toss and took the first ban.");
    expect(tossDecisionLine(view({ role: "team1", isTossWinner: true, tossFirstActorTeamId: LOSE, tossFirstActorName: "Beta" })))
      .toBe("You won the toss and gave the first ban to Beta.");
  });

  it("tells the other team what was decided and whose move it is", () => {
    expect(tossDecisionLine(view({ role: "team2", isTossWinner: false }))).toBe("Alpha won the toss and chose to go first.");
    expect(tossDecisionLine(view({ role: "team2", isTossWinner: false, tossFirstActorTeamId: LOSE, tossFirstActorName: "Beta" })))
      .toBe("Alpha won the toss and gave you the first ban. Your move.");
  });

  it("names both teams for the host and the overlay", () => {
    expect(tossDecisionLine(view({ role: "host" }))).toBe("Alpha won the toss and chose to go first.");
    expect(tossDecisionLine(view({ tossFirstActorTeamId: LOSE, tossFirstActorName: "Beta" })))
      .toBe("Alpha won the toss and gave the first ban to Beta.");
  });

  it("uses the first action of the veto", () => {
    expect(tossDecisionLine(view({ role: "team1", isTossWinner: true, currentAction: "pick" }))).toBe("You won the toss and took the first pick.");
    expect(tossDecisionLine(view({ currentAction: null, tossFirstActorTeamId: LOSE, tossFirstActorName: "Beta" })))
      .toBe("Alpha won the toss and gave the first turn to Beta.");
  });

  it("is null until the winner has chosen", () => {
    expect(tossDecisionLine(view({ tossFirstActorTeamId: null, tossFirstActorName: null }))).toBeNull();
  });
});
