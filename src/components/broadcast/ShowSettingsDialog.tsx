import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import {
  useBroadcastTournaments,
  useUpdateBroadcastShow,
} from "@/hooks/useBroadcastPlanning";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { BroadcastShow } from "@/types/broadcast";
import {
  scheduleToLocalInput,
  scheduleInputToIso,
} from "@/services/broadcast/showSchedule";

export function ShowSettingsDialog({
  show,
  orgId,
  open,
  onOpenChange,
}: {
  show: BroadcastShow;
  orgId: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const [title, setTitle] = useState(show.title),
    [tournamentId, setTournamentId] = useState(show.tournamentId || "");
  const [schedule, setSchedule] = useState(
    scheduleToLocalInput(show.scheduledAt),
  );
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const tournaments = useBroadcastTournaments(open ? orgId : null),
    update = useUpdateBroadcastShow(show.id, orgId);
  const reset = update.reset;
  useEffect(() => {
    if (open) {
      setTitle(show.title);
      setTournamentId(show.tournamentId || "");
      setSchedule(scheduleToLocalInput(show.scheduledAt));
      setScheduleError(null);
      reset();
    }
  }, [open, show.id, show.title, show.tournamentId, show.scheduledAt, reset]);
  async function save() {
    let scheduleChange = {};
    try {
      scheduleChange =
        schedule === scheduleToLocalInput(show.scheduledAt)
          ? {}
          : { scheduledAt: scheduleInputToIso(schedule) };
      setScheduleError(null);
    } catch (error) {
      setScheduleError(
        error instanceof Error
          ? error.message
          : "Choose a valid date and time.",
      );
      return;
    }
    try {
      await update.mutateAsync({
        ...(show.status !== "live" ? { title: title.trim() } : {}),
        tournamentId: tournamentId || null,
        ...scheduleChange,
      });
      onOpenChange(false);
    } catch {
      /* Mutation error remains visible; preserve the draft. */
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Show settings</DialogTitle>
          <DialogDescription>
            Update the title, organization tournament and planned start time.
          </DialogDescription>
        </DialogHeader>
        {show.status === "live" && (
          <InlineNotice tone="warning">
            Title changes are locked while this show is live.
          </InlineNotice>
        )}
        {update.isError && (
          <InlineNotice tone="critical">
            {getApiErrorMessage(update.error, "Could not save show settings.")}
          </InlineNotice>
        )}
        <label className="text-sm text-zinc-300">
          Show title
          <input
            className="mt-2 h-11 w-full border border-white/20 bg-black/30 px-3 text-white focus-visible:outline-white"
            value={title}
            maxLength={200}
            disabled={show.status === "live" || update.isPending}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="text-sm text-zinc-300">
          Planned start
          <input
            type="datetime-local"
            step="1"
            value={schedule}
            className="mt-2 h-11 w-full border border-white/20 bg-zinc-950 px-3 text-white [color-scheme:dark]"
            disabled={
              update.isPending ||
              show.status === "live" ||
              show.status === "ended" ||
              show.status === "cancelled"
            }
            onChange={(event) => setSchedule(event.target.value)}
          />
          <span className="mt-2 block text-xs text-zinc-500">
            Local time: {Intl.DateTimeFormat().resolvedOptions().timeZone}.
            Clear to remove the schedule. This does not start the broadcast.
          </span>
        </label>
        {scheduleError && (
          <InlineNotice tone="critical">{scheduleError}</InlineNotice>
        )}
        <label className="text-sm text-zinc-300">
          Tournament
          <select
            className="mt-2 h-11 w-full border border-white/20 bg-zinc-950 px-3 text-white focus-visible:outline-white"
            value={tournamentId}
            disabled={
              tournaments.isLoading || tournaments.isError || update.isPending
            }
            onChange={(event) => setTournamentId(event.target.value)}
          >
            <option value="">No tournament</option>
            {tournaments.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {tournaments.isError && (
          <InlineNotice tone="critical">
            Could not load organization tournaments.{" "}
            <button onClick={() => void tournaments.refetch()}>Retry</button>
          </InlineNotice>
        )}
        <div className="flex justify-end gap-3">
          <CommandButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </CommandButton>
          <CommandButton
            disabled={!title.trim() || update.isPending || tournaments.isError}
            onClick={save}
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </CommandButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
