import { useState } from "react";
import { formatCurrency } from '@/utils/formatCurrency';
import {
  Search, Eye, MoreVertical,
  Users, RefreshCw, Trash2, UserMinus, ArrowRightLeft,
  Pencil, Loader2, Gamepad2, Crown, Download, Upload, X,
  UsersRound
} from "lucide-react";
import { csvEscape } from "@/lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import EntityHistoryTimeline from '@/components/admin/EntityHistoryTimeline';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandEmptyState,
  CommandMetric,
  CommandSection,
  CommandToolbar,
} from '@/components/management/CommandSurface';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────
interface TeamRow {
  id: string;
  name: string;
  tag: string;
  game: string;
  logo_url: string | null;
  owner_id: string;
  is_active: boolean;
  country_code: string | null;
  created_at: string;
  team_kind?: string;
  member_count: number;
  tournament_count: number;
  wins: number;
  owner_username: string;
  owner_name: string | null;
  owner_avatar: string | null;
}

interface TeamListResponse {
  teams: TeamRow[];
  total: number;
  stats: {
    total_teams: number;
    active_teams: number;
    solo_adapters?: number;
    mock_teams?: number;
    orphan_mock_teams?: number;
    avg_members: number;
  };
}

interface TeamMember {
  user_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  display_order: number;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface TeamTournament {
  tournament_id: string;
  status: string;
  registered_at: string;
  tournament_name: string;
  game: string;
  tournament_status: string;
  start_date: string;
  prize_pool: string | number | null;
  currency?: string;
}

interface LeaderboardStats {
  wins: number;
  losses: number;
  matches_played: number;
  win_rate: number;
  tournaments_won: number;
  rp: number;
}

interface TeamDetail {
  team: Record<string, unknown>;
  members: TeamMember[];
  tournaments: TeamTournament[];
  invites: Array<Record<string, unknown>>;
  leaderboard: LeaderboardStats | null;
}

const STATUS_BADGE: Record<string, string> = {
  completed: 'border-white/40 bg-white/[0.06] text-white',
  ongoing: 'border-amber-500/35 bg-amber-950/20 text-amber-300',
};

const DETAIL_TABS: Array<{ value: 'members' | 'tournaments' | 'leaderboard' | 'history'; label: string }> = [
  { value: 'members', label: 'Members' },
  { value: 'tournaments', label: 'Tournaments' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'history', label: 'History' },
];

// ── Component ────────────────────────────────────────────────────────────
const TeamManagementTool = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  // Detail dialog
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'members' | 'tournaments' | 'leaderboard' | 'history'>('members');

  // Confirm dialogs
  const [disbandTeam, setDisbandTeam] = useState<TeamRow | null>(null);
  const [removeMember, setRemoveMember] = useState<{ teamId: string; userId: string; username: string } | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ teamId: string; member: TeamMember } | null>(null);
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', tag: '', game: '', description: '' });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);

  // ── Queries ──
  const { data, isLoading, refetch } = useQuery<TeamListResponse>({
    queryKey: ['admin-teams', searchTerm, gameFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
      if (searchTerm) params.set('search', searchTerm);
      if (gameFilter) params.set('game', gameFilter);
      return apiClient.get<TeamListResponse>(`/api/admin/teams?${params}`);
    },
    staleTime: 30_000,
  });

  const teams = data?.teams ?? [];
  const total = data?.total ?? 0;
  const stats = data?.stats ?? { total_teams: 0, active_teams: 0, avg_members: 0 };

  const { data: teamDetail, isLoading: detailLoading } = useQuery<TeamDetail>({
    queryKey: ['admin-team-detail', selectedTeamId],
    queryFn: () => apiClient.get<TeamDetail>(`/api/admin/teams/${selectedTeamId}`),
    enabled: !!selectedTeamId,
  });

  // ── Mutations ──
  const disbandMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/teams/${id}`),
    onSuccess: () => {
      toast({ title: 'Team disbanded' });
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setDisbandTeam(null);
      setSelectedTeamId(null);
    },
    onError: (e: Error) => toast({ title: 'Failed to disband', description: e.message, variant: 'destructive' }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      apiClient.delete(`/api/admin/teams/${teamId}/members/${userId}`),
    onSuccess: () => {
      toast({ title: 'Member removed' });
      queryClient.invalidateQueries({ queryKey: ['admin-team-detail', removeMember?.teamId] });
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setRemoveMember(null);
    },
    onError: (e: Error) => toast({ title: 'Failed to remove member', description: e.message, variant: 'destructive' }),
  });

  const transferMutation = useMutation({
    mutationFn: ({ teamId, newCaptainId }: { teamId: string; newCaptainId: string }) =>
      apiClient.post(`/api/admin/teams/${teamId}/transfer-captain`, { newCaptainId }),
    onSuccess: () => {
      toast({ title: 'Captain transferred' });
      queryClient.invalidateQueries({ queryKey: ['admin-team-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setTransferTarget(null);
    },
    onError: (e: Error) => toast({ title: 'Transfer failed', description: e.message, variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: (body: {
      id: string;
      name?: string;
      tag?: string;
      game?: string;
      description?: string;
      logoUrl?: string;
      removeLogo?: boolean;
    }) => apiClient.put(`/api/admin/teams/${body.id}`, body),
    onSuccess: (_data, variables) => {
      toast({ title: 'Team updated' });
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-team-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'entity-history', 'Team', variables.id] });
      setEditTeam(null);
      setLogoFile(null);
      setLogoPreview(null);
      setRemoveLogo(false);
    },
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const openEditTeam = (team: TeamRow) => {
    setEditTeam(team);
    setEditForm({ name: team.name, tag: team.tag, game: team.game, description: '' });
    setLogoPreview(team.logo_url || null);
    setLogoFile(null);
    setRemoveLogo(false);
  };

  const uploadTeamLogo = async (file: File, teamName: string): Promise<string | null> => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Use JPG, PNG, GIF, or WebP.', variant: 'destructive' });
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Logo must be under 5MB.', variant: 'destructive' });
      return null;
    }

    const folder = teamName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'teams.logos');
    formData.append('folder', folder);

    const result = await apiClient.upload<{ url: string }>('/api/storage/upload', formData);
    return result.url;
  };

  const handleSaveTeamEdit = async () => {
    if (!editTeam) return;
    setIsSavingTeam(true);
    try {
      let logoUrl: string | undefined;
      if (logoFile) {
        const uploaded = await uploadTeamLogo(logoFile, editForm.name || editTeam.name);
        if (!uploaded) return;
        logoUrl = uploaded;
      }

      await editMutation.mutateAsync({
        id: editTeam.id,
        name: editForm.name || undefined,
        tag: editForm.tag || undefined,
        game: editForm.game || undefined,
        description: editForm.description || undefined,
        ...(logoUrl ? { logoUrl } : {}),
        ...(removeLogo ? { removeLogo: true } : {}),
      });
    } finally {
      setIsSavingTeam(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const exportCSV = () => {
    if (!teams.length) { toast({ title: 'Nothing to export', description: 'No teams data available.', variant: 'destructive' }); return; }
    const csv = [
      ['ID', 'Name', 'Tag', 'Game', 'Members', 'Tournaments', 'Wins', 'Owner', 'Created'],
      ...teams.map((t: any) => [t.id, t.name, t.tag, t.game, t.member_count || 0, t.tournament_count || 0, t.wins || 0, t.owner_username || '', t.created_at ? new Date(t.created_at).toLocaleDateString() : ''].map(csvEscape))
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teams_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast({ title: 'Export complete', description: 'Teams CSV downloaded' });
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ── Render ──
  return (
    <AdminPage
      eyebrow="Content"
      title="Teams"
      description="Manage all teams, members, and participation"
      actions={
        <>
          <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </CommandButton>
          <CommandButton variant="ghost" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </CommandButton>
        </>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <CommandMetric label="Real Teams" value={stats.total_teams} icon={<UsersRound className="h-4 w-4" />} />
        <CommandMetric label="Active Teams" value={stats.active_teams} tone="success" icon={<Users className="h-4 w-4" />} />
        <CommandMetric label="Avg Members" value={stats.avg_members || 0} icon={<Users className="h-4 w-4" />} />
        <CommandMetric label="Solo Adapters" value={stats.solo_adapters ?? 0} tone="warning" icon={<Gamepad2 className="h-4 w-4" />} />
        <CommandMetric label="Mock Teams" value={stats.mock_teams ?? 0} icon={<Gamepad2 className="h-4 w-4" />} />
        <CommandMetric label="Orphan Mocks" value={stats.orphan_mock_teams ?? 0} tone="danger" icon={<Gamepad2 className="h-4 w-4" />} />
      </div>

      {/* Search & Filters */}
      <CommandToolbar>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
              placeholder="Search teams by name or tag..."
              className="w-full rounded-none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
          <input
            value={gameFilter}
            onChange={e => { setGameFilter(e.target.value); setPage(0); }}
            placeholder="Filter by game..."
            className="w-full rounded-none border border-white/10 bg-[#0a0a0c]/90 px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 lg:w-48"
          />
        </div>
        <p className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          {total} teams · page {page + 1}/{Math.max(totalPages, 1)}
        </p>
      </CommandToolbar>

      {/* Table */}
      {isLoading ? (
        <CommandSection className="py-16 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-600" />
        </CommandSection>
      ) : teams.length === 0 ? (
        <CommandEmptyState
          title="No teams found"
          description="Teams will appear here once players create or claim them."
          icon={<UsersRound className="h-5 w-5" />}
        />
      ) : (
        <CommandSection className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Game</th>
                  <th className="px-4 py-3 text-center">Members</th>
                  <th className="px-4 py-3 text-center">Tournaments</th>
                  <th className="px-4 py-3 text-center">Wins</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teams.map(team => (
                  <tr key={team.id} className="text-zinc-300 transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt="" loading="lazy" className="h-8 w-8 border border-white/10 object-contain" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center border border-white/10 text-zinc-500">
                            <UsersRound className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white">{team.name}</p>
                          {team.tag && <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">[{team.tag}]</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 border border-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                        <Gamepad2 className="h-3 w-3" /> {team.game || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-zinc-300">{team.member_count}</td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-zinc-300">{team.tournament_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('font-mono font-bold tabular-nums', team.wins > 0 ? 'text-white' : 'text-zinc-600')}>
                        {team.wins}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {team.owner_avatar ? (
                          <img src={team.owner_avatar} alt="" loading="lazy" className="h-5 w-5 rounded-full" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-zinc-700" />
                        )}
                        <span className="text-xs text-zinc-300">{team.owner_username || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">{formatDate(team.created_at)}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="Team actions"
                            title="Team actions"
                            className="flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:border-white/25 hover:text-white"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-white/10 bg-[#0a0a0c]">
                          <DropdownMenuItem onClick={() => { setSelectedTeamId(team.id); setDetailTab('members'); }} className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditTeam(team)} className="text-zinc-300 focus:bg-white/[0.06] focus:text-white">
                            <Pencil className="mr-2 h-4 w-4" /> Edit Team
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => setDisbandTeam(team)} className="text-red-400 focus:bg-red-500/10 focus:text-red-300">
                            <Trash2 className="mr-2 h-4 w-4" /> Disband Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <CommandButton variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  Previous
                </CommandButton>
                <CommandButton variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next
                </CommandButton>
              </div>
            </div>
          )}
        </CommandSection>
      )}

      {/* ── Team Detail Dialog ── */}
      <Dialog open={!!selectedTeamId} onOpenChange={open => { if (!open) setSelectedTeamId(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto overscroll-contain rounded-none border-white/10 bg-[#0a0a0c] text-white" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-zinc-400" />
              {(teamDetail?.team as Record<string, unknown>)?.name as string || 'Team Details'}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
            </div>
          ) : teamDetail ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1 border border-white/10 bg-[#0a0a0c]/92 p-2">
                {DETAIL_TABS.map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setDetailTab(tab.value)}
                    className={`group relative overflow-hidden rounded-none border px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                      detailTab === tab.value
                        ? 'border-transparent bg-rose-500 text-white'
                        : 'border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {tab.label === 'Members' ? `Members (${teamDetail.members.length})`
                      : tab.label === 'Tournaments' ? `Tournaments (${teamDetail.tournaments.length})`
                      : tab.label}
                  </button>
                ))}
              </div>

              {/* Members Tab */}
              {detailTab === 'members' && (
                <div className="space-y-2">
                  {teamDetail.members.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between border border-white/10 bg-white/[0.025] px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" loading="lazy" className="h-8 w-8 rounded-full" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-zinc-700" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{m.username || m.full_name || 'Unknown'}</p>
                          <p className="text-xs text-zinc-500">{m.email}</p>
                        </div>
                        <span className={cn(
                          'ml-2 border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider',
                          m.role === 'captain' ? 'border-amber-500/35 bg-amber-950/20 text-amber-300' : 'border-white/10 text-zinc-400'
                        )}>
                          {m.role === 'captain' && <Crown className="mr-1 inline h-3 w-3" />}
                          {m.role}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {m.role !== 'captain' && (
                          <>
                            <button
                              type="button"
                              title="Make captain"
                              aria-label="Make captain"
                              onClick={() => setTransferTarget({ teamId: selectedTeamId!, member: m })}
                              className="flex h-7 w-7 items-center justify-center border border-white/10 bg-white/[0.03] text-amber-300 transition-colors hover:border-amber-500/40 hover:text-amber-200"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Remove member"
                              aria-label="Remove member"
                              onClick={() => setRemoveMember({ teamId: selectedTeamId!, userId: m.user_id, username: m.username })}
                              className="flex h-7 w-7 items-center justify-center border border-white/10 bg-white/[0.03] text-red-400 transition-colors hover:border-red-500/40 hover:text-red-300"
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tournaments Tab */}
              {detailTab === 'tournaments' && (
                <div className="space-y-2">
                  {teamDetail.tournaments.length === 0 ? (
                    <p className="py-8 text-center text-zinc-500">No tournament participation</p>
                  ) : (
                    teamDetail.tournaments.map(t => (
                      <div key={t.tournament_id} className="flex items-center justify-between border border-white/10 bg-white/[0.025] px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{t.tournament_name}</p>
                          <p className="font-mono text-xs text-zinc-500">{t.game} · {formatDate(t.start_date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.prize_pool && (
                            <span className="font-mono text-xs tabular-nums text-white">{formatCurrency(parseFloat(t.prize_pool?.toString() || '0'), t.currency)}</span>
                          )}
                          <span className={`border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[t.tournament_status] || 'border-white/10 text-zinc-400'}`}>
                            {t.tournament_status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Leaderboard Tab */}
              {detailTab === 'leaderboard' && (
                <div>
                  {teamDetail.leaderboard ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {[
                        { label: 'RP', value: teamDetail.leaderboard.rp },
                        { label: 'Wins', value: teamDetail.leaderboard.wins },
                        { label: 'Losses', value: teamDetail.leaderboard.losses },
                        { label: 'Win Rate', value: `${teamDetail.leaderboard.win_rate}%` },
                        { label: 'Matches', value: teamDetail.leaderboard.matches_played },
                        { label: 'Tournaments Won', value: teamDetail.leaderboard.tournaments_won },
                      ].map(s => (
                        <div key={s.label} className="border border-white/10 bg-white/[0.025] p-4 text-center">
                          <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">{s.label}</p>
                          <p className="font-mono text-xl font-black tabular-nums text-white">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-zinc-500">No match data available</p>
                  )}
                </div>
              )}

              {detailTab === 'history' && (
                <EntityHistoryTimeline targetType="Team" targetId={selectedTeamId!} />
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Disband Confirm Dialog ── */}
      <Dialog open={!!disbandTeam} onOpenChange={open => { if (!open) setDisbandTeam(null); }}>
        <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Disband Team</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete <strong className="text-white">{disbandTeam?.name}</strong> and remove all members, invites, and tournament registrations. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <CommandButton variant="ghost" size="sm" onClick={() => setDisbandTeam(null)}>Cancel</CommandButton>
            <CommandButton
              variant="danger"
              size="sm"
              onClick={() => disbandTeam && disbandMutation.mutate(disbandTeam.id)}
              disabled={disbandMutation.isPending}
            >
              {disbandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Disband
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Member Confirm Dialog ── */}
      <Dialog open={!!removeMember} onOpenChange={open => { if (!open) setRemoveMember(null); }}>
        <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Remove <strong className="text-white">{removeMember?.username}</strong> from this team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <CommandButton variant="ghost" size="sm" onClick={() => setRemoveMember(null)}>Cancel</CommandButton>
            <CommandButton
              variant="danger"
              size="sm"
              onClick={() => removeMember && removeMemberMutation.mutate({ teamId: removeMember.teamId, userId: removeMember.userId })}
              disabled={removeMemberMutation.isPending}
            >
              Remove
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transfer Captain Confirm Dialog ── */}
      <Dialog open={!!transferTarget} onOpenChange={open => { if (!open) setTransferTarget(null); }}>
        <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle>Transfer Captain</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Transfer captain role to <strong className="text-white">{transferTarget?.member.username}</strong>? The current captain will be demoted to member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <CommandButton variant="ghost" size="sm" onClick={() => setTransferTarget(null)}>Cancel</CommandButton>
            <CommandButton
              variant="warning"
              size="sm"
              onClick={() => transferTarget && transferMutation.mutate({ teamId: transferTarget.teamId, newCaptainId: transferTarget.member.user_id })}
              disabled={transferMutation.isPending}
            >
              Transfer
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Team Dialog ── */}
      <Dialog open={!!editTeam} onOpenChange={open => {
        if (!open) {
          setEditTeam(null);
          setLogoFile(null);
          setLogoPreview(null);
          setRemoveLogo(false);
        }
      }}>
        <DialogContent className="rounded-none border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Team Logo</p>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800 font-bold text-zinc-400">
                  {logoPreview && !removeLogo ? (
                    <img src={logoPreview} alt={editForm.name || editTeam?.name || 'Team logo'} className="h-full w-full object-contain" />
                  ) : (
                    (editForm.tag || editTeam?.tag || 'T').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLogoFile(file);
                        setLogoPreview(URL.createObjectURL(file));
                        setRemoveLogo(false);
                      }}
                    />
                    <CommandButton type="button" variant="ghost" size="sm" asChild>
                      <span><Upload className="h-4 w-4" />Upload Logo</span>
                    </CommandButton>
                  </label>
                  {(logoPreview || editTeam?.logo_url) && !removeLogo && (
                    <CommandButton
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        setRemoveLogo(true);
                      }}
                    >
                      <X className="h-4 w-4" />Remove
                    </CommandButton>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Name</p>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Tag</p>
              <input value={editForm.tag} onChange={e => setEditForm(f => ({ ...f, tag: e.target.value }))} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Game</p>
              <input value={editForm.game} onChange={e => setEditForm(f => ({ ...f, game: e.target.value }))} className="w-full rounded-none border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <CommandButton variant="ghost" size="sm" onClick={() => setEditTeam(null)}>Cancel</CommandButton>
            <CommandButton
              size="sm"
              onClick={handleSaveTeamEdit}
              disabled={isSavingTeam || editMutation.isPending}
            >
              {(isSavingTeam || editMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default TeamManagementTool;
