import { describe, expect, it } from "vitest";
import { chooseMapImage, valorantMapSplash } from "../valorantMapAssets";

const stored = "https://cdn.example.com/haven.jpg";

describe("valorantMapSplash", () => {
  it("resolves known maps by name, case and spacing aside", () => {
    expect(valorantMapSplash(" Haven ")).toBe("https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/splash.png");
    expect(valorantMapSplash("PEARL")).toContain("fd267378-4d1d-484f-ff52-77821ed10dc2");
  });

  it("has nothing for unknown maps", () => {
    expect(valorantMapSplash("Dust2")).toBeNull();
  });
});

describe("chooseMapImage", () => {
  const splash = valorantMapSplash("Haven");

  it("keeps stored art that is large enough", () => {
    expect(chooseMapImage(stored, splash, { width: 1920, height: 1080 })).toBe(stored);
  });

  it("upgrades stored art that would blur on a tall card", () => {
    expect(chooseMapImage(stored, splash, { width: 452, height: 128 })).toBe(splash);
    expect(chooseMapImage(stored, splash, { width: 1200, height: 400 })).toBe(splash);
  });

  it("upgrades stored art that fails to load", () => {
    expect(chooseMapImage(stored, splash, "error")).toBe(splash);
  });

  it("keeps stored art when there is no official splash", () => {
    expect(chooseMapImage(stored, null, { width: 100, height: 100 })).toBe(stored);
  });
});

describe("withMapImages", () => {
  it("points entries at their map's current image and leaves the rest alone", async () => {
    const { withMapImages } = await import("../valorantMapAssets");
    const entries = [{ mapId: "m1", mapImageUrl: "old" }, { mapId: "m2", mapImageUrl: "keep" }];
    const result = withMapImages(entries, [{ id: "m1", map_image_url: "new" }]);
    expect(result).toEqual([{ mapId: "m1", mapImageUrl: "new" }, { mapId: "m2", mapImageUrl: "keep" }]);
    expect(result[1]).toBe(entries[1]);
  });
});
