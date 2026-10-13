import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { TournamentBroadcastShows } from "./TournamentBroadcastShows";
import {
  CommandHeader,
  CommandSection,
  CommandButton,
} from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { PairNodeDialog } from "@/components/broadcast/PairNodeDialog";
import {
  useTournamentBroadcast,
  useCreateTournamentBroadcastShow,
} from "@/hooks/useTournamentBroadcast";
import { getApiErrorMessage } from "@/lib/apiClient";

export function BroadcastPanel({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const workspace = useTournamentBroadcast(tournamentId),
    create = useCreateTournamentBroadcastShow(tournamentId),
    navigate = useNavigate();
  const [title, setTitle] = useState(
      `${tournamentName.slice(0, 180)} · Broadcast`,
    ),
    [orgId, setOrgId] = useState(""),
    [pairing, setPairing] = useState(false);
  const data = workspace.data,
    needsOrganization = data?.access === "organization_required";
  const canCreate =
    !!data && (data.canManage || (needsOrganization && !!orgId));
  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await create.mutateAsync({
        title,
        ...(needsOrganization ? { orgId } : {}),
      });
      navigate(`/broadcast/get-started?showId=${result.showId}`);
    } catch {
      /* Preserve input and show the mutation error. */
    }
  }
  return (
    <>
      <CommandHeader
        eyebrow="TOURNAMENT OPS · ESPORTRA AIR"
        title="Broadcast this tournament."
        description="Build a show from this tournament's bracket matches. Pair the production desk, prepare the rundown and send the plan to Air."
        actions={
          data?.canManage && (
            <CommandButton variant="ghost" onClick={() => setPairing(true)}>
              Pair production desk
            </CommandButton>
          )
        }
      />
      {workspace.isLoading && (
        <p role="status" className="text-zinc-400">
          Loading tournament broadcast workspace…
        </p>
      )}
      {workspace.isError && (
        <InlineNotice tone="critical">
          Could not open this tournament's broadcast workspace. Organization
          broadcast access is required.{" "}
          <button onClick={() => void workspace.refetch()}>Retry</button>
        </InlineNotice>
      )}
      {data?.access === "organization_owner_required" && (
        <InlineNotice tone="warning">
          Broadcast administration belongs to the organization owner. Ask the
          owner to prepare this tournament's show or invite you as broadcast
          crew. Tournament staff permissions do not grant organization-wide node
          control.
        </InlineNotice>
      )}
      {needsOrganization && (
        <InlineNotice tone="warning">
          This tournament is not linked to an organization. Choose one you own
          below. Creating its first show also links the tournament to that
          organization.
        </InlineNotice>
      )}
      {data && data.access !== "organization_owner_required" && (
        <CommandSection>
          <h2 className="text-xl font-bold text-white">
            Create a tournament show
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Tournament identity and organization are checked by the server.
            Choose the matches and match codes in guided setup.
          </p>
          <form
            className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => void submit(event)}
          >
            <label className="text-sm text-zinc-300">
              Show title
              <input
                value={title}
                maxLength={200}
                disabled={create.isPending}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 h-11 w-full border border-white/20 bg-zinc-950 px-3 text-white"
              />
            </label>
            {needsOrganization && (
              <label className="text-sm text-zinc-300 md:col-span-2">
                Organization you own
                <select
                  value={orgId}
                  disabled={create.isPending}
                  onChange={(event) => setOrgId(event.target.value)}
                  className="mt-2 h-11 w-full border border-white/20 bg-zinc-950 px-3 text-white"
                >
                  <option value="">Choose organization</option>
                  {data.organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <CommandButton
              type="submit"
              className="self-end"
              disabled={!canCreate || !title.trim() || create.isPending}
            >
              {create.isPending
                ? "Creating…"
                : needsOrganization
                  ? "Link organization & create show"
                  : "Create show & prepare"}
            </CommandButton>
          </form>
          {needsOrganization && data.organizations.length === 0 && (
            <p className="mt-4 text-sm text-zinc-400">
              Create an organization in your organizer workspace, then{" "}
              <button
                className="underline"
                onClick={() => void workspace.refetch()}
              >
                refresh this panel
              </button>
              .
            </p>
          )}
          {create.isError && (
            <InlineNotice tone="critical">
              {getApiErrorMessage(
                create.error,
                "Could not create the tournament show.",
              )}
            </InlineNotice>
          )}
        </CommandSection>
      )}
      {data?.canManage && <TournamentBroadcastShows shows={data.shows} />}
      {data && (
        <p className="text-sm text-zinc-500">
          Tournament teams, logos, best-of, series scores and map veto travel
          with the sent configuration. Tournament edits require sending an
          updated plan; Air defers applying it while production is active.
          Game-event capture currently supports Valorant. OBS switching stays on
          the production PC.
        </p>
      )}
      {data?.canManage && data.tournament.organizationId && (
        <PairNodeDialog
          orgId={data.tournament.organizationId}
          open={pairing}
          onOpenChange={setPairing}
        />
      )}
    </>
  );
}
