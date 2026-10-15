import { Link } from "react-router-dom";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { BroadcastShowDetail, ShowMatchSlot } from "@/types/broadcast";
import type { useShowPreparation } from "@/hooks/useShowPreparation";
export function SetupReview({
  show,
  match,
  prepared,
}: {
  show: BroadcastShowDetail;
  match?: ShowMatchSlot;
  prepared: ReturnType<typeof useShowPreparation>;
}) {
  const { segments, sponsors, talent, crew, nodes, push, online } = prepared;
  const screens =
    segments.data?.filter(
      (segment) => !segment.matchId || segment.matchId === match?.matchId,
    ) ?? [];
  const queries = [segments, sponsors, talent, crew, nodes];
  const loading = queries.some((query) => query.isLoading),
    failed = queries.some((query) => query.isError);
  const missing = [
    !match && "Choose an eligible match.",
    !screens.length && "Add at least one broadcast screen.",
    online === 0 && "Connect a desktop to receive the setup.",
    failed && "Reload the setup details before sending.",
  ].filter(Boolean);
  return (
    <section className="setup-review" aria-label="Broadcast setup review">
      <p className="setup-hint">
        Confirm this match and broadcast screens. Air receives the saved configuration;
        local OBS and game-feed checks happen on the production desk.
      </p>
      {loading && <p role="status">Loading setup details…</p>}
      <dl>
        <div>
          <dt>Match</dt>
          <dd>
            {match?.matchTitle ||
              (match ? `${match.teamA} vs ${match.teamB}` : "Not selected")}
          </dd>
        </div>
        <div>
          <dt>Screens · take order</dt>
          <dd>
            {screens.length ? (
              <ol>
                {screens.map((screen) => (
                  <li key={screen.id}>{screen.title}</li>
                ))}
              </ol>
            ) : (
              "None selected"
            )}
          </dd>
        </div>
        <div>
          <dt>Sponsors · optional</dt>
          <dd>
            {sponsors.data
              ?.filter((sponsor) => sponsor.isActive)
              .map(
                (sponsor) =>
                  `${sponsor.name}${!sponsor.logoUrl ? " (logo missing)" : ""}`,
              )
              .join(", ") || "No active sponsors"}
          </dd>
        </div>
        <div>
          <dt>Talent</dt>
          <dd>
            {talent.data
              ?.map(
                (person) =>
                  `${person.name} · ${person.role === "caster" ? "Commentator" : person.role}`,
              )
              .join(", ") || "No talent assigned"}
          </dd>
        </div>
        <div>
          <dt>Crew</dt>
          <dd>
            {crew.data?.crew
              .map(
                (person) =>
                  `${person.displayName} · ${person.role.replace(/_/g, " ")}`,
              )
              .join(", ") || "Solo production"}
            {!!crew.data?.pendingInvites.length && (
              <small>
                {crew.data.pendingInvites.length} invitation(s) awaiting
                acceptance
              </small>
            )}
          </dd>
        </div>
      </dl>
      {missing.length > 0 && (
        <InlineNotice tone="warning">
          <ul>
            {missing.map((item) => (
              <li key={String(item)}>{item}</li>
            ))}
          </ul>
        </InlineNotice>
      )}
      {failed && (
        <CommandButton
          variant="ghost"
          onClick={() => queries.forEach((query) => void query.refetch())}
        >
          Retry setup details
        </CommandButton>
      )}
      <CommandButton
        disabled={
          loading ||
          !!missing.length ||
          push.isPending ||
          ["ended", "cancelled"].includes(show.status)
        }
        onClick={() =>
          void push.mutateAsync(match?.matchId).catch(() => undefined)
        }
      >
        {push.isPending ? "Sending setup…" : "Send match to Air"}
      </CommandButton>
      {push.isSuccess && (
        <InlineNotice tone="success">
          Match setup sent. Open Air, choose Customize broadcast, preview your
          screens, then select Send to OBS. Air creates the scenes and browser
          sources for you. Start streaming in OBS when ready.
        </InlineNotice>
      )}
      {push.isError && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(
            push.error,
            "Could not send setup. Check the desktop connection and retry.",
          )}
        </InlineNotice>
      )}
      <CommandButton asChild variant="ghost">
        <Link to={`/broadcast/shows/${show.id}`}>Open full show plan</Link>
      </CommandButton>
    </section>
  );
}
