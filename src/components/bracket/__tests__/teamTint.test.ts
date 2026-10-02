import { describe, expect, it } from "vitest";
import { teamHue } from "../teamTint";

describe("teamHue", () => {
  it("is stable for the same team", () => {
    expect(teamHue("night-owls")).toBe(teamHue("night-owls"));
  });

  it("spreads near-identical ids across the colour wheel", () => {
    const hues = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"].map(teamHue);
    expect(new Set(hues.map((hue) => Math.floor(hue / 30))).size).toBeGreaterThan(4);
    hues.forEach((hue) => expect(hue).toBeGreaterThanOrEqual(0));
    hues.forEach((hue) => expect(hue).toBeLessThan(360));
  });
});
