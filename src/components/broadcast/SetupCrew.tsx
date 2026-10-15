import { useState } from "react";
import { CommandButton } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import {
  useBroadcastCrew,
  useCreateCrewInvite,
  useRevokeCrewInvite,
  useRemoveCrewMember,
} from "@/hooks/useBroadcastCrew";
import { CrewRolePicker } from "./CrewRolePicker";
import { getApiErrorMessage } from "@/lib/apiClient";
import type { CrewInviteResult } from "@/types/broadcast";
export function SetupCrew({
  showId,
  locked,
}: {
  showId: string;
  locked: boolean;
}) {
  const crew = useBroadcastCrew(showId),
    create = useCreateCrewInvite(showId),
    revoke = useRevokeCrewInvite(showId),
    remove = useRemoveCrewMember(showId);
  const [role, setRole] = useState("producer"),
    [invitation, setInvitation] = useState<CrewInviteResult | null>(null),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [removeId, setRemoveId] = useState("");
  async function invite() {
    setInvitation(null);
    setCopied(false);
    setError("");
    try {
      setInvitation(await create.mutateAsync(role));
      create.reset();
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Could not create invitation."));
    }
  }
  const link = invitation
    ? `${window.location.origin}/broadcast/join#token=${encodeURIComponent(invitation.token)}`
    : "";
  return (
    <section aria-label="Production crew">
      <p className="setup-hint">
        Assign responsibilities with an invitation. For a solo broadcast, you
        can continue without additional crew.
      </p>
      {crew.isLoading && <p role="status">Loading crew…</p>}
      {crew.data?.crew.map((person) => (
        <div className="setup-library-row" key={person.id}>
          <div>
            <strong>{person.displayName}</strong>
            <small>{person.role.replace(/_/g, " ")}</small>
          </div>
          <CommandButton
            size="sm"
            variant="ghost"
            disabled={locked || remove.isPending}
            onClick={() => setRemoveId(person.userId)}
          >
            Remove
          </CommandButton>
          {removeId === person.userId && (
            <>
              <CommandButton
                size="sm"
                variant="danger"
                disabled={remove.isPending}
                onClick={() =>
                  void remove
                    .mutateAsync(person.userId)
                    .then(() => setRemoveId(""))
                    .catch(() => undefined)
                }
              >
                Confirm removal
              </CommandButton>
              <CommandButton
                size="sm"
                variant="ghost"
                onClick={() => setRemoveId("")}
              >
                Cancel
              </CommandButton>
            </>
          )}
        </div>
      ))}
      {crew.data?.pendingInvites.map((item) => (
        <div className="setup-library-row" key={item.id}>
          <div>
            <strong>{item.role.replace(/_/g, " ")}</strong>
            <small>
              Invitation pending · expires{" "}
              {new Date(item.expiresAt).toLocaleString()}
            </small>
          </div>
          <CommandButton
            variant="ghost"
            size="sm"
            disabled={locked || revoke.isPending}
            onClick={() =>
              void revoke.mutateAsync(item.id).catch(() => undefined)
            }
          >
            Revoke
          </CommandButton>
        </div>
      ))}
      <CrewRolePicker
        value={role}
        onChange={setRole}
        disabled={locked || create.isPending}
      />
      <CommandButton
        className="mt-5"
        disabled={locked || create.isPending}
        onClick={() => void invite()}
      >
        {create.isPending ? "Creating invitation…" : "Invite crew member"}
      </CommandButton>
      {invitation && (
        <div className="setup-invitation">
          <p>
            This invite assigns the selected responsibility. It expires{" "}
            {new Date(invitation.expiresAt).toLocaleString()}.
          </p>
          <label className="setup-field">
            Invitation link
            <input
              readOnly
              value={link}
              onFocus={(event) => event.target.select()}
            />
          </label>
          <CommandButton
            variant="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(link)
                .then(() => setCopied(true))
                .catch(() =>
                  setError("Clipboard unavailable. Select and copy the link."),
                )
            }
          >
            {copied ? "Copied" : "Copy invitation"}
          </CommandButton>
          <CommandButton variant="ghost" onClick={() => setInvitation(null)}>
            Hide link
          </CommandButton>
        </div>
      )}
      {(error || crew.isError || revoke.isError || remove.isError) && (
        <InlineNotice tone="critical">
          {error ||
            getApiErrorMessage(
              crew.error || revoke.error || remove.error,
              "Could not update crew.",
            )}{" "}
          {crew.isError && (
            <CommandButton variant="ghost" onClick={() => void crew.refetch()}>
              Retry crew
            </CommandButton>
          )}
        </InlineNotice>
      )}
    </section>
  );
}
