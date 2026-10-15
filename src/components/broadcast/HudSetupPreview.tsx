import { useRef, useState, useEffect } from "react";
import type { BroadcastShowDetail, ShowMatchSlot } from "@/types/broadcast";
import { SCREEN_CATALOG } from "@/services/broadcast/screenCatalog";
import { useHudPreviewFonts } from "@/hooks/useHudPreviewFonts";
import type { BroadcastAppearance } from "@/schemas/broadcastAppearanceSchema";
export function HudSetupPreview({
  show,
  match,
  overlay = "ingame",
  appearance,
}: {
  show: BroadcastShowDetail;
  match?: ShowMatchSlot;
  overlay?: string;
  appearance?: BroadcastAppearance;
}) {
  const [demo, setDemo] = useState(true),
    [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const fonts = useHudPreviewFonts(!!match);
  const [missingArt, setMissingArt] = useState(false);
  const allowed = SCREEN_CATALOG.some((screen) => screen.overlay === overlay)
    ? overlay
    : "ingame";
  useEffect(() => {
    setReady(false);
  }, [allowed]);
  useEffect(() => {
    if (ready && fonts.data)
      frame.current?.contentWindow?.postMessage(
        { type: "esportra-preview-fonts", fonts: fonts.data },
        "*",
      );
  }, [ready, fonts.data]);
  useEffect(() => {
    setMissingArt(false);
    function receive(event: MessageEvent) {
      if (
        event.source === frame.current?.contentWindow &&
        event.data?.type === "esportra-preview-art-missing"
      )
        setMissingArt(true);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [allowed]);
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage(
      {
        type: "esportra-preview",
        demo,
        eventLabel: show.tournamentName || show.title,
        teams: [match?.teamA || "Team A", match?.teamB || "Team B"],
        bestOf: match?.bestOf || 1,
        appearance,
        matchId: match?.matchId,
      },
      "*",
    );
  }, [demo, ready, match, show, appearance]);
  if (!match)
    return (
      <p className="setup-empty">Choose a match first to preview its teams.</p>
    );
  return (
    <section className="setup-preview" aria-label="HUD preview">
      <div className="setup-preview-toolbar">
        <span>
          {demo
            ? "Demo preview · Sample scores & players"
            : "Layout preview · No sample match data"}
        </span>
        <label>
          <input
            type="checkbox"
            checked={demo}
            onChange={(event) => setDemo(event.target.checked)}
          />{" "}
          Demo preview
        </label>
      </div>
      <iframe
        ref={frame}
        title={`HUD preview · ${allowed}`}
        src={`/air-hud/overlays/${allowed}.html?preview=1&setup=1`}
        sandbox="allow-scripts"
        onLoad={() => setReady(true)}
      />
      <p className="setup-hint">
        {match.teamA} vs {match.teamB}. Preview uses your teams and stays
        separate from live match data. Live game events connect in Air.
      </p>
      {missingArt && (
        <p className="setup-asset-warning" role="status">
          Some preview art could not load. Check internet access for game
          assets. Team names and layout remain available.
        </p>
      )}
      {fonts.isError && (
        <p className="setup-asset-warning">
          Preview fonts could not load. Reopen the preview to retry.
        </p>
      )}
    </section>
  );
}
