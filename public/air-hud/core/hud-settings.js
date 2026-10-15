/* Shared validation for desktop drafts and read-only preview settings. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AirHudSettings = api;
})(typeof window === "object" ? window : globalThis, function () {
  const LAYERS = [
    "scorebug",
    "players",
    "killfeed",
    "observed",
    "minimap",
    "economy",
    "scoreboard",
    "lowerThird",
    "replay",
    "ticker",
    "roundHistory",
    "winProb",
    "spikeTimer",
    "moments",
    "sponsor",
    "eventBug",
    "poll",
    "duel",
    "teamCompare",
    "roundRecap",
    "playerCams",
  ];
  function text(value, max) {
    if (
      typeof value !== "string" ||
      value.length > max ||
      /[<>\x00-\x1f\x7f]/.test(value)
    )
      throw new Error("Use plain text within the displayed length limit.");
    return value;
  }
  function validate(input) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) =>
          ![
            "layers",
            "bannerTheme",
            "holding",
            "ticker",
            "lowerThird",
          ].includes(key),
      )
    )
      throw new Error("Choose supported HUD settings.");
    const result = {};
    if (input.layers) {
      if (
        Object.keys(input.layers).some((key) => !LAYERS.includes(key)) ||
        Object.values(input.layers).some(
          (value) => typeof value !== "boolean" && value !== "auto",
        )
      )
        throw new Error("Choose supported HUD layers.");
      result.show = { ...input.layers };
    }
    if (input.bannerTheme !== undefined) {
      if (
        !["broadcast", "compact", "monument", "impact"].includes(
          input.bannerTheme,
        )
      )
        throw new Error("Choose an installed banner style.");
      result.layout = { bannerTheme: input.bannerTheme };
    }
    if (input.holding) {
      if (
        !Number.isInteger(input.holding.minutes) ||
        input.holding.minutes < 1 ||
        input.holding.minutes > 180 ||
        Object.keys(input.holding).some(
          (key) => !["minutes", "message"].includes(key),
        )
      )
        throw new Error("Use a countdown from 1 to 180 minutes.");
      result.holding = {
        minutes: input.holding.minutes,
        message: text(input.holding.message, 180),
      };
    }
    if (input.ticker) {
      if (!Array.isArray(input.ticker) || input.ticker.length > 10)
        throw new Error("Use up to ten ticker lines.");
      result.ticker = input.ticker.map((line) => text(line, 160));
    }
    if (input.lowerThird) {
      if (
        Object.keys(input.lowerThird).some(
          (key) => !["title", "sub"].includes(key),
        )
      )
        throw new Error("Choose a title and subtitle.");
      result.lowerThird = {
        kind: "generic",
        title: text(input.lowerThird.title, 100),
        sub: text(input.lowerThird.sub, 160),
      };
    }
    return result;
  }
  function fromState(state) {
    const clean = (value, max) =>
      String(value || "")
        .replace(/[<>\x00-\x1f\x7f]/g, "")
        .slice(0, max);
    return {
      layers: Object.fromEntries(
        LAYERS.filter(
          (key) =>
            typeof state.show?.[key] === "boolean" ||
            state.show?.[key] === "auto",
        ).map((key) => [key, state.show[key]]),
      ),
      bannerTheme: ["broadcast", "compact", "monument", "impact"].includes(
        state.layout?.bannerTheme,
      )
        ? state.layout.bannerTheme
        : "broadcast",
      holding: {
        minutes: Math.max(
          1,
          Math.min(180, Math.round(state.holding?.minutes || 5)),
        ),
        message: clean(state.holding?.message, 180),
      },
      ticker: (Array.isArray(state.ticker) ? state.ticker : [])
        .slice(0, 10)
        .map((value) => clean(value, 160)),
      lowerThird: {
        title: clean(state.lowerThird?.title, 100),
        sub: clean(state.lowerThird?.sub, 160),
      },
    };
  }
  return { LAYERS, validate, fromState };
});
