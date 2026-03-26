import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Trophy,
  Search,
  Eye,
  MoreVertical,
  Calendar,
  Users,
  DollarSign,
  RefreshCw,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  Pause,
  Ban
} from "lucide-react";
import { Link } from "react-router-dom";
import TournamentSponsorManager from "@/components/admin/TournamentSponsorManager";
import { useAdminTournaments, useAdminTournamentUpdate } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Tournament {
  id: string;
  name: string;
  game: string;
  status: string;
  prize_pool: string | number;
  max_teams: number;
  start_date: string;
  created_at: string;
  organizer_id: string;
}

const TournamentManagementTool = () => {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useAdminTournaments();
  const updateTournament = useAdminTournamentUpdate();
  const tournaments = (data ?? []) as Tournament[];
  const loading = isLoading;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'sponsors'>('details');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };

  const handleStatusChange = (tournamentId: string, newStatus: string) => {
    updateTournament.mutate(
      { id: tournamentId, updates: { status: newStatus } },
      {
        onSuccess: () => {
          toast({ title: 'Status Updated', description: `Tournament status changed to ${newStatus}` });
        },
      }
    );
  };

  const exportCSV = () => {
    const csv = [
      ['ID', 'Name', 'Game', 'Status', 'Prize Pool', 'Max Teams', 'Start Date'],
      ...filteredTournaments.map(t => [t.id, t.name, t.game, t.status, t.prize_pool, t.max_teams, t.start_date])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tournaments_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTournaments = tournaments.filter(t => {
    const matchesSearch = !searchTerm ||
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.game?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tournaments.length,
    active: tournaments.filter(t => t.status === 'ongoing' || t.status === 'active').length,
    upcoming: tournaments.filter(t => t.status === 'registration' || t.status === 'upcoming').length,
    completed: tournaments.filter(t => t.status === 'completed').length,
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'ongoing': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'active': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      'registration': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      'upcoming': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      'completed': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
      'cancelled': 'bg-red-500/10 text-red-400 border-red-500/30',
    };
    return styles[status] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tournament Management</h1>
              <p className="text-zinc-500 text-sm">Oversee and manage platform tournaments</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
          <Button
            size="sm"
            onClick={exportCSV}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.header>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: 'Total Tournaments', value: stats.total, icon: Trophy, color: 'amber' },
          { label: 'Active', value: stats.active, icon: Play, color: 'emerald' },
          { label: 'Upcoming', value: stats.upcoming, icon: Clock, color: 'blue' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'zinc' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col md:flex-row gap-3 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search tournaments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'registration', 'ongoing', 'completed', 'cancelled'].map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={`border-zinc-800 capitalize ${statusFilter === status ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'text-zinc-400'}`}
            >
              {status === 'all' ? 'All Status' : status}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Tournaments Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-900/50">
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Tournament</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Game</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Prize Pool</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Teams</th>
                <th className="px-6 py-3 text-left text-xs font-mono text-zinc-500 uppercase">Start Date</th>
                <th className="px-6 py-3 text-right text-xs font-mono text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      Loading tournaments...
                    </div>
                  </td>
                </tr>
              ) : filteredTournaments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500">
                    No tournaments found
                  </td>
                </tr>
              ) : (
                filteredTournaments.slice(0, 100).map((tournament, idx) => (
                  <motion.tr
                    key={tournament.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{tournament.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{tournament.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{tournament.game || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <Badge className={`${getStatusBadge(tournament.status)} border text-xs capitalize`}>
                        {tournament.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-emerald-400 font-mono">
                      ${parseFloat(tournament.prize_pool?.toString() || '0').toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{tournament.max_teams || '-'}</td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0a0a0c] border-zinc-800">
                          <DropdownMenuItem
                            className="text-zinc-300 focus:text-white focus:bg-zinc-800"
                            onClick={() => setSelectedTournament(tournament)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-emerald-400 focus:text-emerald-300 focus:bg-emerald-500/10"
                            onClick={() => handleStatusChange(tournament.id, 'ongoing')}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Tournament
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-amber-400 focus:text-amber-300 focus:bg-amber-500/10"
                            onClick={() => handleStatusChange(tournament.id, 'completed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                            onClick={() => handleStatusChange(tournament.id, 'cancelled')}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Tournament Detail Modal */}
      <Dialog open={!!selectedTournament} onOpenChange={() => { setSelectedTournament(null); setModalTab('details'); }}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              {selectedTournament?.name || 'Tournament Details'}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-800 mb-4">
            {(['details', 'sponsors'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setModalTab(tab)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  modalTab === tab
                    ? 'text-rose-500 border-b-2 border-rose-500'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {selectedTournament && modalTab === 'details' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Name', value: selectedTournament.name },
                { label: 'Game', value: selectedTournament.game },
                { label: 'Status', value: selectedTournament.status },
                { label: 'Prize Pool', value: `$${parseFloat(selectedTournament.prize_pool?.toString() || '0').toLocaleString()}` },
                { label: 'Max Teams', value: selectedTournament.max_teams },
                { label: 'Start Date', value: selectedTournament.start_date ? new Date(selectedTournament.start_date).toLocaleDateString() : 'N/A' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-zinc-900/50">
                  <p className="text-xs text-zinc-500 uppercase">{item.label}</p>
                  <p className="text-white text-sm mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {selectedTournament && modalTab === 'sponsors' && (
            <TournamentSponsorManager
              tournamentId={selectedTournament.id}
              tournamentName={selectedTournament.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentManagementTool;
