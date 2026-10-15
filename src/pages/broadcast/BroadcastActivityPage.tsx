import { useParams } from "react-router-dom";
import {
  CommandShell,
  CommandPageGrid,
  CommandHeader,
  CommandSection,
  CommandButton,
  CommandShowHeader,
} from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useBroadcastActivity } from "@/hooks/useBroadcastActivity";
import { useBroadcastShow } from "@/hooks/useBroadcastShow";
import { ProductionHistory } from "@/components/broadcast/ProductionHistory";

export default function BroadcastActivityPage() {
  const { showId = "" } = useParams<{ showId: string }>();
  const show = useBroadcastShow(showId),
    activity = useBroadcastActivity(showId);
  const items = activity.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <CommandShell>
      <CommandShowHeader
        showTitle={show.data?.title || "Show"}
        showStatus={show.data?.status ?? "draft"}
        backHref={`/broadcast/shows/${showId}`}
        backLabel="Back to show"
      />
      <CommandPageGrid>
        <CommandHeader
          eyebrow="ESPORTRA AIR · RECORDS"
          title="Recorded activity"
          description="Acknowledged platform records, newest first. Offline records may arrive later. Verify current OBS and broadcast screen state on desktop."
          actions={
            <CommandButton
              variant="ghost"
              disabled={activity.isFetching}
              onClick={() => void activity.refetch()}
            >
              Refresh records
            </CommandButton>
          }
        />
        <ProductionHistory showId={showId} />
        {activity.isLoading && (
          <p role="status" className="text-zinc-400">
            Loading recorded activity…
          </p>
        )}
        {activity.isError && (
          <InlineNotice tone="critical">
            Could not load records.{" "}
            <button onClick={() => void activity.refetch()}>Retry</button>
          </InlineNotice>
        )}
        {!activity.isLoading && !activity.isError && items.length === 0 && (
          <CommandSection>
            <h2 className="text-xl font-bold text-white">
              No recorded activity yet
            </h2>
            <p className="mt-3 text-zinc-400">
              Contracted production events appear here after a node delivers
              them. Pairing and a platform live status alone do not generate a
              scene record.
            </p>
          </CommandSection>
        )}
        {items.length > 0 && (
          <CommandSection>
            <ol className="divide-y divide-white/10">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-2 py-5 md:grid-cols-[210px_minmax(0,1fr)_240px]"
                >
                  <time
                    dateTime={item.createdAt}
                    className="font-mono text-xs text-zinc-500"
                  >
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                  <span className="text-white">
                    {item.eventType.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </span>
                  <span className="text-sm text-zinc-400">
                    {item.nodeName || "Platform"} · {item.source}
                  </span>
                </li>
              ))}
            </ol>
          </CommandSection>
        )}
        {activity.hasNextPage && (
          <CommandButton
            variant="ghost"
            className="w-fit"
            disabled={activity.isFetchingNextPage}
            onClick={() => void activity.fetchNextPage()}
          >
            {activity.isFetchingNextPage ? "Loading…" : "Load older records"}
          </CommandButton>
        )}
      </CommandPageGrid>
    </CommandShell>
  );
}
