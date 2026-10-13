import { Link } from "react-router-dom";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { MatchSlotPlanner } from "./MatchSlotPlanner";
import { TalentRoster } from "./TalentRoster";
import { RundownPreparation } from "./RundownPreparation";
import { AirConfigurationPreview } from "./AirConfigurationPreview";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { BroadcastShowDetail } from "@/types/broadcast";
import type { useShowPreparation } from "@/hooks/useShowPreparation";

export function PreparationStepContent({
  step,
  show,
  prepared,
  onEdit,
  onPair,
}: {
  step: number;
  show: BroadcastShowDetail;
  prepared: ReturnType<typeof useShowPreparation>;
  onEdit: () => void;
  onPair: () => void;
}) {
  const { nodes, crew, sponsors, push, online } = prepared;
  const showId = show.id;
  const base = `/broadcast/shows/${showId}`;
  const query = step === 4 ? crew : step === 6 ? sponsors : null;
  return (
    <>
      {query?.isError && (
        <InlineNotice tone="critical">
          Could not load this step.{" "}
          <button onClick={() => void query.refetch()}>Retry</button>
        </InlineNotice>
      )}
      {step === 0 && (
        <>
          <p className="mb-5 text-zinc-400">
            Current show: <strong className="text-white">{show.title}</strong>
          </p>
          <CommandButton onClick={() => onEdit()}>
            Edit show identity
          </CommandButton>
        </>
      )}
      {step === 1 && (
        <>
          <p className="mb-5 text-zinc-400">
            {show.tournamentName ||
              "Link an organization tournament to select its bracket matches."}
          </p>
          <CommandButton onClick={() => onEdit()}>
            Choose tournament
          </CommandButton>
        </>
      )}
      {step === 2 && <MatchSlotPlanner show={show} />}
      {step === 3 && (
        <>
          <p className="mb-5 text-zinc-400">
            {online} node{online === 1 ? "" : "s"} seen in the last 30 seconds.
            Pair Air on the production workstation. OBS and game-feed checks
            happen locally.
          </p>
          {nodes.isError && (
            <InlineNotice tone="critical">
              Could not load nodes.{" "}
              <button onClick={() => void nodes.refetch()}>Retry</button>
            </InlineNotice>
          )}
          <CommandButton onClick={() => onPair()}>
            Pair desktop node
          </CommandButton>
          <CommandButton className="ml-3" asChild variant="ghost">
            <Link to={`${base}/nodes`}>Node monitor</Link>
          </CommandButton>
        </>
      )}
      {step === 4 && (
        <>
          <p className="mb-5 text-zinc-400">
            {crew.data?.crew.length ?? 0} crew members. A solo producer can skip
            this step.
          </p>
          <CommandButton asChild>
            <Link to={`${base}/crew`}>Invite crew</Link>
          </CommandButton>
        </>
      )}
      {step === 5 && <TalentRoster showId={showId} embedded />}
      {step === 6 && (
        <>
          <p className="mb-5 text-zinc-400">
            {sponsors.data?.length ?? 0} sponsors configured. Add placements for
            sponsor graphics and proof reports.
          </p>
          <CommandButton asChild>
            <Link to={`${base}/sponsors`}>Manage sponsors</Link>
          </CommandButton>
        </>
      )}
      {step === 7 && <RundownPreparation show={show} prepared={prepared} />}
      {step === 8 && (
        <>
          <AirConfigurationPreview showId={showId} />
          <p className="mb-5 text-zinc-400">
            Send matches, talent, sponsor metadata and rundown to paired Air
            nodes. On desktop, confirm the loaded show, match code, OBS
            connection and browser sources before taking a scene.
          </p>
          {show.lastSyncedAt && (
            <p className="mb-4 text-sm text-zinc-500">
              Last sent: {new Date(show.lastSyncedAt).toLocaleString()}
            </p>
          )}
          <CommandButton
            disabled={
              push.isPending || ["ended", "cancelled"].includes(show.status)
            }
            onClick={() => void push.mutateAsync().catch(() => undefined)}
          >
            {push.isPending ? "Sending…" : "Send configuration"}
          </CommandButton>
          {push.isSuccess && (
            <InlineNotice tone="success">
              Configuration sent. Verify receipt and readiness in the desktop
              app.
            </InlineNotice>
          )}
          {push.isError && (
            <InlineNotice tone="critical">
              {getApiErrorMessage(push.error, "Could not send configuration.")}
            </InlineNotice>
          )}
        </>
      )}
    </>
  );
}
