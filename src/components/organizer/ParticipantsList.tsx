import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Search, Users, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { sendEmail } from "@/hooks/useEmail";
import { fetchMeRoles, getOrganizationId } from "@/lib/meRoles";
import { Input } from "@/components/ui/input";
import { CommandButton, CommandEmptyState, CommandPanel, CommandToolbar } from "@/components/management/CommandSurface";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  username: string;
  captainName: string;
  tournament: string;
  registeredAt: string;
  status: string;
  isTeamFormat: boolean;
  tournamentSlug?: string;
  email?: string;
}

const normalizeRows = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const getCurrentOrganization = async () => {
  const roles = await fetchMeRoles().catch(() => null);
  const roleOrgId = getOrganizationId(roles);
  const mine = await apiClient.get<any>("/api/organizations/mine").catch(() => null);
  if (mine?.id) return mine;
  const me = await apiClient.get<any>("/api/organizations/me").catch(() => null);
  if (me?.id) return me;
  if (roleOrgId) return { id: roleOrgId };
  return null;
};

const statusClass = (status: string) => {
  switch (status) {
    case "confirmed":
    case "approved":
      return "border-emerald-500/40 text-emerald-300";
    case "pending":
      return "border-amber-500/40 text-amber-300";
    case "cancelled":
    case "rejected":
      return "border-red-500/40 text-red-300";
    default:
      return "border-white/15 text-zinc-300";
  }
};

const ParticipantsList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchParticipants = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const org = await getCurrentOrganization();
        if (!org?.id) {
          if (mounted) setParticipants([]);
          return;
        }

        const tournaments = normalizeRows(await apiClient.get<any>(`/api/organizations/${org.id}/tournaments`));
        const tournamentMap = Object.fromEntries(tournaments.map((t: any) => [t.id, t.name]));
        const tournamentSlugMap = Object.fromEntries(tournaments.map((t: any) => [t.id, t.slug]));
        const tournamentFormatMap = Object.fromEntries(tournaments.map((t: any) => [t.id, (t.team_size || 1) > 1]));
        const allRegistrations: any[] = [];

        for (const tournament of tournaments) {
          const registrations = normalizeRows(await apiClient.get<any>(`/api/tournaments/${tournament.id}/participants`).catch(() => []));
          allRegistrations.push(...registrations);
        }

        const teamIds = [...new Set(allRegistrations.map((r) => r.team_id).filter(Boolean))];
        const userIds = [...new Set(allRegistrations.map((r) => r.user_id).filter(Boolean))];
        let teamsMap: Record<string, any> = {};
        let profilesMap: Record<string, any> = {};

        if (teamIds.length > 0) {
          const teams = normalizeRows(await apiClient.get<any>(`/api/teams?ids=${teamIds.join(",")}`).catch(() => []));
          const ownerIds = [...new Set(teams.map((t: any) => t.owner_id).filter(Boolean))];
          const ownerProfiles = ownerIds.length > 0
            ? normalizeRows(await apiClient.get<any>(`/api/profiles/search?ids=${ownerIds.join(",")}`).catch(() => []))
            : [];
          const ownerMap = Object.fromEntries(ownerProfiles.map((p: any) => [p.id, p]));
          teamsMap = Object.fromEntries(teams.map((t: any) => [t.id, { ...t, owner: ownerMap[t.owner_id] || {} }]));
        }

        if (userIds.length > 0) {
          const profiles = normalizeRows(await apiClient.get<any>(`/api/profiles/search?ids=${userIds.join(",")}`).catch(() => []));
          profilesMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
        }

        const mapped = allRegistrations.map((reg: any) => {
          const team = teamsMap[reg.team_id] || {};
          const profile = profilesMap[reg.user_id] || {};
          const isTeamReg = !!reg.team_id;

          return {
            id: reg.id,
            username: isTeamReg ? team.name || reg.team_name || "Unknown Team" : profile.username || profile.full_name || "Unknown",
            captainName: isTeamReg ? team.owner?.username || team.owner?.full_name || "Unknown Captain" : profile.username || profile.full_name || "Unknown",
            email: isTeamReg ? team.owner?.email || "" : profile.email || "",
            tournament: tournamentMap[reg.tournament_id] || "Unknown",
            registeredAt: reg.created_at,
            status: reg.status === "approved" ? "confirmed" : reg.status || "pending",
            isTeamFormat: tournamentFormatMap[reg.tournament_id] || false,
            tournamentSlug: tournamentSlugMap[reg.tournament_id],
          };
        });

        if (mounted) setParticipants(mapped);
      } catch (err) {
        console.error("[ParticipantsList] Error:", err);
        if (mounted) setParticipants([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchParticipants();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredParticipants = useMemo(
    () =>
      participants.filter((participant) =>
        [participant.username, participant.captainName, participant.tournament].some((value) =>
          value.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
      ),
    [participants, searchTerm],
  );

  const handleSendReminder = async (participant: Participant) => {
    if (!participant.email) {
      toast({ title: "No email found", description: "Cannot send reminder to this participant.", variant: "destructive" });
      return;
    }

    try {
      const { success, error } = await sendEmail({
        type: "CheckinReminder",
        email: participant.email,
        data: {
          tournamentName: participant.tournament,
          username: participant.username,
          tournamentUrl: `${window.location.origin}/tournaments/${participant.tournamentSlug || ""}`,
        },
      });

      if (!success) throw new Error(error);
      toast({ title: "Reminder sent", description: `Email sent to ${participant.username}.` });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message || "Error sending email reminder.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <CommandToolbar>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">Registrations</p>
          <h2 className="mt-1 text-xl font-black uppercase text-white">Participant Control</h2>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            className="h-11 rounded-none border-white/10 bg-black/40 pl-10 text-white placeholder:text-zinc-600 focus:border-rose-500"
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </CommandToolbar>

      <CommandPanel className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
            Loading participants
          </div>
        ) : filteredParticipants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-white/10 bg-white/[0.025] text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-3">{participants.some((p) => p.isTeamFormat) ? "Team" : "Player"}</th>
                  <th className="px-4 py-3">Captain</th>
                  <th className="px-4 py-3">Tournament</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.025]">
                    <td className="px-4 py-4 font-semibold text-white">{participant.username}</td>
                    <td className="px-4 py-4 text-zinc-400">{participant.captainName}</td>
                    <td className="px-4 py-4 text-zinc-400">{participant.tournament}</td>
                    <td className="px-4 py-4 text-zinc-500">{new Date(participant.registeredAt).toLocaleDateString()}</td>
                    <td className="px-4 py-4">
                      <span className={cn("border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider", statusClass(participant.status))}>
                        {participant.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <CommandButton size="sm" variant="ghost" onClick={() => handleSendReminder(participant)} aria-label={`Send reminder to ${participant.username}`}>
                          <Mail className="h-4 w-4" />
                        </CommandButton>
                        <CommandButton size="sm" variant="danger" aria-label={`Remove ${participant.username}`}>
                          <X className="h-4 w-4" />
                        </CommandButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <CommandEmptyState
            title={participants.length === 0 ? "No participants yet" : "No participants found"}
            description={participants.length === 0 ? "Registrations across your hosted tournaments will appear here." : "Adjust your search to find a participant, captain, or tournament."}
            icon={<Users className="h-5 w-5" />}
          />
        )}
      </CommandPanel>
    </div>
  );
};

export default ParticipantsList;
