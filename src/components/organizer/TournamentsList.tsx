import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, Clock, Plus, Trophy, Users } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { fetchCurrentOrganizationId } from "@/lib/currentOrganization";
import { CommandButton, CommandEmptyState, CommandPanel, CommandToolbar } from "@/components/management/CommandSurface";
import { cn } from "@/lib/utils";

interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  venue: string;
  max_participants: number | null;
  status: "draft" | "published" | "open" | "closed" | "ongoing" | "completed" | "cancelled";
  current_participants?: number;
  slug?: string | null;
  isRegistered: boolean;
}

const normalizeRows = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const statusStyles: Record<string, string> = {
  draft: "border-white/15 text-zinc-300",
  published: "border-amber-500/40 text-amber-300",
  open: "border-emerald-500/40 text-emerald-300",
  closed: "border-amber-500/40 text-amber-300",
  ongoing: "border-rose-500/50 text-rose-300",
  completed: "border-white/15 text-zinc-400",
  cancelled: "border-red-500/40 text-red-300",
};

const TournamentsList = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    const fetchTournaments = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const organizationId = await fetchCurrentOrganizationId();
        if (!organizationId) {
          if (mounted) setTournaments([]);
          return;
        }

        const raw = await apiClient.get<any>(`/api/organizations/${organizationId}/tournaments`);
        const tournamentsData = normalizeRows(raw);
        const mapped = tournamentsData.map((tournament: any) => {
          const displayStatus = tournament.status || "draft";

          return {
            id: tournament.id,
            name: tournament.name,
            game: tournament.game || "Unknown",
            date: tournament.start_date,
            venue: tournament.venue_id ? "Venue" : "Online",
            max_participants: tournament.max_teams || tournament.max_participants || null,
            status: displayStatus,
            current_participants: tournament.registration_count ?? tournament.current_participants ?? tournament.participant_count ?? 0,
            slug: tournament.slug,
            isRegistered: false,
          };
        });

        if (mounted) setTournaments(mapped);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        if (mounted) setTournaments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchTournaments();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const counts = useMemo(
    () => ({
      live: tournaments.filter((t) => t.status === "ongoing" || t.status === "open").length,
      draft: tournaments.filter((t) => t.status === "draft").length,
      completed: tournaments.filter((t) => t.status === "completed").length,
    }),
    [tournaments],
  );

  return (
    <div className="space-y-4">
      <CommandToolbar>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">Inventory</p>
          <h2 className="mt-1 text-xl font-black uppercase text-white">Tournament Control</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">{counts.live} live/open</span>
          <span className="border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">{counts.draft} draft</span>
          <span className="border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">{counts.completed} completed</span>
          <CommandButton size="sm" onClick={() => navigate("/tournaments/create")}>
            <Plus className="h-4 w-4" />
            Create
          </CommandButton>
        </div>
      </CommandToolbar>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((item) => (
            <CommandPanel key={item} className="h-28 animate-pulse bg-white/[0.035]" />
          ))}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="grid gap-3">
          {tournaments.map((tournament) => (
            <button
              key={tournament.id}
              type="button"
              className="group grid gap-4 border border-white/10 bg-[#0a0a0c]/92 p-4 text-left transition-colors hover:border-rose-500/45 sm:grid-cols-[1fr_auto]"
              onClick={() => navigate(`/organizer/tournament/${tournament.slug || tournament.id}`)}
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={cn("border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider", statusStyles[tournament.status] || statusStyles.draft)}>
                    {tournament.status}
                  </span>
                  {tournament.isRegistered ? (
                    <span className="inline-flex items-center gap-1 border border-emerald-500/35 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Registered
                    </span>
                  ) : null}
                </div>
                <h3 className="truncate text-lg font-black uppercase text-white group-hover:text-rose-100">{tournament.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">{tournament.game}</p>
              </div>

              <div className="grid min-w-[260px] grid-cols-3 gap-2 text-xs text-zinc-400">
                <div className="border border-white/10 bg-white/[0.02] p-3">
                  <Calendar className="mb-2 h-4 w-4 text-rose-400" />
                  {tournament.date ? new Date(tournament.date).toLocaleDateString() : "TBA"}
                </div>
                <div className="border border-white/10 bg-white/[0.02] p-3">
                  <Users className="mb-2 h-4 w-4 text-rose-400" />
                  {tournament.current_participants} / {tournament.max_participants || "∞"}
                </div>
                <div className="border border-white/10 bg-white/[0.02] p-3">
                  <Clock className="mb-2 h-4 w-4 text-rose-400" />
                  {tournament.venue}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <CommandEmptyState
          title="No hosted tournaments yet"
          description="Create the first event for this organization and it will appear here as operational inventory."
          icon={<Trophy className="h-5 w-5" />}
          action={
            <CommandButton onClick={() => navigate("/tournaments/create")}>
              <Plus className="h-4 w-4" />
              Create Tournament
            </CommandButton>
          }
        />
      )}
    </div>
  );
};

export default TournamentsList;
