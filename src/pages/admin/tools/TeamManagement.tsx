import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ArrowLeft, UsersRound, Search, Eye, MoreVertical, Calendar,
  Users, Trophy, RefreshCw, Trash2, UserMinus, ArrowRightLeft,
  Pencil, Shield, Loader2, Gamepad2, Globe, Crown, X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  stats: { total_teams: number; active_teams: number; avg_members: number };
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
  const [detailTab, setDetailTab] = useState<'members' | 'tournaments' | 'leaderboard'>('members');

  // Confirm dialogs
  const [disbandTeam, setDisbandTeam] = useState<TeamRow | null>(null);
  const [removeMember, setRemoveMember] = useState<{ teamId: string; userId: string; username: string } | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ teamId: string; member: TeamMember } | null>(null);
  const [editTeam, setEditTeam] = useState<TeamRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', tag: '', game: '', description: '' });

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
    mutationFn: ({ id, ...body }: { id: string; name?: string; tag?: string; game?: string; description?: string }) =>
      apiClient.put(`/api/admin/teams/${id}`, body),
    onSuccess: () => {
      toast({ title: 'Team updated' });
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      queryClient.invalidateQueries({ queryKey: ['admin-team-detail'] });
      setEditTeam(null);
    },
    onError: (e: Error) => toast({ title: 'Update failed', description: e.message, variant: 'destructive' }),
  });

  const totalPages = Math.ceil(total / limit);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <UsersRound className="w-6 h-6 text-cyan-500" />
              Team Management
            </h1>
            <p className="text-zinc-400 text-sm">Manage all teams, members, and participation</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="border-white/10 text-white hover:bg-white/5">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Teams', value: stats.total_teams, icon: UsersRound, color: 'cyan' },
          { label: 'Active Teams', value: stats.active_teams, icon: Users, color: 'emerald' },
          { label: 'Avg Members', value: stats.avg_members || 0, icon: Users, color: 'amber' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-[#0a0a0c] p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${s.color}-500/10`}>
                <s.icon className={`w-5 h-5 text-${s.color}-500`} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search teams by name or tag..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            className="pl-10 bg-black/40 border-white/10 text-white"
          />
        </div>
        <Input
          placeholder="Filter by game..."
          value={gameFilter}
          onChange={e => { setGameFilter(e.target.value); setPage(0); }}
          className="w-full sm:w-48 bg-black/40 border-white/10 text-white"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <UsersRound className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No teams found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Team</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Game</th>
                  <th className="text-center px-4 py-3 text-zinc-500 font-medium">Members</th>
                  <th className="text-center px-4 py-3 text-zinc-500 font-medium">Tournaments</th>
                  <th className="text-center px-4 py-3 text-zinc-500 font-medium">Wins</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Owner</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {teams.map(team => (
                  <tr key={team.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                            <UsersRound className="w-4 h-4 text-cyan-500" />
                          </div>
                        )}
                        <div>
                          <p className="text-white font-medium">{team.name}</p>
                          {team.tag && <p className="text-xs text-zinc-500">[{team.tag}]</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs border-white/10 text-zinc-400">
                        <Gamepad2 className="w-3 h-3 mr-1" /> {team.game || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-300">{team.member_count}</td>
                    <td className="px-4 py-3 text-center text-zinc-300">{team.tournament_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("font-medium", team.wins > 0 ? "text-emerald-400" : "text-zinc-500")}>
                        {team.wins}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {team.owner_avatar ? (
                          <img src={team.owner_avatar} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-700" />
                        )}
                        <span className="text-zinc-300 text-xs">{team.owner_username || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{formatDate(team.created_at)}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#121214] border-white/10">
                          <DropdownMenuItem onClick={() => { setSelectedTeamId(team.id); setDetailTab('members'); }} className="text-zinc-300">
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditTeam(team); setEditForm({ name: team.name, tag: team.tag, game: team.game, description: '' }); }} className="text-zinc-300">
                            <Pencil className="w-4 h-4 mr-2" /> Edit Team
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => setDisbandTeam(team)} className="text-red-400 focus:text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" /> Disband Team
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-zinc-500">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="border-white/10 text-white text-xs">
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="border-white/10 text-white text-xs">
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Team Detail Dialog ── */}
      <Dialog open={!!selectedTeamId} onOpenChange={open => { if (!open) setSelectedTeamId(null); }}>
        <DialogContent className="max-w-2xl bg-[#0a0a0c] border-white/10 text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-cyan-500" />
              {(teamDetail?.team as Record<string, unknown>)?.name as string || 'Team Details'}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            </div>
          ) : teamDetail ? (
            <Tabs value={detailTab} onValueChange={v => setDetailTab(v as typeof detailTab)}>
              <TabsList className="bg-white/5 border border-white/5">
                <TabsTrigger value="members" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  Members ({teamDetail.members.length})
                </TabsTrigger>
                <TabsTrigger value="tournaments" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  Tournaments ({teamDetail.tournaments.length})
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                  Leaderboard
                </TabsTrigger>
              </TabsList>

              {/* Members Tab */}
              <TabsContent value="members" className="space-y-2 mt-4">
                {teamDetail.members.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center gap-3">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700" />
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{m.username || m.full_name || 'Unknown'}</p>
                        <p className="text-xs text-zinc-500">{m.email}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-xs ml-2",
                        m.role === 'captain' ? 'border-amber-500/30 text-amber-400' : 'border-white/10 text-zinc-400'
                      )}>
                        {m.role === 'captain' && <Crown className="w-3 h-3 mr-1" />}
                        {m.role}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {m.role !== 'captain' && (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-amber-400 hover:bg-amber-500/10"
                            title="Make captain"
                            onClick={() => setTransferTarget({ teamId: selectedTeamId!, member: m })}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-red-400 hover:bg-red-500/10"
                            title="Remove member"
                            onClick={() => setRemoveMember({ teamId: selectedTeamId!, userId: m.user_id, username: m.username })}
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Tournaments Tab */}
              <TabsContent value="tournaments" className="space-y-2 mt-4">
                {teamDetail.tournaments.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No tournament participation</p>
                ) : (
                  teamDetail.tournaments.map(t => (
                    <div key={t.tournament_id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{t.tournament_name}</p>
                        <p className="text-xs text-zinc-500">{t.game} · {formatDate(t.start_date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.prize_pool && (
                          <span className="text-xs text-emerald-400 font-mono">${t.prize_pool}</span>
                        )}
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          t.tournament_status === 'completed' ? 'border-emerald-500/30 text-emerald-400' :
                          t.tournament_status === 'ongoing' ? 'border-amber-500/30 text-amber-400' :
                          'border-white/10 text-zinc-400'
                        )}>
                          {t.tournament_status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard" className="mt-4">
                {teamDetail.leaderboard ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'RP', value: teamDetail.leaderboard.rp, color: 'text-cyan-400' },
                      { label: 'Wins', value: teamDetail.leaderboard.wins, color: 'text-emerald-400' },
                      { label: 'Losses', value: teamDetail.leaderboard.losses, color: 'text-red-400' },
                      { label: 'Win Rate', value: `${teamDetail.leaderboard.win_rate}%`, color: 'text-amber-400' },
                      { label: 'Matches', value: teamDetail.leaderboard.matches_played, color: 'text-white' },
                      { label: 'Tournaments Won', value: teamDetail.leaderboard.tournaments_won, color: 'text-emerald-400' },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
                        <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                        <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-center py-8">No match data available</p>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Disband Confirm Dialog ── */}
      <Dialog open={!!disbandTeam} onOpenChange={open => { if (!open) setDisbandTeam(null); }}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Disband Team</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete <strong className="text-white">{disbandTeam?.name}</strong> and remove all members, invites, and tournament registrations. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDisbandTeam(null)} className="border-white/10 text-white">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => disbandTeam && disbandMutation.mutate(disbandTeam.id)}
              disabled={disbandMutation.isPending}
            >
              {disbandMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Disband
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Member Confirm Dialog ── */}
      <Dialog open={!!removeMember} onOpenChange={open => { if (!open) setRemoveMember(null); }}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Remove <strong className="text-white">{removeMember?.username}</strong> from this team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRemoveMember(null)} className="border-white/10 text-white">Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => removeMember && removeMemberMutation.mutate({ teamId: removeMember.teamId, userId: removeMember.userId })}
              disabled={removeMemberMutation.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Transfer Captain Confirm Dialog ── */}
      <Dialog open={!!transferTarget} onOpenChange={open => { if (!open) setTransferTarget(null); }}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Transfer Captain</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Transfer captain role to <strong className="text-white">{transferTarget?.member.username}</strong>? The current captain will be demoted to member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTransferTarget(null)} className="border-white/10 text-white">Cancel</Button>
            <Button
              onClick={() => transferTarget && transferMutation.mutate({ teamId: transferTarget.teamId, newCaptainId: transferTarget.member.user_id })}
              disabled={transferMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Team Dialog ── */}
      <Dialog open={!!editTeam} onOpenChange={open => { if (!open) setEditTeam(null); }}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase">Name</label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="bg-black/40 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase">Tag</label>
              <Input value={editForm.tag} onChange={e => setEditForm(f => ({ ...f, tag: e.target.value }))} className="bg-black/40 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase">Game</label>
              <Input value={editForm.game} onChange={e => setEditForm(f => ({ ...f, game: e.target.value }))} className="bg-black/40 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTeam(null)} className="border-white/10 text-white">Cancel</Button>
            <Button
              onClick={() => editTeam && editMutation.mutate({
                id: editTeam.id,
                name: editForm.name || undefined,
                tag: editForm.tag || undefined,
                game: editForm.game || undefined,
              })}
              disabled={editMutation.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagementTool;
