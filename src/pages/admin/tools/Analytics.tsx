import { useState } from "react";
import { formatCurrency } from '@/utils/formatCurrency';
import { useAdminAnalytics } from "@/hooks/useAdminQueries";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  CommandButton,
  CommandMetric,
  CommandPanel,
  CommandSection,
} from "@/components/management/CommandSurface";
import {
  BarChart3,
  Calendar,
  DollarSign,
  MapPin,
  RefreshCw,
  Trophy,
  TrendingUp,
  Users,
} from "lucide-react";

const AnalyticsTool = () => {
  const { data, isLoading: loading, refetch } = useAdminAnalytics();
  const [refreshing, setRefreshing] = useState(false);

  const stats = {
    totalUsers: data?.total_users || 0,
    totalTournaments: data?.total_tournaments || 0,
    totalVenues: data?.total_venues || 0,
    totalPrizePool: parseFloat(data?.total_prize_pool) || 0,
    newUsersThisWeek: data?.new_users_this_week || 0,
    newTournamentsThisWeek: data?.new_tournaments_this_week || 0,
    totalBookings: data?.total_bookings || 0,
    completedTournaments: data?.completed_tournaments || 0,
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const metrics = [
    { label: 'Total Users', value: loading ? '…' : stats.totalUsers.toLocaleString(), icon: <Users className="h-4 w-4" /> },
    { label: 'Tournaments', value: loading ? '…' : stats.totalTournaments.toLocaleString(), icon: <Trophy className="h-4 w-4" /> },
    { label: 'Venues', value: loading ? '…' : stats.totalVenues.toLocaleString(), icon: <MapPin className="h-4 w-4" /> },
    { label: 'Prize Pool', value: loading ? '…' : formatCurrency(stats.totalPrizePool, 'USD'), icon: <DollarSign className="h-4 w-4" /> },
    { label: 'New Users · 7d', value: loading ? '…' : `+${stats.newUsersThisWeek.toLocaleString()}`, icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'New Tournaments · 7d', value: loading ? '…' : `+${stats.newTournamentsThisWeek.toLocaleString()}`, icon: <Calendar className="h-4 w-4" /> },
    { label: 'Venue Bookings', value: loading ? '…' : stats.totalBookings.toLocaleString(), icon: <MapPin className="h-4 w-4" /> },
    { label: 'Completed', value: loading ? '…' : stats.completedTournaments.toLocaleString(), icon: <Trophy className="h-4 w-4" /> },
  ];

  const StatLine = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
    <div className="flex items-center justify-between border-b border-white/5 py-2.5 text-sm last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono tabular-nums ${accent ? 'text-rose-300' : 'text-white'}`}>{value}</span>
    </div>
  );

  return (
    <AdminPage
      eyebrow="Analytics"
      title="Platform Analytics"
      description="All-time platform metrics and insights."
      actions={
        <CommandButton variant="ghost" size="sm" disabled={refreshing} onClick={handleRefresh}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </CommandButton>
      }
    >
      <CommandSection>
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400">
          All-time metrics
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {metrics.map((m) => (
            <CommandMetric key={m.label} label={m.label} value={m.value} icon={m.icon} />
          ))}
        </div>
      </CommandSection>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CommandSection>
          <SectionHeading icon={<Users className="h-4 w-4" />} text="User Overview" />
          <StatLine label="Total registered" value={stats.totalUsers.toLocaleString()} />
          <StatLine label="New this week" value={`+${stats.newUsersThisWeek}`} accent />
          <StatLine
            label="Weekly growth rate"
            value={`${stats.totalUsers > 0 ? ((stats.newUsersThisWeek / stats.totalUsers) * 100).toFixed(1) : '0.0'}%`}
          />
        </CommandSection>

        <CommandSection>
          <SectionHeading icon={<BarChart3 className="h-4 w-4" />} text="Tournament Overview" />
          <StatLine label="Total created" value={stats.totalTournaments.toLocaleString()} />
          <StatLine label="Completed" value={stats.completedTournaments.toLocaleString()} />
          <StatLine label="Prize pool total" value={formatCurrency(stats.totalPrizePool, 'USD')} accent />
        </CommandSection>
      </div>

      <CommandPanel>
        <StatLine label="Venue bookings all-time" value={stats.totalBookings.toLocaleString()} />
      </CommandPanel>
    </AdminPage>
  );
};

function SectionHeading({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-zinc-500">{icon}</span>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-zinc-400">{text}</p>
    </div>
  );
}

export default AnalyticsTool;
