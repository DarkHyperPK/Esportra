import { useState } from "react";
import { formatCurrency } from '@/utils/formatCurrency';
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Trophy,
  MapPin,
  TrendingUp,
  Calendar,
  RefreshCw,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminAnalytics } from "@/hooks/useAdminQueries";

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

  const metricCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'rose',
      description: 'Platform registrations'
    },
    {
      title: 'Total Tournaments',
      value: stats.totalTournaments,
      icon: Trophy,
      color: 'amber',
      description: 'All-time tournaments'
    },
    {
      title: 'Total Venues',
      value: stats.totalVenues,
      icon: MapPin,
      color: 'emerald',
      description: 'Gaming locations'
    },
    {
      title: 'Total Prize Pool',
      value: formatCurrency(stats.totalPrizePool, 'USD'),
      icon: DollarSign,
      color: 'violet',
      description: 'Prize money distributed',
      isString: true
    },
    {
      title: 'New Users (7d)',
      value: stats.newUsersThisWeek,
      icon: TrendingUp,
      color: 'cyan',
      description: 'Last 7 days'
    },
    {
      title: 'New Tournaments (7d)',
      value: stats.newTournamentsThisWeek,
      icon: Calendar,
      color: 'blue',
      description: 'Last 7 days'
    },
    {
      title: 'Venue Bookings',
      value: stats.totalBookings,
      icon: MapPin,
      color: 'green',
      description: 'Total bookings'
    },
    {
      title: 'Completed',
      value: stats.completedTournaments,
      icon: Trophy,
      color: 'zinc',
      description: 'Finished tournaments'
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      rose: { bg: 'bg-rose-500/10', text: 'text-rose-500' },
      amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
      emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
      violet: { bg: 'bg-violet-500/10', text: 'text-violet-500' },
      cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
      blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500' },
      zinc: { bg: 'bg-zinc-500/10', text: 'text-zinc-500' },
    };
    return colors[color] || colors.rose;
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Analytics</h1>
              <p className="text-zinc-500 text-sm">Platform metrics and insights</p>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-800 text-zinc-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.header>

      {/* Metrics Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        {metricCards.map((card, idx) => {
          const colorClasses = getColorClasses(card.color);
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              whileHover={{ y: -2, scale: 1.02 }}
              className="p-5 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 hover:border-rose-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${colorClasses.bg} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${colorClasses.text}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">
                {loading ? '...' : card.isString ? card.value : typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </p>
              <p className="text-sm font-medium text-white mt-1">{card.title}</p>
              <p className="text-xs text-zinc-500">{card.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-6"
        >
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            User Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50">
              <span className="text-zinc-400">Total Registered</span>
              <span className="text-white font-mono">{stats.totalUsers.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50">
              <span className="text-zinc-400">New This Week</span>
              <span className="text-emerald-400 font-mono">+{stats.newUsersThisWeek}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50">
              <span className="text-zinc-400">Growth Rate</span>
              <span className="text-cyan-400 font-mono">
                {stats.totalUsers > 0 ? ((stats.newUsersThisWeek / stats.totalUsers) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tournament Overview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-6"
        >
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Tournament Overview
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50">
              <span className="text-zinc-400">Total Created</span>
              <span className="text-white font-mono">{stats.totalTournaments.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50">
              <span className="text-zinc-400">Completed</span>
              <span className="text-emerald-400 font-mono">{stats.completedTournaments}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50">
              <span className="text-zinc-400">Prize Pool Total</span>
              <span className="text-violet-400 font-mono">{formatCurrency(stats.totalPrizePool, 'USD')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsTool;
