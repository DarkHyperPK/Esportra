import { useEffect, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useAddMatchSlot, useRemoveMatchSlot } from "@/hooks/useBroadcastShow";
import {
  useAvailableBroadcastMatches,
  useUpdateBroadcastMatchCode,
} from "@/hooks/useBroadcastMatchPlanning";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { BroadcastShowDetail, ShowMatchSlot } from "@/types/broadcast";

const field =
  "h-11 border border-white/20 bg-zinc-950 px-3 text-sm text-white focus-visible:outline-white";
function CodeRow({
  slot,
  showId,
  locked,
  index,
}: {
  slot: ShowMatchSlot;
  showId: string;
  locked: boolean;
  index: number;
}) {
  const [code, setCode] = useState(slot.matchCode || "");
  const update = useUpdateBroadcastMatchCode(showId),
    remove = useRemoveMatchSlot(showId),
    client = useQueryClient();
  useEffect(() => setCode(slot.matchCode || ""), [slot.matchCode]);
  async function deleteSlot() {
    try {
      await remove.mutateAsync(slot.matchId);
      void client.invalidateQueries({
        queryKey: ["broadcast-available-matches", showId],
      });
    } catch {
      /* Visible below. */
    }
  }
  return (
    <div className="border-b border-white/10 py-4">
      {(slot.matchTitle || slot.teamA || slot.teamB) && <p className="mb-3 text-sm font-semibold text-white">{slot.matchTitle || `${slot.teamA || 'TBD'} vs ${slot.teamB || 'TBD'}`}{slot.bestOf ? ` · Best of ${slot.bestOf}` : ''}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-28 text-sm text-zinc-400">
          Match {index + 1}
        </span>
        <label className="sr-only" htmlFor={`code-${slot.id}`}>
          Match {index + 1} code
        </label>
        <input
          id={`code-${slot.id}`}
          className={`${field} w-32`}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={20}
          disabled={locked}
        />
        <CommandButton
          size="sm"
          variant="ghost"
          disabled={
            locked ||
            !/^[A-Z0-9_-]{1,20}$/.test(code) ||
            update.isPending ||
            code === slot.matchCode
          }
          onClick={() =>
            void update
              .mutateAsync({ matchId: slot.matchId, matchCode: code })
              .catch(() => undefined)
          }
        >
          Save code
        </CommandButton>
        <CommandButton
          size="sm"
          variant="ghost"
          disabled={locked || remove.isPending}
          onClick={() => void deleteSlot()}
        >
          Remove slot
        </CommandButton>
      </div>
      {(update.isError || remove.isError) && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(
            update.error || remove.error,
            "Could not update match slot.",
          )}
        </InlineNotice>
      )}
    </div>
  );
}
export function MatchSlotPlanner({ show }: { show: BroadcastShowDetail }) {
  const [matchId, setMatchId] = useState(""),
    [code, setCode] = useState("MAIN");
  const matches = useAvailableBroadcastMatches(show.id),
    add = useAddMatchSlot(show.id),
    client = useQueryClient();
  const locked = ["live", "ended", "cancelled"].includes(show.status);
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await add.mutateAsync({
        matchId,
        matchCode: code,
        displayOrder: show.matchSlots.length,
      });
      setMatchId("");
      setCode("");
      void client.invalidateQueries({
        queryKey: ["broadcast-available-matches", show.id],
      });
    } catch {
      /* Keep draft and mutation error. */
    }
  }
  return (
    <section aria-label="Match slots">
      <p className="mb-4 text-sm text-zinc-400">
        Match codes route game data to the correct overlay. Use a distinct code
        for each match.
      </p>
      {show.matchSlots.map((slot, index) => (
        <CodeRow
          key={slot.id}
          slot={slot}
          showId={show.id}
          locked={locked}
          index={index}
        />
      ))}
      {!show.tournamentId ? (
        <InlineNotice tone="warning">
          Link a tournament in show settings to choose bracket matches.
        </InlineNotice>
      ) : (
        !locked && (
          <form
            className="mt-5 flex flex-wrap items-end gap-3"
            onSubmit={submit}
          >
            <label className="flex min-w-52 flex-1 flex-col gap-2 text-sm text-zinc-300">
              Bracket match
              <select
                className={field}
                value={matchId}
                onChange={(event) => setMatchId(event.target.value)}
                disabled={matches.isLoading || matches.isError}
              >
                <option value="">Choose match</option>
                {matches.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.teamA} vs {item.teamB}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-300">
              Match code
              <input
                className={`${field} w-32`}
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={20}
              />
            </label>
            <CommandButton
              type="submit"
              disabled={
                !matchId || !/^[A-Z0-9_-]{1,20}$/.test(code) || add.isPending
              }
            >
              Add match
            </CommandButton>
          </form>
        )
      )}
      {matches.isError && (
        <InlineNotice tone="critical">
          Could not load matches.{" "}
          <button onClick={() => void matches.refetch()}>Retry</button>
        </InlineNotice>
      )}
      {show.tournamentId &&
        !matches.isLoading &&
        !matches.isError &&
        matches.data?.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500">
            No unassigned bracket matches. Publish the tournament bracket, or
            use the slots above.
          </p>
        )}
      {add.isError && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(add.error, "Could not add match.")}
        </InlineNotice>
      )}
    </section>
  );
}
