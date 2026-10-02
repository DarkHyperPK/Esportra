import { describe, expect, it } from "vitest";
import type { BracketMatch, BracketTeam } from "@/types/bracketTypes";
import { bracketChampion, computeBracketLayout, DEFAULT_BRACKET_DIMS, roundLabel, teamRoute } from "../bracketLayout";

const team = (id: string, seed = 1): BracketTeam => ({ id, name: id.toUpperCase(), seed });
const match = (id: string, round: number, matchNumber: number, extra: Partial<BracketMatch> = {}): BracketMatch => ({
  id, round, matchNumber, team1: null, team2: null, winner: null, score: null, team1_score: null, team2_score: null,
  status: "pending", bracketSide: "winners", ...extra,
});

// 4-team single elimination: two semis feed the final.
const single = (): BracketMatch[] => [
  match("s1", 1, 1, { team1: team("a", 1), team2: team("d", 4), winner: team("a", 1), status: "completed", nextMatchId: "f" }),
  match("s2", 1, 2, { team1: team("b", 2), team2: team("c", 3), status: "in_progress", nextMatchId: "f" }),
  match("f", 2, 1, { team1: team("a", 1) }),
];

describe("roundLabel", () => {
  it("names single-elimination rounds the way the scene does", () => {
    expect(roundLabel("winners", 0, 4, 8, false)).toBe("Round of 16");
    expect(roundLabel("winners", 1, 4, 4, false)).toBe("Quarterfinals");
    expect(roundLabel("winners", 2, 4, 2, false)).toBe("Semifinals");
    expect(roundLabel("winners", 3, 4, 1, false)).toBe("Final");
  });

  it("names double-elimination rounds by bracket", () => {
    expect(roundLabel("winners", 2, 3, 1, true)).toBe("Upper final");
    expect(roundLabel("winners", 1, 3, 2, true)).toBe("Upper semifinals");
    expect(roundLabel("losers", 0, 4, 2, true)).toBe("Lower round 1");
    expect(roundLabel("losers", 3, 4, 1, true)).toBe("Lower final");
    expect(roundLabel("final", 0, 2, 1, true)).toBe("Grand final");
    expect(roundLabel("final", 1, 2, 1, true)).toBe("Grand final reset");
  });
});

describe("computeBracketLayout", () => {
  it("centres a match between the two that feed it and seats the champion after the final", () => {
    const layout = computeBracketLayout(single());
    const { cardWidth, roundGap, cardHeight, championHeight } = DEFAULT_BRACKET_DIMS;
    const [s1, s2, f] = [layout.positions.s1, layout.positions.s2, layout.positions.f];

    expect(f.x).toBe(cardWidth + roundGap);
    expect(f.y).toBe((s1.y + s2.y) / 2);
    expect(layout.champion).toEqual({ x: f.x + cardWidth + roundGap, y: f.y + cardHeight / 2 - championHeight / 2, sourceId: "f" });
    expect(layout.sections).toEqual([]);
  });

  it("counts what each column has played and what is live", () => {
    const layout = computeBracketLayout(single());
    expect(layout.columns.map((c) => [c.label, c.played, c.live, c.total])).toEqual([
      ["Semifinals", 1, 1, 2],
      ["Final", 0, 0, 1],
    ]);
  });

  it("puts the lower bracket under the upper one and the grand final after both", () => {
    const matches = [
      match("u1", 1, 1, { nextMatchId: "uf" }), match("u2", 1, 2, { nextMatchId: "uf" }),
      match("uf", 2, 1, { nextMatchId: "gf" }),
      match("l1", 1, 1, { bracketSide: "losers", nextMatchId: "l2" }),
      match("l2", 2, 1, { bracketSide: "losers", nextMatchId: "gf" }),
      match("gf", 1, 1, { bracketSide: "final" }),
    ];
    const layout = computeBracketLayout(matches);
    const { positions: p } = layout;

    expect(layout.sections.map((s) => s.side)).toEqual(["winners", "losers"]);
    expect(p.l1.y).toBeGreaterThan(p.u2.y + DEFAULT_BRACKET_DIMS.cardHeight);
    expect(p.l2.y).toBe(p.l1.y);
    expect(p.gf.x).toBeGreaterThan(Math.max(p.uf.x, p.l2.x));
    expect(p.gf.y).toBe((p.uf.y + p.l2.y) / 2);
    expect(layout.champion?.sourceId).toBe("gf");
  });

  it("returns an empty layout for no matches", () => {
    expect(computeBracketLayout([])).toMatchObject({ champion: null, width: 0, height: 0 });
  });
});

describe("bracketChampion", () => {
  it("is empty until the last match is decided", () => {
    const matches = single();
    expect(bracketChampion(matches, "f")).toBeNull();
    matches[2] = { ...matches[2], team2: team("b", 2), status: "completed", winner: team("a", 1) };
    expect(bracketChampion(matches, "f")?.id).toBe("a");
  });

  it("crowns the grand final winner when the reset is never needed", () => {
    const matches = [
      match("gf", 1, 1, { bracketSide: "final", status: "completed", winner: team("a"), nextMatchId: "gr" }),
      match("gr", 2, 1, { bracketSide: "final" }),
    ];
    expect(bracketChampion(matches, "gr")?.id).toBe("a");
  });
});

describe("teamRoute", () => {
  it("lights the matches a team played and the road still ahead", () => {
    const route = teamRoute(single(), "b");
    expect([...route.played]).toEqual(["s2"]);
    expect([...route.ahead]).toEqual(["f"]);
    expect(route.alive).toBe(true);
  });

  it("has no road ahead for a team that is out", () => {
    const route = teamRoute(single(), "d");
    expect([...route.played]).toEqual(["s1"]);
    expect(route.ahead.size).toBe(0);
    expect(route.alive).toBe(false);
  });
});

describe("summarizeBracket and bracketTeams", () => {
  it("counts played, live and distinct teams, and lists teams by seed", async () => {
    const { summarizeBracket, bracketTeams } = await import("../bracketLayout");
    expect(summarizeBracket(single())).toEqual({ total: 3, played: 1, live: 1, teams: 4 });
    expect(bracketTeams(single()).map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });
});
