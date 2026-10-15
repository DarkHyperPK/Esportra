import { useState } from "react";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useImportBroadcastScreens } from "@/hooks/useBroadcastScreens";
import {
  SCREEN_CATALOG,
  SCREEN_TEMPLATES,
  screenName,
  isTransparentOverlay,
} from "@/services/broadcast/screenCatalog";
import { getApiErrorMessage } from "@/lib/apiClient";
import { HudSetupPreview } from "./HudSetupPreview";
import { SetupFlowOrder } from "./SetupFlowOrder";
import { RundownTemplates } from './RundownTemplates';
import type {
  BroadcastShowDetail,
  ShowMatchSlot,
  ShowSegment,
} from "@/types/broadcast";
export function SetupScreenLibrary({
  show,
  match,
  segments,
}: {
  show: BroadcastShowDetail;
  match?: ShowMatchSlot;
  segments: ShowSegment[];
}) {
  const [preview, setPreview] = useState<string[]>(["starting-soon"]),
    [search, setSearch] = useState("");
  const importer = useImportBroadcastScreens(show.id);
  const locked = ["live", "ended", "cancelled"].includes(show.status),
    disabled = importer.isPending || locked || !match;
  async function add(overlays: string[]) {
    if (!match) return;
    try {
      await importer.mutateAsync({
        matchId: match.matchId,
        screens: overlays.map((overlay) => ({
          overlay,
          title: screenName(overlay),
        })),
      });
    } catch {
      /* Visible below. */
    }
  }
  if (!match)
    return (
      <p className="setup-empty">
        Choose an eligible match before adding screens.
      </p>
    );
  return (
    <>
      <p className="setup-hint">
        Preview a set or a screen, then add it. Your selections become the
        broadcast screens.
      </p>
      <div className="setup-library">
        <div>
          <h3>Templates</h3>
          <RundownTemplates showId={show.id} match={match} locked={locked} onPreview={setPreview} />
          <p className="setup-hint">
            Ready-made screen sets from the Esportra HUD.
          </p>
          {SCREEN_TEMPLATES.map((template) => (
            <div className="setup-library-row" key={template.name}>
              <div>
                <strong>{template.name}</strong>
                <small>{template.description}</small>
              </div>
              <CommandButton
                size="sm"
                variant="ghost"
                onClick={() => setPreview(template.overlays)}
              >
                Preview set
              </CommandButton>
              <CommandButton
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => void add(template.overlays)}
              >
                Import set
              </CommandButton>
            </div>
          ))}
          <h3 className="setup-individual-title">Individual screens</h3>
          <label className="setup-field">
            Find a screen
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search screen names"
            />
          </label>
          <div className="setup-screen-list">
            {SCREEN_CATALOG.filter((screen) =>
              screen.name.toLowerCase().includes(search.toLowerCase()),
            ).map((screen) => (
              <div className="setup-library-row" key={screen.overlay}>
                <strong>{screen.name}</strong>
                <CommandButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreview([screen.overlay])}
                >
                  Preview {screen.name}
                </CommandButton>
                <CommandButton
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => void add([screen.overlay])}
                >
                  Add
                </CommandButton>
              </div>
            ))}
          </div>
        </div>
        <div className="setup-library-preview">
          <h3>Screen preview</h3>
          <div className="setup-preview-tabs">
            {preview.map((overlay) => (
              <CommandButton
                key={overlay}
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPreview([
                    overlay,
                    ...preview.filter((item) => item !== overlay),
                  ])
                }
              >
                {screenName(overlay)}
              </CommandButton>
            ))}
          </div>
          <HudSetupPreview show={show} match={match} overlay={preview[0]} />
          {isTransparentOverlay(preview[0]) && (
            <p className="setup-hint">
              Transparent overlay. Keep game or camera video below it in OBS.
              The Map screen reuses your existing gameplay scene.
            </p>
          )}
        </div>
      </div>
      {importer.isPending && <p role="status">Saving selected screens…</p>}
      {importer.isSuccess && (
        <p role="status">Screens added to the broadcast screens.</p>
      )}
      {importer.isError && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(
            importer.error,
            "Could not add screens. Your saved flow is unchanged.",
          )}
        </InlineNotice>
      )}
      <SetupFlowOrder
        showId={show.id}
        matchId={match.matchId}
        segments={segments}
        locked={locked}
      />
    </>
  );
}
