import { afterEach, describe, expect, it, vi } from "vitest";
import { initReduceMotion, readReduceMotion, setReduceMotion, subscribeReduceMotion } from "../motionPreference";

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-reduce-motion");
});

describe("reduce motion preference", () => {
  it("is off by default, whatever the OS says", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    initReduceMotion();
    expect(readReduceMotion()).toBe(false);
    expect(document.documentElement.hasAttribute("data-reduce-motion")).toBe(false);
    vi.restoreAllMocks();
  });

  it("turns on only when the person opts in, and turns back off", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeReduceMotion(listener);

    setReduceMotion(true);
    expect(readReduceMotion()).toBe(true);
    expect(document.documentElement.getAttribute("data-reduce-motion")).toBe("true");

    setReduceMotion(false);
    expect(readReduceMotion()).toBe(false);
    expect(document.documentElement.hasAttribute("data-reduce-motion")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it("restores a saved choice before first paint", () => {
    window.localStorage.setItem("esportra:reduce-motion", "true");
    initReduceMotion();
    expect(document.documentElement.getAttribute("data-reduce-motion")).toBe("true");
  });
});
