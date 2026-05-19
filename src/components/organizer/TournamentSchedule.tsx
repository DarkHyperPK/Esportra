import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { getTimezoneAbbr } from "@/lib/timeUtils";
import { CommandEmptyState, CommandPanel, CommandToolbar } from "@/components/management/CommandSurface";
import { cn } from "@/lib/utils";

interface ScheduledMatch {
  id: string;
  scheduled_time: string | null;
  round_index: number;
  match_number: number;
  status: string;
  team1_name: string | null;
  team2_name: string | null;
  tournament_name: string;
  tournament_game: string;
}

const statusClass = (status: string) =>
  status === "completed"
    ? "border-emerald-500/40 text-emerald-300"
    : status === "ongoing"
      ? "border-amber-500/40 text-amber-300"
      : "border-white/15 text-zinc-400";

const TournamentSchedule = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());

  const { data: matches, isLoading } = useQuery({
    queryKey: ["schedule-matches", user?.id, date?.toISOString()],
    queryFn: async () => {
      if (!user?.id || !date) return [];
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      return (await apiClient.get<any[]>(`/api/organizer/schedule?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`).catch(() => [])) as ScheduledMatch[];
    },
    enabled: !!user?.id && !!date,
  });

  return (
    <div className="space-y-4">
      <CommandToolbar>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">Match Calendar</p>
          <h2 className="mt-1 text-xl font-black uppercase text-white">
            {date ? format(date, "MMMM do, yyyy") : "Select a date"}
          </h2>
        </div>
        <span className="border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Timezone {getTimezoneAbbr()}
        </span>
      </CommandToolbar>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <CommandPanel>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-none border border-white/10 bg-black/35 text-white"
            classNames={{
              day_selected: "bg-rose-500 text-white hover:bg-rose-500 hover:text-white focus:bg-rose-500",
              day_today: "bg-white/10 text-white font-bold",
              day: "hover:bg-white/5 data-[selected]:bg-rose-500",
              nav_button: "rounded-none border border-white/10 bg-black text-white hover:bg-white hover:text-black",
              caption_label: "font-mono text-xs uppercase tracking-widest",
            }}
          />
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
            <div className="border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 h-3 w-3 bg-rose-500" />
              Selected
            </div>
            <div className="border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 h-3 w-3 bg-white/20" />
              Today
            </div>
          </div>
        </CommandPanel>

        <CommandPanel className="min-h-[420px] p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
              Loading schedule
            </div>
          ) : matches && matches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-white/10 bg-white/[0.025] text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Tournament</th>
                    <th className="px-4 py-3">Matchup</th>
                    <th className="px-4 py-3">Round</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.025]">
                      <td className="px-4 py-4 text-white">
                        <span className="inline-flex items-center gap-2">
                          <Clock className="h-4 w-4 text-zinc-500" />
                          {match.scheduled_time ? format(new Date(match.scheduled_time), "HH:mm") : "TBA"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-white">{match.tournament_name || "Unknown Tournament"}</p>
                        <p className="text-xs text-zinc-500">{match.tournament_game || ""}</p>
                      </td>
                      <td className="px-4 py-4 text-zinc-300">
                        <span className={match.team1_name ? "text-white" : "text-zinc-600"}>{match.team1_name || "TBD"}</span>
                        <span className="px-2 font-mono text-[10px] text-zinc-600">VS</span>
                        <span className={match.team2_name ? "text-white" : "text-zinc-600"}>{match.team2_name || "TBD"}</span>
                      </td>
                      <td className="px-4 py-4 text-zinc-500">R{(match.round_index ?? 0) + 1} M{match.match_number ?? 0}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={cn("border px-2 py-1 font-mono text-[10px] uppercase tracking-wider", statusClass(match.status))}>
                          {match.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <CommandEmptyState
              title="No matches scheduled"
              description="Select another date or schedule matches from a tournament bracket."
              icon={<CalendarIcon className="h-5 w-5" />}
            />
          )}
        </CommandPanel>
      </div>
    </div>
  );
};

export default TournamentSchedule;
