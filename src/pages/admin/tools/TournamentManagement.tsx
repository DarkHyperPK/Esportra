import { useState, useEffect } from "react";
import { formatCurrency } from '@/utils/formatCurrency';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trophy,
  Search,
  Eye,
  MoreVertical,
  RefreshCw,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  Ban,
  Filter,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  Star,
  StarOff,
  AlertTriangle,
  Loader2,
  History,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminTournaments, useAdminTournamentUpdate, useAdminBulkTournamentAction } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";
import { downloadCsvExport } from "@/lib/exportUtils";
import EntityHistoryTimeline from '@/components/admin/EntityHistoryTimeline';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

interface Tournament {
  id: string;
  slug: string;
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

  // Filter & pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gameInput, setGameInput] = useState<string>('');
  const [gameFilter, setGameFilter] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<string>('');
  const [prizeMin, setPrizeMin] = useState<string>('');
  const [prizeMax, setPrizeMax] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<string>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [modalTab, setModalTab] = useState<'details'>('details');
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ id: string; status: string; name: string } | null>(null);

  // Bulk selection state
  const [selectedTournamentIds, setSelectedTournamentIds] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<{ action: string } | null>(null);
  const bulkAction = useAdminBulkTournamentAction();

  // Server-side filtered query
  const { data, isLoading, error, refetch } = useAdminTournaments({
    page,
    limit: 50,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchTerm || undefined,
    game: gameFilter || undefined,
    format: formatFilter || undefined,
    prize_min: prizeMin ? Number(prizeMin) : undefined,
    prize_max: prizeMax ? Number(prizeMax) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    sort_by: sortBy,
    sort_dir: sortDir,
  });
  const updateTournament = useAdminTournamentUpdate();

  // Handle both old format (array) and new format ({ data, total })
  const tournaments = (Array.isArray(data) ? data : data?.data ?? []) as Tournament[];
  const totalTournaments = Array.isArray(data) ? data.length : data?.total ?? tournaments.length;
  const totalPages = Math.ceil(totalTournaments / 50);
  const loading = isLoading;

  // Clear selection when page/filters change to prevent invisible stale selections
  useEffect(() => {
    setSelectedTournamentIds(new Set());
  }, [page, searchTerm, statusFilter, sortBy, sortDir]);

  // Debounce search input → searchTerm (triggers server query)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Debounce game filter input → gameFilter (triggers server query)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setGameFilter(gameInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [gameInput]);

  const handleRefresh= () => {
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

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await downloadCsvExport('/api/admin/export/tournaments', {
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        game: gameFilter || undefined,
        format: formatFilter || undefined,
        prize_min: prizeMin || undefined,
        prize_max: prizeMax || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      }, `tournaments_export_${new Date().toISOString().split('T')[0]}.csv`);
      toast({ title: 'Export complete', description: 'Tournaments CSV downloaded' });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSearchInput('');
    setStatusFilter('all');
    setGameInput('');
    setGameFilter('');
    setFormatFilter('');
    setPrizeMin('');
    setPrizeMax('');
    setDateFrom('');
    setDateTo('');
    setSortBy('created_at');
    setSortDir('desc');
    setPage(1);
  };

  const activeFilterCount = [
    statusFilter !== 'all',
    gameFilter !== '',
    formatFilter !== '',
    prizeMin !== '',
    prizeMax !== '',
    dateFrom !== '',
    dateTo !== '',
  ].filter(Boolean).length;

  // Server-side filtering — no client filter needed
  const filteredTournaments = tournaments;

  // Bulk selection helpers
  const toggleSelectTournament = (id: string) => {
    setSelectedTournamentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllTournaments = () => {
    if (selectedTournamentIds.size === filteredTournaments.length) {
      setSelectedTournamentIds(new Set());
    } else {
      setSelectedTournamentIds(new Set(filteredTournaments.map((t: any) => t.id)));
    }
  };

  const clearTournamentSelection = () => setSelectedTournamentIds(new Set());

  const handleBulkTournamentAction = async (action: string) => {
    if (selectedTournamentIds.size === 0) return;
    // Destructive actions require confirmation
    if (action === 'cancel') {
      setBulkConfirm({ action });
      return;
    }
    await bulkAction.mutateAsync({ tournamentIds: Array.from(selectedTournamentIds), action });
    clearTournamentSelection();
  };

  const confirmBulkTournamentAction = async () => {
    if (!bulkConfirm || selectedTournamentIds.size === 0) return;
    await bulkAction.mutateAsync({ tournamentIds: Array.from(selectedTournamentIds), action: bulkConfirm.action });
    clearTournamentSelection();
    setBulkConfirm(null);
  };

  const statusCountsFromServer = (!Array.isArray(data) && data?.statusCounts) || {};
  const stats = {
    total: totalTournaments,
    active: (statusCountsFromServer['ongoing'] || 0) + (statusCountsFromServer['active'] || 0) + (statusCountsFromServer['open'] || 0) + (statusCountsFromServer['check_in'] || 0),
    upcoming: (statusCountsFromServer['registration'] || 0) + (statusCountsFromServer['upcoming'] || 0) + (statusCountsFromServer['draft'] || 0),
    completed: statusCountsFromServer['completed'] || 0,
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
    <div className={`min-h-screen p-4 lg:p-8 ${selectedTournamentIds.size > 0 ? 'pb-24' : ''}`}>
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
            onClick={handleExport}
            disabled={isExporting}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {isExporting ? 'Exporting…' : 'Export'}
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-rose-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'registration', 'ongoing', 'completed', 'cancelled'].map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`border-zinc-800 capitalize ${statusFilter === status ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'text-zinc-400'}`}
            >
              {status === 'all' ? 'All Status' : status}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Advanced Filters */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="border-zinc-800 text-zinc-400 hover:text-white mb-3"
        >
          <Filter className="w-4 h-4 mr-2" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-rose-500/20 text-rose-400 text-xs">{activeFilterCount}</Badge>
          )}
          {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
        </Button>

        {showFilters && (
          <div className="p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Game</label>
                <Input
                  placeholder="e.g. Valorant, CS2"
                  value={gameInput}
                  onChange={(e) => setGameInput(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 focus:border-rose-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Format</label>
                <select
                  value={formatFilter}
                  onChange={(e) => { setFormatFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-rose-500 outline-none"
                >
                  <option value="">All Formats</option>
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination">Double Elimination</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="swiss">Swiss</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Min Prize Pool</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={prizeMin}
                  onChange={(e) => { setPrizeMin(e.target.value); setPage(1); }}
                  className="bg-zinc-900 border-zinc-800 focus:border-rose-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Max Prize Pool</label>
                <Input
                  type="number"
                  placeholder="Any"
                  value={prizeMax}
                  onChange={(e) => { setPrizeMax(e.target.value); setPage(1); }}
                  className="bg-zinc-900 border-zinc-800 focus:border-rose-500 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Created From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="bg-zinc-900 border-zinc-800 focus:border-rose-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Created To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="bg-zinc-900 border-zinc-800 focus:border-rose-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:border-rose-500 outline-none"
                >
                  <option value="created_at">Created Date</option>
                  <option value="start_date">Start Date</option>
                  <option value="prize_pool">Prize Pool</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Order</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); setPage(1); }}
                  className="w-full border-zinc-800 text-zinc-400 hover:text-white"
                >
                  {sortDir === 'desc' ? <SortDesc className="w-4 h-4 mr-2" /> : <SortAsc className="w-4 h-4 mr-2" />}
                  {sortDir === 'desc' ? 'Newest First' : 'Oldest First'}
                </Button>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-zinc-400 hover:text-white">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reset All Filters ({activeFilterCount})
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-6 p-6 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col items-center gap-3"
        >
          <Ban className="w-8 h-8 text-red-400" />
          <p className="text-red-400 font-medium">Failed to load tournaments</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
            Retry
          </Button>
        </motion.div>
      )}

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
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={selectedTournamentIds.size === filteredTournaments.length ? true : selectedTournamentIds.size > 0 ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAllTournaments}
                    className="border-zinc-600"
                  />
                </th>
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
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      Loading tournaments...
                    </div>
                  </td>
                </tr>
              ) : filteredTournaments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-500">
                    No tournaments found
                  </td>
                </tr>
              ) : (
                filteredTournaments.map((tournament, idx) => (
                  <motion.tr
                    key={tournament.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="hover:bg-zinc-900/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedTournamentIds.has(tournament.id)}
                        onCheckedChange={() => toggleSelectTournament(tournament.id)}
                        className="border-zinc-600"
                      />
                    </td>
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
                      {formatCurrency(parseFloat(tournament.prize_pool?.toString() || '0'), tournament.currency)}
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
                          <DropdownMenuItem asChild className="text-blue-400 focus:text-blue-300 focus:bg-blue-500/10">
                            <Link to={`/organizer/tournament/${tournament.slug}`}>
                              <Settings className="w-4 h-4 mr-2" />
                              Manage Tournament
                            </Link>
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
                            onClick={() => setConfirmAction({ id: tournament.id, status: 'completed', name: tournament.name })}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                            onClick={() => setConfirmAction({ id: tournament.id, status: 'cancelled', name: tournament.name })}
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

      {/* Bulk Action Floating Bar */}
      <AnimatePresence>
        {selectedTournamentIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl bg-zinc-900/95 border border-zinc-700/50 backdrop-blur-xl shadow-2xl"
          >
            <span className="text-sm text-zinc-300 font-medium mr-2">
              {selectedTournamentIds.size} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => handleBulkTournamentAction('approve')}
              disabled={bulkAction.isPending}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => handleBulkTournamentAction('cancel')}
              disabled={bulkAction.isPending}
            >
              <Ban className="w-3.5 h-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={() => handleBulkTournamentAction('feature')}
              disabled={bulkAction.isPending}
            >
              <Star className="w-3.5 h-3.5 mr-1.5" />
              Feature
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-500/30 text-zinc-400 hover:bg-zinc-800"
              onClick={() => handleBulkTournamentAction('unfeature')}
              disabled={bulkAction.isPending}
            >
              <StarOff className="w-3.5 h-3.5 mr-1.5" />
              Unfeature
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-600 text-zinc-400 hover:bg-zinc-800"
              onClick={clearTournamentSelection}
            >
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages} ({totalTournaments} tournaments)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="border-zinc-800 text-zinc-400"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="border-zinc-800 text-zinc-400"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Tournament Detail Modal */}
      <Dialog open={!!selectedTournament} onOpenChange={() => { setSelectedTournament(null); setModalTab('details'); }}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-3xl max-h-[80vh] overflow-y-auto overscroll-contain" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              {selectedTournament?.name || 'Tournament Details'}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-800 mb-4">
            {(['details'] as const).map(tab => (
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
                { label: 'Prize Pool', value: formatCurrency(parseFloat(selectedTournament.prize_pool?.toString() || '0'), selectedTournament.currency) },
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

          {/* Change History */}
          {selectedTournament && (
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-400" />
                Change History
              </h3>
              <EntityHistoryTimeline targetType="Tournament" targetId={selectedTournament.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Action</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 text-sm">
            Are you sure you want to {confirmAction?.status === 'cancelled' ? 'cancel' : 'mark as completed'} <span className="text-white font-medium">{confirmAction?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)} className="border-zinc-800 text-zinc-400">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (confirmAction) {
                  handleStatusChange(confirmAction.id, confirmAction.status);
                  setConfirmAction(null);
                }
              }}
              className={confirmAction?.status === 'cancelled' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}
            >
              {confirmAction?.status === 'cancelled' ? 'Cancel Tournament' : 'Mark Completed'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Cancel Confirmation Dialog */}
      <Dialog open={!!bulkConfirm} onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirm Bulk Cancel
            </DialogTitle>
          </DialogHeader>
          <p className="text-zinc-400 text-sm">
            You are about to cancel <span className="text-white font-medium">{selectedTournamentIds.size} tournament(s)</span>. This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setBulkConfirm(null)} className="border-zinc-800 text-zinc-400">
              Go Back
            </Button>
            <Button
              size="sm"
              onClick={confirmBulkTournamentAction}
              disabled={bulkAction.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkAction.isPending ? 'Cancelling...' : `Cancel ${selectedTournamentIds.size} Tournament(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentManagementTool;
