import { BarChart3, Trophy, Users, Wallet } from "lucide-react";
import { CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useOrganizerStats } from "@/hooks/useOrganizerStats";
import { CommandEmptyState, CommandMetric, CommandPanel, CommandToolbar } from "@/components/management/CommandSurface";

const CHART_COLORS = ["#f43f5e", "#ffffff", "#9f1239", "#71717a", "#fecdd3"];

const tooltipStyle = {
  backgroundColor: "#0a0a0c",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 0,
  color: "white",
};

const TournamentAnalytics = () => {
  const { data, isLoading } = useOrganizerStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <CommandPanel key={item} className="h-28 animate-pulse bg-white/[0.035]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CommandPanel className="h-80 animate-pulse bg-white/[0.035]" />
          <CommandPanel className="h-80 animate-pulse bg-white/[0.035]" />
        </div>
      </div>
    );
  }

  const analyticsData = data || {
    totalTournaments: 0,
    totalParticipants: 0,
    activeTournaments: 0,
    upcomingTournaments: 0,
    totalPrizePool: 0,
    monthlyParticipation: [],
    gameDistribution: [],
  };

  return (
    <div className="space-y-4">
      <CommandToolbar>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">Signal</p>
          <h2 className="mt-1 text-xl font-black uppercase text-white">Organization Analytics</h2>
        </div>
        <span className="border border-white/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Live operational snapshot
        </span>
      </CommandToolbar>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <CommandMetric label="Total Tournaments" value={analyticsData.totalTournaments} icon={<Trophy className="h-4 w-4" />} />
        <CommandMetric label="Participants" value={analyticsData.totalParticipants} icon={<Users className="h-4 w-4" />} />
        <CommandMetric label="Prize Pool" value={`$${analyticsData.totalPrizePool.toLocaleString()}`} icon={<Wallet className="h-4 w-4" />} />
        <CommandMetric label="Active Events" value={analyticsData.activeTournaments} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CommandPanel>
          <div className="mb-5">
            <h3 className="text-lg font-black uppercase text-white">Monthly Participation</h3>
            <p className="text-sm text-zinc-500">Participants over the last six months</p>
          </div>
          <div className="h-72">
            {analyticsData.monthlyParticipation.length === 0 ? (
              <CommandEmptyState title="Not enough data yet" description="Participation trends will appear after more registrations are recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.monthlyParticipation} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="month" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="participants" stroke="#f43f5e" strokeWidth={2} activeDot={{ r: 6, fill: "#fff" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CommandPanel>

        <CommandPanel>
          <div className="mb-5">
            <h3 className="text-lg font-black uppercase text-white">Tournaments By Game</h3>
            <p className="text-sm text-zinc-500">Which games your organization hosts most</p>
          </div>
          <div className="h-72">
            {analyticsData.gameDistribution.length === 0 ? (
              <CommandEmptyState title="Not enough data yet" description="Game distribution appears after hosted tournaments are recorded." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analyticsData.gameDistribution} cx="45%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={4} dataKey="value">
                    {analyticsData.gameDistribution.map((entry, index) => (
                      <Cell key={`cell-${entry.name || index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="square" />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CommandPanel>
      </div>
    </div>
  );
};

export default TournamentAnalytics;
