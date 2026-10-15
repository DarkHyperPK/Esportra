import { useState } from "react";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import {
  useUpdateSegment,
  useRemoveSegment,
  useReorderSegments,
} from "@/hooks/useBroadcastShowSegments";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { ShowSegment } from "@/types/broadcast";
import { screenName } from "@/services/broadcast/screenCatalog";
export function SetupFlowOrder({
  showId,
  matchId,
  segments,
  locked,
}: {
  showId: string;
  matchId: string;
  segments: ShowSegment[];
  locked: boolean;
}) {
  const update = useUpdateSegment(showId),
    remove = useRemoveSegment(showId),
    reorder = useReorderSegments(showId);
  const [removing, setRemoving] = useState("");
  const visible = segments.filter(
    (segment) => !segment.matchId || segment.matchId === matchId,
  );
  const busy = update.isPending || remove.isPending || reorder.isPending;
  async function move(id: string, direction: number) {
    const index = visible.findIndex((segment) => segment.id === id),
      other = visible[index + direction];
    if (!other) return;
    const currentIndex = segments.findIndex((segment) => segment.id === id),
      otherIndex = segments.findIndex((segment) => segment.id === other.id);
    const next = [...segments];
    [next[currentIndex], next[otherIndex]] = [
      next[otherIndex],
      next[currentIndex],
    ];
    try {
      await reorder.mutateAsync(next);
    } catch {
      /* Visible below; retain server order. */
    }
  }
  return (
    <section className="setup-flow" aria-label="Selected screens and broadcast screens">
      <h3>
        Selected screens <span>{visible.length}</span>
      </h3>
      <p className="setup-hint">
        This is your broadcast screens. Rename items and put them in the order you will
        take them live.
      </p>
      {visible.length === 0 && (
        <p className="setup-empty">
          Add a template or an individual screen to start.
        </p>
      )}
      <ol>
        {visible.map((segment, index) => (
          <li key={segment.id} className="setup-flow-row">
            <span className="setup-flow-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="setup-flow-identity">
              <input
                key={segment.title}
                defaultValue={segment.title}
                maxLength={120}
                aria-label={`Rename ${segment.title}`}
                disabled={locked || busy}
                onBlur={(event) => {
                  const title = event.target.value.trim();
                  if (title && title !== segment.title)
                    void update
                      .mutateAsync({ id: segment.id, title })
                      .catch(() => undefined);
                  else event.target.value = segment.title;
                }}
              />
              <small>
                {segment.overlay
                  ? screenName(segment.overlay)
                  : segment.type.replace(/_/g, " ")}
              </small>
            </div>
            <CommandButton
              size="sm"
              variant="ghost"
              disabled={locked || busy || index === 0}
              onClick={() => void move(segment.id, -1)}
              aria-label={`Move ${segment.title} up`}
            >
              ↑
            </CommandButton>
            <CommandButton
              size="sm"
              variant="ghost"
              disabled={locked || busy || index === visible.length - 1}
              onClick={() => void move(segment.id, 1)}
              aria-label={`Move ${segment.title} down`}
            >
              ↓
            </CommandButton>
            <CommandButton
              size="sm"
              variant="ghost"
              disabled={locked || busy}
              onClick={() => setRemoving(segment.id)}
            >
              Remove
            </CommandButton>
            {removing === segment.id && (
              <div className="setup-flow-confirm">
                <span>Remove {segment.title}?</span>
                <CommandButton
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    void remove
                      .mutateAsync(segment.id)
                      .then(() => setRemoving(""))
                      .catch(() => undefined)
                  }
                  disabled={busy}
                >
                  Confirm removal
                </CommandButton>
                <CommandButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setRemoving("")}
                >
                  Cancel
                </CommandButton>
              </div>
            )}
          </li>
        ))}
      </ol>
      {(update.isError || remove.isError || reorder.isError) && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(
            update.error || remove.error || reorder.error,
            "Could not save broadcast screens. Reload the step and retry.",
          )}
        </InlineNotice>
      )}
    </section>
  );
}
