import { BroadcastShell } from '@/components/broadcast/BroadcastShell';
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CommandPageGrid, CommandHeader, CommandSection, CommandButton, CommandEmptyState } from "@/components/management/CommandSurface";
import { InlineNotice } from "@/components/ui/kit/InlineNotice";
import { useBroadcastInvitations, useAcceptBroadcastInvitation } from "@/hooks/useBroadcastInvitations";
import { getApiErrorMessage } from "@/lib/apiClient";

export default function BroadcastInvitationsPage() {
  const invites = useBroadcastInvitations(), accept = useAcceptBroadcastInvitation(), navigate = useNavigate();
  const [error, setError] = useState("");
  async function join(id: string) {
    setError("");
    try { const result = await accept.mutateAsync(id); navigate(`/broadcast/crew/shows/${result.showId}`); }
    catch (failure) { setError(getApiErrorMessage(failure, "This invitation is unavailable. Ask the organizer for a new one.")); }
  }
  return <BroadcastShell><CommandPageGrid>
    <CommandButton variant="ghost" className="w-fit" asChild><Link to="/broadcast/crew/shows">My crew shows</Link></CommandButton>
    <CommandHeader eyebrow="BROADCAST CREW" title="Your invitations" />
    {error && <InlineNotice tone="critical">{error}</InlineNotice>}
    {invites.isError ? <InlineNotice tone="warning">Could not load invitations. <button onClick={() => void invites.refetch()}>Try again</button></InlineNotice> : invites.isLoading ? <p>Loading invitations…</p> : !invites.data?.length ? <CommandEmptyState title="No pending invitations" description="Email invitations sent to your account appear here. Expired and revoked invitations are hidden." /> : invites.data.map(invite => <CommandSection key={invite.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-white">{invite.showTitle}</h2><p className="mt-2 text-sm text-zinc-400">Invited as {invite.role.split("_").join(" ")} · Expires {new Date(invite.expiresAt).toLocaleString()}</p></div><CommandButton variant="primary" disabled={accept.isPending} onClick={() => void join(invite.id)}>{accept.isPending && accept.variables === invite.id ? "Joining…" : "Accept invitation"}</CommandButton></div></CommandSection>)}
  </CommandPageGrid></BroadcastShell>;
}
