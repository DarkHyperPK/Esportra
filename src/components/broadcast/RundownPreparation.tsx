import { Link } from "react-router-dom";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { BroadcastShowDetail } from "@/types/broadcast";
import type { useShowPreparation } from "@/hooks/useShowPreparation";

export function RundownPreparation({
  show,
  prepared,
}: {
  show: BroadcastShowDetail;
  prepared: ReturnType<typeof useShowPreparation>;
}) {
  const { segments, add, segmentTitle, setSegmentTitle } = prepared;
  const base = `/broadcast/shows/${show.id}`;
  return (
    <>
      <p className="mb-5 text-zinc-400">
        {segments.data?.length ?? 0} screens. Start with an opening screen; edit
        durations, order and notes in the broadcast screens.
      </p>
      {segments.isError && (
        <InlineNotice tone="critical">
          Could not load broadcast screens.{" "}
          <button onClick={() => void segments.refetch()}>Retry</button>
        </InlineNotice>
      )}
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void add
            .mutateAsync({
              title: segmentTitle.trim(),
              type: "pre_show",
              displayOrder: segments.data?.length ?? 0,
            })
            .then(() => setSegmentTitle(""))
            .catch(() => undefined);
        }}
      >
        <label className="sr-only" htmlFor="preparation-segment">
          Screen name
        </label>
        <input
          id="preparation-segment"
          className="h-11 min-w-48 flex-1 border border-white/20 bg-zinc-950 px-3 text-white"
          placeholder="Opening / holding"
          maxLength={200}
          value={segmentTitle}
          onChange={(event) => setSegmentTitle(event.target.value)}
        />
        <CommandButton
          type="submit"
          disabled={
            !segmentTitle.trim() ||
            add.isPending ||
            ["live", "ended", "cancelled"].includes(show.status)
          }
        >
          Add screen
        </CommandButton>
      </form>
      {add.isError && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(add.error, "Could not add screen.")}
        </InlineNotice>
      )}
      <CommandButton className="mt-4" variant="ghost" asChild>
        <Link to={base}>Edit broadcast screens</Link>
      </CommandButton>
    </>
  );
}
