import { Link } from "react-router-dom";
import {
  CommandSection,
  CommandButton,
} from "@/components/management/CommandSurface";
import type { TournamentBroadcastWorkspace } from "@/hooks/useTournamentBroadcast";

export function TournamentBroadcastShows({
  shows,
}: {
  shows: TournamentBroadcastWorkspace["shows"];
}) {
  return (
    <CommandSection>
      <h2 className="text-xl font-bold text-white">
        Shows for this tournament
      </h2>
      {shows.length === 0 && (
        <p className="mt-4 text-zinc-400">
          No broadcast shows yet. Create one above to start preparation.
        </p>
      )}
      {shows.map((show) => (
        <div
          key={show.id}
          className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-5"
        >
          <div>
            <h3 className="font-semibold text-white">{show.title}</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {show.status} · {show.matchCount} assigned matches
              {show.scheduledAt
                ? ` · ${new Date(show.scheduledAt).toLocaleString()}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CommandButton asChild variant="ghost" size="sm">
              <Link to={`/broadcast/shows/${show.id}/setup`}>Prepare broadcast</Link>
            </CommandButton>
            <CommandButton asChild variant="ghost" size="sm">
              <Link to={`/broadcast/shows/${show.id}`}>Show flow</Link>
            </CommandButton>
            <CommandButton asChild variant="ghost" size="sm">
              <Link to={`/broadcast/shows/${show.id}/activity`}>
                Recorded activity
              </Link>
            </CommandButton>
          </div>
        </div>
      ))}
    </CommandSection>
  );
}
