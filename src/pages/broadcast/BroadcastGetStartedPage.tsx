import { Link, useSearchParams } from "react-router-dom";
import { BroadcastNavigation } from "@/components/broadcast/BroadcastNavigation";
import { ShowPreparation } from "@/components/broadcast/ShowPreparation";
import {
  CommandShell,
  CommandPageGrid,
  CommandHeader,
  CommandButton,
} from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useBroadcastShows } from "@/hooks/useBroadcastShows";
import { useMyOrganizationId } from "@/hooks/useMyOrganizationId";

export default function BroadcastGetStartedPage() {
  const orgId = useMyOrganizationId(),
    [params, setParams] = useSearchParams(),
    shows = useBroadcastShows(params.get("showId") ? null : orgId);
  const showId = params.get("showId");
  return (
    <CommandShell>
      <CommandPageGrid>
        <BroadcastNavigation />
        {showId ? (
          <ShowPreparation showId={showId} />
        ) : !orgId ? (
          <InlineNotice tone="warning">
            Choose an organizer organization to prepare broadcasts.
          </InlineNotice>
        ) : (
          <>
            <CommandHeader
              eyebrow="ESPORTRA AIR · GET STARTED"
              title="Start with a show."
              description="Choose a production to prepare, or create a new one."
              actions={
                <CommandButton asChild>
                  <Link to="/broadcast/shows">Create show</Link>
                </CommandButton>
              }
            />
            {shows.isLoading && (
              <p role="status" className="text-zinc-400">
                Loading shows…
              </p>
            )}
            {shows.isError && (
              <InlineNotice tone="critical">
                Could not load shows.{" "}
                <button onClick={() => void shows.refetch()}>Retry</button>
              </InlineNotice>
            )}
            {shows.data
              ?.filter(
                (show) =>
                  show.status === "draft" || show.status === "scheduled",
              )
              .map((show) => (
                <button
                  className="flex w-full justify-between gap-4 border border-white/10 p-6 text-left text-white focus-visible:outline-white"
                  key={show.id}
                  onClick={() => setParams({ showId: show.id })}
                >
                  <span>{show.title}</span>
                  <span className="text-zinc-500">Prepare →</span>
                </button>
              ))}
            {shows.data &&
              !shows.data.some(
                (show) =>
                  show.status === "draft" || show.status === "scheduled",
              ) && (
                <p className="text-zinc-400">
                  No draft shows. Create one to begin.
                </p>
              )}
          </>
        )}
      </CommandPageGrid>
    </CommandShell>
  );
}
