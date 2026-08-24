import { useState, useEffect } from "react";
import { formatCurrency } from '@/utils/formatCurrency';
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Eye,
  Trophy,
  MoreVertical,
  RefreshCw,
  Download,
  CheckCircle,
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
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandIconButton,
  CommandSection,
  CommandSegmentedButton,
  CommandToolbar,
} from '@/components/management/CommandSurface';
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
  currency?: string;
}

const STATUS_CHIP: Record<string, string> = {
  'ongoing': 'border-white/25 bg-white/[0.06] text-white',
  'active': 'border-white/25 bg-white/[0.06] text-white',
  'live': 'border-white/25 bg-white/[0.06] text-white',
  'registration': 'border-amber-500/30 bg-transparent text-amber-300',
  'open': 'border-amber-500/30 bg-transparent text-amber-300',
  'check_in': 'border-amber-500/30 bg-transparent text-amber-300',
  'upcoming': 'border-amber-500/30 bg-transparent text-amber-300',
  'completed': 'border-white/10 bg-transparent text-zinc-400',
  'cancelled': 'border-red-500/30 bg-red-950/20 text-red-300',
};

const STATUS_DOT: Record<string, string> = {
  'ongoing': 'bg-rose-500 animate-pulse',
  'active': 'bg-rose-500 animate-pulse',
  'live': 'bg-rose-500 animate-pulse',
};

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

  const statusCountsFromServer: Record<string, number> = (!Array.isArray(data) && data?.statusCounts) || {};
  const stats = {
    total: totalTournaments,
    active: (statusCountsFromServer['ongoing'] || 0) + (statusCountsFromServer['active'] || 0) + (statusCountsFromServer['open'] || 0) + (statusCountsFromServer['check_in'] || 0),
    upcoming: (statusCountsFromServer['registration'] || 0) + (statusCountsFromServer['upcoming'] || 0) + (statusCountsFromServer['draft'] || 0),
    completed: statusCountsFromServer['completed'] || 0,
  };

  const getStatusChip = (status: string) =>
    STATUS_CHIP[status] || 'border-white/10 bg-transparent text-zinc-400';

  return (
    <div className={selectedTournamentIds.size > 0 ? 'pb-24' : ''}>
      <AdminPage
        eyebrow="Content"
        title="Tournaments"
        description="Oversee and manage platform tournaments"
        actions={
          <>
            <CommandButton variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </CommandButton>
            <CommandButton variant="ghost" size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </CommandButton>
          </>
        }
      >
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Total Tournaments', value: stats.total },
            { label: 'Active', value: stats.active },
            { label: 'Upcoming', value: stats.upcoming },
            { label: 'Completed', value: stats.completed },
          ].map((stat) => (
            <div key={stat.label} className="border border-white/10 bg-[#0a0a0c]/92 p-4">
              <p className="text-xl font-black tabular-nums text-white">{stat.value}</p>
              <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <CommandToolbar>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative lg:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                <input
                  placeholder="Search tournaments…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-none border border-white/10 bg-black/60 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {['all', 'registration', 'ongoing', 'completed', 'cancelled'].map((status) => (
                  <CommandSegmentedButton
                    key={status}
                    active={statusFilter === status}
                    onClick={() => { setStatusFilter(status); setPage(1); }}
                  >
                    {status === 'all' ? 'All Status' : status.replace('_', ' ')}
                  </CommandSegmentedButton>
                ))}
              </div>
            </div>
            <CommandButton
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 border border-rose-500/40 px-1.5 font-mono text-[10px] font-bold text-rose-300">{activeFilterCount}</span>
              )}
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CommandButton>
          </CommandToolbar>
        </motion.div>

        {/* Advanced Filters */}
        {showFilters && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <CommandSection className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Game</label>
                  <input
                    placeholder="e.g. Valorant, CS2"
                    value={gameInput}
                    onChange={(e) => setGameInput(e.target.value)}
                    className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Format</label>
                  <select
                    value={formatFilter}
                    onChange={(e) => { setFormatFilter(e.target.value); setPage(1); }}
                    className="w-full rounded-none border border-white/10 bg-black/60 p-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="">All Formats</option>
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="swiss">Swiss</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Min Prize Pool</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={prizeMin}
                    onChange={(e) => { setPrizeMin(e.target.value); setPage(1); }}
                    className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Max Prize Pool</label>
                  <input
                    type="number"
                    placeholder="Any"
                    value={prizeMax}
                    onChange={(e) => { setPrizeMax(e.target.value); setPage(1); }}
                    className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Created From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Created To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                    className="w-full rounded-none border border-white/10 bg-black/60 p-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="created_at">Created Date</option>
                    <option value="start_date">Start Date</option>
                    <option value="prize_pool">Prize Pool</option>
                    <option value="name">Name</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Order</label>
                  <button
                    type="button"
                    onClick={() => { setSortDir(sortDir === 'desc' ? 'asc' : 'desc'); setPage(1); }}
                    className="flex h-[38px] w-full items-center justify-center gap-2 rounded-none border border-white/10 bg-white/[0.02] font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:border-white/25 hover:text-white"
                  >
                    {sortDir === 'desc' ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
                    {sortDir === 'desc' ? 'Newest First' : 'Oldest First'}
                  </button>
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="flex justify-end">
                  <CommandButton variant="ghost" size="sm" onClick={resetFilters}>
                    <XCircle className="h-4 w-4" />
                    Reset All Filters ({activeFilterCount})
                  </CommandButton>
                </div>
              )}
            </CommandSection>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-5 border border-red-500/25 bg-red-950/10 p-6 flex flex-col items-center gap-3"
          >
            <Ban className="h-8 w-8 text-red-300" />
            <p className="font-medium text-red-300">Failed to load tournaments</p>
            <CommandButton variant="danger" size="sm" onClick={() => refetch()}>
              Retry
            </CommandButton>
          </motion.div>
        )}

        {/* Tournaments Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <CommandSection className="mt-5 p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <Checkbox
                        checked={selectedTournamentIds.size === filteredTournaments.length ? true : selectedTournamentIds.size > 0 ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAllTournaments}
                        className="rounded-none border-white/20"
                      />
                    </th>
                    <th className="px-6 py-3 text-left">Tournament</th>
                    <th className="px-6 py-3 text-left">Game</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Prize Pool</th>
                    <th className="px-6 py-3 text-left">Teams</th>
                    <th className="px-6 py-3 text-left">Start Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <div className="flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                          <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                          Loading tournaments…
                        </div>
                      </td>
                    </tr>
                  ) : filteredTournaments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-zinc-600">
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
                        className="transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={selectedTournamentIds.has(tournament.id)}
                            onCheckedChange={() => toggleSelectTournament(tournament.id)}
                            className="rounded-none border-white/20"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-white/[0.03]">
                              <Trophy className="h-4 w-4 text-zinc-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{tournament.name}</p>
                              <p className="font-mono text-[10px] text-zinc-500">{tournament.id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">{tournament.game || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider capitalize ${getStatusChip(tournament.status)}`}>
                            <span className={`h-1.5 w-1.5 ${STATUS_DOT[tournament.status] || 'bg-current opacity-70'}`} />
                            {tournament.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm tabular-nums text-zinc-200">
                          {formatCurrency(parseFloat(tournament.prize_pool?.toString() || '0'), tournament.currency)}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm tabular-nums text-zinc-400">{tournament.max_teams || '-'}</td>
                        <td className="px-6 py-4 font-mono text-sm tabular-nums text-zinc-500">
                          {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <CommandIconButton label="Tournament actions" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </CommandIconButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-none border-white/10 bg-[#0a0a0c]">
                              <DropdownMenuItem
                                className="rounded-none text-zinc-300 focus:bg-white/[0.06] focus:text-white"
                                onClick={() => setSelectedTournament(tournament)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="rounded-none text-zinc-300 focus:bg-white/[0.06] focus:text-white">
                                <Link to={`/organizer/tournament/${tournament.slug}`}>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Manage Tournament
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-none text-zinc-300 focus:bg-rose-500/10 focus:text-white"
                                onClick={() => handleStatusChange(tournament.id, 'ongoing')}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Start Tournament
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-none text-amber-300 focus:bg-amber-500/10 focus:text-amber-200"
                                onClick={() => setConfirmAction({ id: tournament.id, status: 'completed', name: tournament.name })}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-none text-red-300 focus:bg-red-500/10 focus:text-red-200"
                                onClick={() => setConfirmAction({ id: tournament.id, status: 'cancelled', name: tournament.name })}
                              >
                                <Ban className="mr-2 h-4 w-4" />
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
          </CommandSection>
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              Page {page} of {totalPages} ({totalTournaments} tournaments)
            </p>
            <div className="flex gap-2">
              <CommandButton variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                Previous
              </CommandButton>
              <CommandButton variant="secondary" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                Next
              </CommandButton>
            </div>
          </div>
        )}
      </AdminPage>

      {/* Bulk Action Floating Bar */}
      <AnimatePresence>
        {selectedTournamentIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-2 px-5 py-3 border border-white/15 bg-[#0a0a0c]/96 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <span className="mr-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
              {selectedTournamentIds.size} selected
            </span>
            <CommandButton size="sm" variant="success" onClick={() => handleBulkTournamentAction('approve')} disabled={bulkAction.isPending}>
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </CommandButton>
            <CommandButton size="sm" variant="warning" onClick={() => handleBulkTournamentAction('feature')} disabled={bulkAction.isPending}>
              <Star className="h-3.5 w-3.5" />
              Feature
            </CommandButton>
            <CommandButton size="sm" variant="secondary" onClick={() => handleBulkTournamentAction('unfeature')} disabled={bulkAction.isPending}>
              <StarOff className="h-3.5 w-3.5" />
              Unfeature
            </CommandButton>
            <CommandButton size="sm" variant="danger" onClick={() => handleBulkTournamentAction('cancel')} disabled={bulkAction.isPending}>
              <Ban className="h-3.5 w-3.5" />
              Cancel
            </CommandButton>
            <CommandButton size="sm" variant="ghost" onClick={clearTournamentSelection}>
              Clear
            </CommandButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tournament Detail Modal */}
      <Dialog open={!!selectedTournament} onOpenChange={() => { setSelectedTournament(null); setModalTab('details'); }}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto overscroll-contain rounded-none border-white/10 bg-[#0a0a0c]" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Trophy className="h-4 w-4 text-zinc-400" />
              {selectedTournament?.name || 'Tournament Details'}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-white/10 mb-4">
            {(['details'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setModalTab(tab)}
                className={`px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-colors ${
                  modalTab === tab
                    ? 'border-b-2 border-rose-500 text-rose-400'
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
                <div key={item.label} className="border border-white/10 bg-white/[0.025] p-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{item.label}</p>
                  <p className="mt-1 text-sm text-white">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Change History */}
          {selectedTournament && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
                <History className="h-4 w-4" />
                Change History
              </h3>
              <EntityHistoryTimeline targetType="Tournament" targetId={selectedTournament.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="max-w-md rounded-none border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Action</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to {confirmAction?.status === 'cancelled' ? 'cancel' : 'mark as completed'} <span className="font-medium text-white">{confirmAction?.name}</span>? This action cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-3">
            <CommandButton variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
              Cancel
            </CommandButton>
            <CommandButton
              size="sm"
              variant={confirmAction?.status === 'cancelled' ? 'danger' : 'primary'}
              onClick={() => {
                if (confirmAction) {
                  handleStatusChange(confirmAction.id, confirmAction.status);
                  setConfirmAction(null);
                }
              }}
            >
              {confirmAction?.status === 'cancelled' ? 'Cancel Tournament' : 'Mark Completed'}
            </CommandButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Cancel Confirmation Dialog */}
      <Dialog open={!!bulkConfirm} onOpenChange={(open) => { if (!open) setBulkConfirm(null); }}>
        <DialogContent className="max-w-md rounded-none border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirm Bulk Cancel
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            You are about to cancel <span className="font-medium text-white">{selectedTournamentIds.size} tournament(s)</span>. This action cannot be undone.
          </p>
          <DialogFooter className="mt-4">
            <CommandButton variant="ghost" size="sm" onClick={() => setBulkConfirm(null)}>
              Go Back
            </CommandButton>
            <CommandButton variant="danger" size="sm" onClick={confirmBulkTournamentAction} disabled={bulkAction.isPending}>
              {bulkAction.isPending ? 'Cancelling…' : `Cancel ${selectedTournamentIds.size} Tournament(s)`}
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentManagementTool;
