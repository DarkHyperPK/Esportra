import { describe, it, expect } from "vitest";
import {
  parseRundownDuration,
  formatRundownDuration,
} from "../rundownDuration";
describe("persisted rundown durations", () => {
  it("round-trips MM:SS and HH:MM:SS into real seconds", () => {
    expect(parseRundownDuration("05:30")).toBe(330);
    expect(parseRundownDuration("01:05:30")).toBe(3930);
    expect(formatRundownDuration(3930)).toBe("01:05:30");
    expect(parseRundownDuration(formatRundownDuration(330))).toBe(330);
  });
  it("preserves unset duration and rejects malformed or excessive values", () => {
    expect(parseRundownDuration("")).toBeNull();
    expect(formatRundownDuration(null)).toBeNull();
    for (const invalid of ["1:90", "-1:00", "tomorrow", "25:00:00"])
      expect(() => parseRundownDuration(invalid)).toThrow();
  });
});
