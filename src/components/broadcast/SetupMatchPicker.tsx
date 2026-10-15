import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAvailableBroadcastMatches,
  type AvailableBroadcastMatch,
} from "@/hooks/useBroadcastMatchPlanning";
import { useAddMatchSlot } from "@/hooks/useBroadcastShow";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import {
  isBroadcastEligible,
  matchTime,
} from "@/services/broadcast/broadcastSetup";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { BroadcastShowDetail } from "@/types/broadcast";
import { FollowBracketSettings } from './FollowBracketSettings';
export function SetupMatchPicker({
  show,
  selectedId,
  onSelect,
  onSettings,
}: {
  show: BroadcastShowDetail;
  selectedId: string;
  onSelect: (id: string) => void;
  onSettings: () => void;
}) {
  const available = useAvailableBroadcastMatches(show.id),
    add = useAddMatchSlot(show.id),
    client = useQueryClient();
  const [search, setSearch] = useState("");
  const locked = ["live", "ended", "cancelled"].includes(show.status);
  const slots = show.matchSlots.filter((slot) =>
    isBroadcastEligible(slot.matchStatus ?? slot.status),
  );
  const choices =
    available.data?.filter(
      (match) =>
        isBroadcastEligible(match.status) &&
        `${match.teamA} ${match.teamB}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];
  async function choose(match: AvailableBroadcastMatch) {
    try {
      await add.mutateAsync({
        matchId: match.id,
        matchCode: `M_${match.id.replace(/-/g, "").slice(0, 16).toUpperCase()}`,
        displayOrder: show.matchSlots.length,
      });
      onSelect(match.id);
      void client.invalidateQueries({
        queryKey: ["broadcast-available-matches", show.id],
      });
    } catch {
      /* Keep the picker and display the mutation failure. */
    }
  }
  return (
    <section className="setup-match-picker" aria-label="Eligible matches">
      <p className="setup-hint">
        Choose an unplayed match from your tournament. Teams and match details
        are already filled in.
      </p>
      {!show.tournamentId && (
        <InlineNotice tone="warning">
          This show has no linked tournament.{" "}
          <CommandButton variant="ghost" onClick={onSettings}>
            Link existing tournament
          </CommandButton>
        </InlineNotice>
      )}
      <label className="setup-field">
        Find teams
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search team names"
        />
      </label>
      {show.tournamentId && <FollowBracketSettings key={show.id} showId={show.id} locked={locked} />}
      {slots
        .filter((slot) =>
          `${slot.teamA} ${slot.teamB} ${slot.matchTitle}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .map((slot) => (
          <button
            className={`setup-match-row ${selectedId === slot.matchId ? "is-selected" : ""}`}
            key={slot.id}
            aria-pressed={selectedId === slot.matchId}
            onClick={() => onSelect(slot.matchId)}
          >
            <span>
              <strong>
                {slot.matchTitle || `${slot.teamA} vs ${slot.teamB}`}
              </strong>
              <small>
                {show.tournamentName} · {matchTime(slot.scheduledAt)}
              </small>
            </span>
            <span>
              {selectedId === slot.matchId
                ? "Selected"
                : (slot.matchStatus ?? slot.status)?.replace(/_/g, " ")}
            </span>
          </button>
        ))}
      {choices.map((match) => (
        <button
          className="setup-match-row"
          key={match.id}
          disabled={add.isPending || locked}
          onClick={() => void choose(match)}
        >
          <span>
            <strong>
              {match.teamA} vs {match.teamB}
            </strong>
            <small>
              {match.tournamentName || show.tournamentName} ·{" "}
              {matchTime(match.scheduledAt)}
            </small>
          </span>
          <span>
            {add.isPending && add.variables?.matchId === match.id
              ? "Selecting…"
              : match.status.replace(/_/g, " ")}
          </span>
        </button>
      ))}
      {available.isLoading && <p role="status">Loading eligible matches…</p>}
      {(available.isError || add.isError) && (
        <InlineNotice tone="critical">
          {getApiErrorMessage(
            add.error || available.error,
            "Could not load or select this match.",
          )}{" "}
          <CommandButton
            variant="ghost"
            onClick={() => void available.refetch()}
          >
            Retry matches
          </CommandButton>
        </InlineNotice>
      )}
      {!available.isLoading &&
        !available.isError &&
        !choices.length &&
        !slots.length && (
          <p className="setup-empty">
            {search
              ? "No teams match your search."
              : "No eligible matches. Publish the bracket and confirm both teams. Played, cancelled and unresolved matches are hidden."}
          </p>
        )}
    </section>
  );
}
