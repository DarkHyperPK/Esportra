import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CommandShell,
  CommandPageGrid,
  CommandHeader,
  CommandSection,
  CommandButton,
} from "@/components/management/CommandSurface";
import { BroadcastNavigation } from "@/components/broadcast/BroadcastNavigation";
import { PairNodeDialog } from "@/components/broadcast/PairNodeDialog";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useBroadcastHome } from "@/hooks/useBroadcastPlanning";
import { useMyOrganizationId } from "@/hooks/useMyOrganizationId";
import { useNow } from "@/hooks/useNow";

export default function BroadcastHomePage() {
  const orgId = useMyOrganizationId(),
    home = useBroadcastHome(orgId),
    now = useNow(5000);
  const [pairing, setPairing] = useState(false);
  const online =
    home.data?.nodes.filter(
      (node) => node.lastSeenAt && now - Date.parse(node.lastSeenAt) < 30000,
    ).length ?? 0;
  return (
    <CommandShell>
      <CommandPageGrid>
        <BroadcastNavigation />
        <CommandHeader
          eyebrow="ESPORTRA AIR · WORKSPACE"
          title="Your next broadcast."
          description="Prepare shows here. Run capture, OBS and live production in the desktop app."
          actions={
            <CommandButton asChild>
              <Link to="/broadcast/shows">Create a show</Link>
            </CommandButton>
          }
        />
        {!orgId && (
          <InlineNotice tone="warning">
            Choose an organizer organization to manage broadcasts.
          </InlineNotice>
        )}
        {home.isLoading && (
          <p role="status" className="text-zinc-400">
            Loading your broadcast workspace…
          </p>
        )}
        {home.isError && (
          <InlineNotice tone="critical">
            Could not load the workspace.{" "}
            <button onClick={() => void home.refetch()}>Retry</button>
          </InlineNotice>
        )}
        {home.data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ["Shows", home.data.shows.length],
                [
                  "Live shows",
                  home.data.shows.filter((show) => show.status === "live")
                    .length,
                ],
                ["Nodes online", online],
                ["Crew members", home.data.crewCount],
              ].map(([label, value]) => (
                <div key={label} className="border border-white/10 p-5">
                  <p className="text-sm text-zinc-400">{label}</p>
                  <p className="mt-4 text-4xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>
            <CommandSection>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-white">Shows</h2>
                <CommandButton asChild variant="ghost">
                  <Link to="/broadcast/get-started">Guided setup</Link>
                </CommandButton>
              </div>
              {home.data.shows.length === 0 ? (
                <p className="text-zinc-400">
                  Create a show to start planning matches and your broadcast screens.
                </p>
              ) : (
                home.data.shows.map((show) => (
                  <Link
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-5 focus-visible:outline-white"
                    key={show.id}
                    to={`/broadcast/shows/${show.id}`}
                  >
                    <div>
                      <p className="font-semibold text-white">{show.title}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {show.tournamentName || "Tournament not linked"}
                      </p>
                    </div>
                    <span
                      className={
                        show.status === "live"
                          ? "text-emerald-400"
                          : "text-zinc-400"
                      }
                    >
                      {show.status}
                    </span>
                  </Link>
                ))
              )}
            </CommandSection>
          </>
        )}
        <CommandSection>
          <h2 className="text-xl font-bold text-white">
            Connect the production desk
          </h2>
          <p className="mt-2 mb-5 text-sm text-zinc-400">
            Generate a pairing code, open Esportra Air on the production
            computer, and enter the code. Observer computers can use
            capture-only mode.
          </p>
          <CommandButton
            variant="ghost"
            disabled={!orgId}
            onClick={() => setPairing(true)}
          >
            Pair desktop node
          </CommandButton>
        </CommandSection>
        {orgId && (
          <PairNodeDialog
            orgId={orgId}
            open={pairing}
            onOpenChange={setPairing}
          />
        )}
      </CommandPageGrid>
    </CommandShell>
  );
}
