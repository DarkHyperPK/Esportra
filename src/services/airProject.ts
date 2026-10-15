import type { AirDocument } from "@/types/air";
export function newAirDocument(): AirDocument {
  return {
    schemaVersion: 1,
    teams: [],
    matches: [],
    screens: [
      ["Opening", "pre_show", "starting-soon"],
      ["Match Introduction", "pre_show", "match-intro"],
      ["Map", "match", "ingame"],
      ["Break", "break", "brb"],
      ["Results", "post_show", "map-result"],
    ].map(([title, type, overlay]) => ({
      id: crypto.randomUUID(),
      title,
      type: screenType(type),
      overlay,
      matchId: null,
    })),
    bracket: { format: "manual", stages: [] },
    sponsors: [],
    talent: [],
    crew: [],
  };
}
function screenType(
  value: string,
): "pre_show" | "match" | "break" | "post_show" {
  return value === "match"
    ? "match"
    : value === "break"
      ? "break"
      : value === "post_show"
        ? "post_show"
        : "pre_show";
}
