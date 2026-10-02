import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BEAT_MS, type OverlayBeat } from "../overlayBeats";
import { BEAT_GAP_MS, REPLAY_LEAD_MS, useOverlayPlayback } from "../useOverlayPlayback";

const ban = (id: string, mapName: string): OverlayBeat => ({ id, kind: "ban", mapName, teamName: "Alpha" });
const pick = (id: string, mapName: string): OverlayBeat => ({ id, kind: "pick", mapName, teamName: "Beta", mapNumber: 1 });

describe("useOverlayPlayback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts live playback from what's already settled, without replaying it", () => {
    const beats = [ban("b1", "Split"), ban("b2", "Abyss")];
    const { result } = renderHook(() => useOverlayPlayback(beats, { ready: true, replay: false }));

    expect(result.current.shown.map((beat) => beat.id)).toEqual(["b1", "b2"]);
    expect([...result.current.initial]).toEqual(["b1", "b2"]);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(result.current.current).toBeNull();
  });

  it("plays beats that arrive together one at a time, each for its full length", () => {
    const { result, rerender } = renderHook(
      ({ beats }) => useOverlayPlayback(beats, { ready: true, replay: false }),
      { initialProps: { beats: [] as OverlayBeat[] } },
    );
    rerender({ beats: [ban("b1", "Split"), pick("p1", "Haven")] });

    act(() => { vi.advanceTimersByTime(BEAT_GAP_MS); });
    expect(result.current.current?.id).toBe("b1");
    expect(result.current.shown.map((beat) => beat.id)).toEqual(["b1"]);
    expect(result.current.busy).toBe(true);

    act(() => { vi.advanceTimersByTime(BEAT_MS.ban - 1); });
    expect(result.current.current?.id).toBe("b1");

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.current).toBeNull();
    expect(result.current.lastPlayed?.id).toBe("b1");

    act(() => { vi.advanceTimersByTime(BEAT_GAP_MS); });
    expect(result.current.current?.id).toBe("p1");
    expect(result.current.busy).toBe(false);
  });

  it("replays the whole veto from its first beat after the entrance", () => {
    const beats = [ban("b1", "Split"), ban("b2", "Abyss")];
    const { result } = renderHook(() => useOverlayPlayback(beats, { ready: true, replay: true }));

    expect(result.current.shown).toEqual([]);
    expect(result.current.initial.size).toBe(0);
    act(() => { vi.advanceTimersByTime(REPLAY_LEAD_MS); });
    expect(result.current.current?.id).toBe("b1");
    act(() => { vi.advanceTimersByTime(BEAT_MS.ban); });
    act(() => { vi.advanceTimersByTime(BEAT_GAP_MS); });
    expect(result.current.current?.id).toBe("b2");
  });

  it("clears the board on a reset so the next veto plays from the start", () => {
    const { result, rerender } = renderHook(
      ({ beats }) => useOverlayPlayback(beats, { ready: true, replay: false }),
      { initialProps: { beats: [ban("b1", "Split")] } },
    );
    rerender({ beats: [] });
    expect(result.current.shown).toEqual([]);

    rerender({ beats: [ban("b1", "Lotus")] });
    act(() => { vi.advanceTimersByTime(BEAT_GAP_MS); });
    expect(result.current.current).toMatchObject({ id: "b1", mapName: "Lotus" });
    expect(result.current.initial.size).toBe(0);
  });
});
