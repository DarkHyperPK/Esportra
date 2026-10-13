import { Link, useParams } from "react-router-dom";
import {
  CommandShell,
  CommandPageGrid,
  CommandHeader,
  CommandSection,
  CommandButton,
} from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import {
  useBroadcastCrewAssignments,
  useBroadcastCrewWorkspace,
} from "@/hooks/useBroadcastCrewWorkspace";
import { formatRundownDuration } from "@/services/broadcast/rundownDuration";

const briefs: Record<string, string> = {
  owner:
    "Prepare the show on the web. Confirm local readiness before starting the desktop rundown.",
  producer:
    "Coordinate cues and run the rundown on the production desk. Ask the organizer for a node pairing code.",
  technical_director:
    "Connect OBS on the production desk, prepare sources and verify preview/program before switching.",
  observer:
    "Use capture-only mode on the observer PC. Share its address and observer pairing key with the production desk. Start capture after the privacy notice.",
  replay_operator:
    "Prepare the replay buffer in OBS on the production desk and check the replay scene before using it.",
  monitor:
    "Monitor the broadcast and report issues to your producer. This workspace shows the plan; local live state is checked in Air.",
};
export default function BroadcastCrewWorkspacePage() {
  const { showId } = useParams<{ showId: string }>(),
    assignments = useBroadcastCrewAssignments(),
    workspace = useBroadcastCrewWorkspace(showId);
  return (
    <CommandShell>
      <CommandPageGrid>
        <CommandButton variant="ghost" className="w-fit" asChild>
          <Link to="/broadcast/crew/shows">My crew shows</Link>
        </CommandButton>
        {!showId ? (
          <>
            <CommandHeader
              eyebrow="ESPORTRA AIR · CREW"
              title="Your assigned shows."
            />
            {assignments.isLoading && (
              <p role="status" className="text-zinc-400">
                Loading assignments…
              </p>
            )}
            {assignments.isError && (
              <InlineNotice tone="critical">
                Could not load assignments.{" "}
                <button onClick={() => void assignments.refetch()}>
                  Retry
                </button>
              </InlineNotice>
            )}
            {assignments.data?.length === 0 && (
              <p className="text-zinc-400">
                No active crew assignments. Accept an organizer’s invite to join
                a show.
              </p>
            )}
            {assignments.data?.map((show) => (
              <Link
                key={show.id}
                className="flex flex-wrap justify-between gap-3 border border-white/10 p-6 text-white"
                to={`/broadcast/crew/shows/${show.id}`}
              >
                <strong>{show.title}</strong>
                <span className="text-zinc-400">
                  {show.role.replace(/_/g, " ")} · {show.status}
                </span>
              </Link>
            ))}
          </>
        ) : (
          <>
            {workspace.isLoading && (
              <p role="status" className="text-zinc-400">
                Loading crew workspace…
              </p>
            )}
            {workspace.isError && (
              <InlineNotice tone="critical">
                Could not load this show. Your crew access may have been
                removed.{" "}
                <button onClick={() => void workspace.refetch()}>Retry</button>
              </InlineNotice>
            )}
            {workspace.data && (
              <>
                <CommandHeader
                  eyebrow={`CREW · ${workspace.data.show.role.replace(/_/g, " ")}`}
                  title={workspace.data.show.title}
                  description={`Platform show: ${workspace.data.show.status}. OBS switching and game capture run on desktop.`}
                />
                <CommandSection>
                  <h2 className="text-xl font-semibold text-white">Your job</h2>
                  <p className="mt-3 text-zinc-400">
                    {briefs[workspace.data.show.role] ||
                      "Confirm your assignment with the producer."}
                  </p>
                </CommandSection>
                <CommandSection>
                  <h2 className="text-xl font-semibold text-white">
                    Match codes
                  </h2>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {workspace.data.matches.map((match) => (
                      <span
                        key={match.code}
                        className="border border-white/20 px-4 py-2 font-mono text-white"
                      >
                        {match.code}
                      </span>
                    ))}
                  </div>
                  {workspace.data.matches.length === 0 && (
                    <p className="mt-3 text-zinc-400">
                      Matches have not been assigned yet.
                    </p>
                  )}
                </CommandSection>
                <CommandSection>
                  <h2 className="text-xl font-semibold text-white">
                    Planned rundown
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Desktop live progression is verified on the production desk.
                  </p>
                  {workspace.data.rundown.map((segment, index) => (
                    <div
                      key={segment.id}
                      className="mt-3 flex flex-wrap justify-between gap-3 border-t border-white/10 py-4"
                    >
                      <span className="text-white">
                        {index + 1}. {segment.title}
                      </span>
                      <span className="font-mono text-sm text-zinc-500">
                        {segment.type.replace(/_/g, " ")} ·{" "}
                        {formatRundownDuration(segment.durationSeconds) ||
                          "Untimed"}
                      </span>
                    </div>
                  ))}
                  {workspace.data.rundown.length === 0 && (
                    <p className="mt-4 text-zinc-400">
                      No segments planned yet.
                    </p>
                  )}
                </CommandSection>
              </>
            )}
          </>
        )}
      </CommandPageGrid>
    </CommandShell>
  );
}
