// Runs only in the sandboxed web setup preview. No sockets, storage or live mutations.
if (
  new URLSearchParams(location.search).get("setup") === "1" &&
  window.HUD?.preview
) {
  let sample;
  addEventListener(
    "error",
    (event) => {
      if (event.target?.tagName === "IMG")
        parent.postMessage({ type: "esportra-preview-art-missing" }, "*");
    },
    true,
  );
  const escapeText = (value) =>
    String(value || "")
      .slice(0, 120)
      .replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      );
  addEventListener("message", (event) => {
    if (
      event.source === parent &&
      event.data?.type === "esportra-preview-fonts" &&
      Array.isArray(event.data.fonts)
    ) {
      for (const font of event.data.fonts.slice(0, 9)) {
        if (
          ![
            "PBk",
            "PXB",
            "PBd",
            "PSB",
            "PMd",
            "PLI",
            "JB",
            "EsportraRajdhani",
            "EsportraMontserrat",
          ].includes(font.family) ||
          !(font.buffer instanceof ArrayBuffer) ||
          font.buffer.byteLength > 2000000 ||
          !/^[4-9]00$/.test(font.weight)
        )
          continue;
        const face = new FontFace(font.family, font.buffer, {
          weight: font.weight,
        });
        face
          .load()
          .then((loaded) => document.fonts.add(loaded))
          .catch(() => {});
      }
      return;
    }
    if (
      event.source !== parent ||
      event.data?.type !== "esportra-preview" ||
      !Array.isArray(event.data.teams) ||
      event.data.teams.length !== 2
    )
      return;
    const data = event.data;
    sample ||= JSON.parse(JSON.stringify(HUD.state));
    const state = JSON.parse(JSON.stringify(data.demo ? sample : HUD_CLEAN));
    if (!data.demo) {
      // The clean runtime state contains starting loadout/map defaults; a layout-only preview omits those too.
      state.map.name = '';
      state.mapPool = []; state.series = []; state.veto = [];
      state.round.number = 0; state.round.phase = 'paused'; state.round.remaining = 0;
      state.teams.forEach(team => { team.side = ''; team.timeouts = 0; });
      state.players.forEach(team => team.forEach(player => { player.hp = 0; player.credits = 0; player.weapon = ''; player.agent = ''; player.alive = false; }));
    }
    state.event.name = escapeText(data.eventLabel);
    state.event.bestOf = [1, 3, 5, 7, 9].includes(data.bestOf)
      ? data.bestOf
      : 1;
    state.teams.forEach((team, index) => {
      team.name = escapeText(data.teams[index]);
      team.tag = escapeText(data.teams[index]).slice(0, 8);
      team.logo = "";
    });
    const appearance = data.appearance || {}, overrides = appearance.matches?.[data.matchId] || [];
    state.layout.bannerTheme = HUD.bannerTheme(appearance.bannerTheme);
    state.layout.sponsorRotation = appearance.sponsorRotation !== false;
    state.layout.sponsorSeconds = Number.isInteger(appearance.sponsorSeconds) && appearance.sponsorSeconds >= 5 && appearance.sponsorSeconds <= 120 ? appearance.sponsorSeconds : 8;
    state.show.eventBug = appearance.eventBug !== false;
    state.teams.forEach((team, index) => {
      if (overrides[index]?.displayName?.trim()) team.name = escapeText(overrides[index].displayName);
      team.color = appearance.teamColors !== false && /^#[\da-f]{6}$/i.test(overrides[index]?.color || '') ? overrides[index].color : (index === 0 ? '#ef4444' : '#3b82f6');
    });
    HUD.commit(state, { local: true });
    const label = document.querySelector(".preview-label");
    if (label)
      label.textContent = data.demo
        ? "DEMO PREVIEW · SAMPLE DATA"
        : "LAYOUT PREVIEW · NO LIVE DATA";
  });
}
