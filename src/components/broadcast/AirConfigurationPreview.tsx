import { useBroadcastConfiguration } from "@/hooks/useBroadcastConfiguration";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";

export function AirConfigurationPreview({ showId }: { showId: string }) {
  const configuration = useBroadcastConfiguration(showId);
  return (
    <div className="mb-6 border border-white/10 p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h3 className="font-semibold text-white">Current plan for Air</h3>
        <CommandButton
          variant="ghost"
          size="sm"
          disabled={configuration.isFetching}
          onClick={() => void configuration.refetch()}
        >
          Refresh plan
        </CommandButton>
      </div>
      {configuration.isLoading && (
        <p role="status" className="mt-3 text-zinc-400">
          Loading tournament data…
        </p>
      )}
      {configuration.isError && (
        <InlineNotice tone="critical">
          Could not preview the server configuration. Refresh before sending.
        </InlineNotice>
      )}
      {configuration.data && (
        <>
          <p className="mt-3 text-sm text-zinc-400">
            {configuration.data.eventLabel || configuration.data.title} ·{" "}
            {configuration.data.game || "Game not linked"} ·{" "}
            {configuration.data.rundown?.length ?? 0} rundown segments
          </p>
          {configuration.data.matches.map((match) => (
            <div
              key={match.matchId}
              className="mt-3 border-t border-white/10 pt-3"
            >
              <p className="text-sm text-white">
                <span className="font-mono">{match.matchCode}</span> ·{" "}
                {match.teams?.map((team) => team.name).join(" vs ") ||
                  "Teams not resolved"}{" "}
                · Best of {match.bestOf}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {match.veto?.length
                  ? match.veto
                      .map((step) => `${step.action}: ${step.map}`)
                      .join(" · ")
                  : "No recorded veto yet"}
              </p>
            </div>
          ))}
          {configuration.data.matches.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500">
              No bracket matches assigned. Air can load the holding plan; assign
              a match before expecting tournament graphics.
            </p>
          )}
          <p className="mt-4 text-xs text-zinc-500">
            Sending rebuilds the latest tournament plan. This preview is
            preparation data; receipt and on-air readiness are checked on
            desktop.
          </p>
        </>
      )}
    </div>
  );
}
