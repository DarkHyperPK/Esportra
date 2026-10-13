import { describe, expect, it } from "vitest";
import { scheduleInputToIso, scheduleToLocalInput } from "../showSchedule";

describe("broadcast schedule round trip", () => {
  it("round trips UTC with seconds through local input", () => {
    const iso = "2026-10-14T12:34:56.000Z";
    expect(scheduleInputToIso(scheduleToLocalInput(iso))).toBe(iso);
  });
  it("explicit clearing is null", () =>
    expect(scheduleInputToIso("")).toBeNull());
  it("rejects malformed values and normalized impossible dates", () => {
    expect(() => scheduleInputToIso("2026-02-30T10:00")).toThrow();
    expect(() => scheduleInputToIso("not-a-date")).toThrow();
    expect(() => scheduleInputToIso("2026-10-14T25:00")).toThrow();
  });
});
