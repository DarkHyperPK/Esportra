import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { TalentRoster } from "./TalentRoster";
import { SetupMatchPicker } from "./SetupMatchPicker";
import { HudAppearanceSetup } from "./HudAppearanceSetup";
import { SetupScreenLibrary } from "./SetupScreenLibrary";
import { SetupSponsors } from "./SetupSponsors";
import { SetupCrew } from "./SetupCrew";
import { SetupReview } from "./SetupReview";
import type { BroadcastShowDetail, ShowMatchSlot } from "@/types/broadcast";
import type { useShowPreparation } from "@/hooks/useShowPreparation";

export function PreparationStepContent({
  step,
  show,
  prepared,
  match,
  onSelect,
  onEdit,
  onPair,
  onAppearanceStatus,
}: {
  step: number;
  show: BroadcastShowDetail;
  prepared: ReturnType<typeof useShowPreparation>;
  match?: ShowMatchSlot;
  onSelect: (id: string) => void;
  onEdit: () => void;
  onPair: () => void;
  onAppearanceStatus?: (status: { dirty: boolean; saving: boolean }) => void;
}) {
  const { nodes, online, segments } = prepared;
  const locked = ["live", "ended", "cancelled"].includes(show.status);
  if (step === 0)
    return (
      <section className="setup-connect" aria-label="Desktop connection">
        <div
          className={`setup-connection-state ${online > 0 ? "is-connected" : ""}`}
        >
          <span aria-hidden="true">{online > 0 ? "✓" : "○"}</span>
          <div>
            <h3>
              {nodes.isLoading ? "Checking desktop connection…" : nodes.isError ? "Connection status unavailable" : online > 0
                ? "Air is connected."
                : "Connect your production desk."}
            </h3>
            <p>
              {nodes.isLoading ? "Getting the latest desktop heartbeat." : nodes.isError ? "Retry the connection check before continuing." : online > 0
                ? `${online} workstation${online === 1 ? "" : "s"} reported in the last 30 seconds.`
                : "Open Esportra Air on your broadcast PC. Generate a pairing code here and enter it in the app."}
            </p>
          </div>
        </div>
        {nodes.data?.map((node) => (
          <div className="setup-library-row" key={node.id}>
            <strong>{node.name}</strong>
            <small>
              {node.lastSeenAt
                ? `Last seen ${new Date(node.lastSeenAt).toLocaleString()}`
                : "Waiting for first connection"}
              {!node.isActive ? " · Revoked" : ""}
            </small>
          </div>
        ))}
        <div className="setup-header-actions">
          {online > 0 && <CommandButton variant="ghost" onClick={onPair}>Pair another desktop</CommandButton>}
          <CommandButton variant="ghost" onClick={() => void nodes.refetch()}>
            Check connection
          </CommandButton>
        </div>
        {nodes.isError && (
          <InlineNotice tone="critical">
            Connection status is unavailable. Check your internet connection and
            retry.
          </InlineNotice>
        )}
        <details className="setup-help">
          <summary>Pairing failed or desktop offline?</summary>
          <p>
            Use a fresh code before it expires. Confirm Air points to the same
            Esportra environment and can reach the internet. A paired desktop
            can be offline; reopen Air and check connection again. OBS is
            connected locally after setup.
          </p>
        </details>
      </section>
    );
  if (step === 1)
    return (
      <SetupMatchPicker
        show={show}
        selectedId={match?.matchId || ""}
        onSelect={onSelect}
        onSettings={onEdit}
      />
    );
  if (step === 2) return <HudAppearanceSetup key={show.id} show={show} match={match} locked={locked} onStatusChange={onAppearanceStatus} />;
  if (step === 3)
    return (
      <>
        {segments.isLoading && <p role="status">Loading selected screens…</p>}
        {segments.isError ? (
          <InlineNotice tone="critical">
            Could not load saved screens.{" "}
            <CommandButton
              variant="ghost"
              onClick={() => void segments.refetch()}
            >
              Retry
            </CommandButton>
          </InlineNotice>
        ) : (
          <SetupScreenLibrary
            show={show}
            match={match}
            segments={segments.data || []}
          />
        )}
      </>
    );
  if (step === 4) return <SetupSponsors showId={show.id} locked={locked} />;
  if (step === 5) return <TalentRoster showId={show.id} embedded />;
  if (step === 6) return <SetupCrew showId={show.id} locked={locked} />;
  return <SetupReview show={show} match={match} prepared={prepared} />;
}
