import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMeRoles, getOrganizationId } from '@/lib/meRoles';
import esportsGames from '@/data/esportsGames.json';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { Trash2, RotateCcw, Clock } from 'lucide-react';

import { TournamentCard } from '@/components/TournamentCard';
import {
  CommandButton,
  CommandEmptyState,
  CommandHeader,
  CommandPanel,
  CommandSection,
  CommandShell,
  CommandTabs,
} from '@/components/management/CommandSurface';

interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  current_participants: number;
  prize_pool: string;
  user_id: string;
  entry_fee: string | null;
  is_online: boolean | null;
  image_url: string | null;
  slug: string | null;
  deleted_at?: string | null;
  start_date?: string;
  end_date?: string;
}

interface DeletedTournament {
  id: string;
  name: string;
  game: string;
  deleted_at: string;
  days_remaining: number;
}

const getCurrentOrganization = async () => {
  const roles = await fetchMeRoles().catch(() => null);
  const roleOrgId = getOrganizationId(roles);

  const mine = await apiClient.get<any>('/api/organizations/mine').catch(() => null);
  if (mine?.id) return mine;

  const me = await apiClient.get<any>('/api/organizations/me').catch(() => null);
  if (me?.id) return me;

  if (roleOrgId) return { id: roleOrgId };
  return null;
};

const normalizeTournamentRows = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const TournamentList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [restoring, setRestoring] = useState<string | null>(null);
  const { toast } = useToast();

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<{ id: string; name: string; status: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cascadeWarnings, setCascadeWarnings] = useState<Array<{ entity: string; count: number; description?: string }>>([]);

  // Fetch Tournaments - Optimized N+1 Query Fix
  const { data: tournaments = [], isLoading: loading } = useQuery({
    queryKey: ['organizer-tournaments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const orgData = await getCurrentOrganization();

      if (!orgData?.id) return [];

      const data = await apiClient.get<any[]>(`/api/organizations/${orgData.id}/tournaments`);

      return normalizeTournamentRows(data).map((tournament: any) => ({
        id: tournament.id,
        name: tournament.name,
        game: tournament.game,
        date: tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : '',
        time: tournament.start_date ? new Date(tournament.start_date).toTimeString().split(' ')[0] : '',
        venue: tournament.venue_id ? `Venue ${tournament.venue_id}` : 'Online',
        max_participants: tournament.max_teams ?? tournament.max_participants ?? 0,
        current_participants: tournament.current_participants ?? tournament.participant_count ?? tournament.tournament_participants?.[0]?.count ?? 0,
        prize_pool: tournament.prize_pool?.toString() || '0',
        user_id: user.id, // Current user is organization owner here
        entry_fee: tournament.entry_fee?.toString() || 'Free',
        is_online: !tournament.venue_id,
        image_url: tournament.banner_url || undefined,
        slug: tournament.slug,
        status: (tournament.status || 'draft') as 'draft' | 'published' | 'open' | 'closed' | 'ongoing' | 'completed' | 'cancelled',
        team_size: tournament.team_size || 1, // fallback default
        start_date: tournament.start_date,
        end_date: tournament.end_date,
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false
  });

  // Fetch Deleted Tournaments
  const { data: deletedTournaments = [] } = useQuery({
    queryKey: ['organizer-deleted-tournaments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const orgData = await getCurrentOrganization();

      if (!orgData?.id) return [];

      const data = await apiClient.get<any[]>(`/api/organizations/${orgData.id}/tournaments?deleted=true`);

      return normalizeTournamentRows(data).map((t: any) => {
        const deletedDate = new Date(t.deleted_at);
        const now = new Date();
        const diffTime = 7 * 24 * 60 * 60 * 1000 - (now.getTime() - deletedDate.getTime());
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (24 * 60 * 60 * 1000)));
        return {
          id: t.id,
          name: t.name,
          game: t.game,
          deleted_at: t.deleted_at,
          days_remaining: daysRemaining,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false
  });



  const handleDeleteClick = async (tournamentId: string, tournamentName: string, status: string) => {
    try {
      // Query cascade effects
      // Query cascade effects
      const [participantsResult] = await Promise.all([
        apiClient.get<any>(`/api/tournaments/${tournamentId}/participants?count_only=true`).catch(() => ({ count: 0 })),
      ]);

      const warnings = [];
      if (participantsResult.count && participantsResult.count > 0) {
        warnings.push({
          entity: 'participant',
          count: participantsResult.count,
          description: 'will be removed from this tournament'
        });
      }

      setCascadeWarnings(warnings);
      setTournamentToDelete({ id: tournamentId, name: tournamentName, status });
      setDeleteModalOpen(true);
    } catch (error) {
      console.error('Error checking cascade effects:', error);
      toast({
        title: 'Error',
        description: 'Failed to check tournament data',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tournamentToDelete) return;

    try {
      setDeleteLoading(true);

      // Soft delete: set deleted_at timestamp
      await apiClient.put(`/api/tournaments/${tournamentToDelete.id}`, { deletedAt: new Date().toISOString() });

      toast({
        title: 'Tournament deleted',
        description: `${tournamentToDelete.name} has been moved to deleted tournaments. You can restore it within 7 days.`,
      });

      // Refresh all tournament lists (organizer + browse page)
      queryClient.invalidateQueries({ queryKey: ['organizer-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['organizer-deleted-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-tournaments'] });
      setDeleteModalOpen(false);
      setTournamentToDelete(null);
      setCascadeWarnings([]);
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tournament',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (tournamentId: string, tournamentName: string) => {
    try {
      setRestoring(tournamentId);

      await apiClient.put(`/api/tournaments/${tournamentId}`, { clearDeletedAt: true, status: 'open' });

      toast({
        title: 'Tournament restored',
        description: `${tournamentName} has been restored successfully.`,
      });

      // Refresh all tournament lists (organizer + browse page)
      queryClient.invalidateQueries({ queryKey: ['organizer-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['organizer-deleted-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-tournaments'] });
    } catch (error: any) {
      console.error('Error restoring tournament:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore tournament',
        variant: 'destructive',
      });
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = async (tournamentId: string, tournamentName: string) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete "${tournamentName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setRestoring(tournamentId);

      await apiClient.delete(`/api/tournaments/${tournamentId}`);

      toast({
        title: 'Tournament permanently deleted',
        description: `${tournamentName} has been permanently removed.`,
      });

      queryClient.invalidateQueries({ queryKey: ['organizer-deleted-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-tournaments'] });
    } catch (error: any) {
      console.error('Error permanently deleting tournament:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete tournament',
        variant: 'destructive',
      });
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <CommandShell>
        <div className="mx-auto max-w-7xl px-4 py-10">
          <CommandSection>
            <div className="py-16 text-center text-zinc-500">Loading tournaments...</div>
          </CommandSection>
        </div>
      </CommandShell>
    );
  }

  return (
    <CommandShell>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <CommandHeader
          eyebrow="Tournament Ops"
          title="Manage Tournaments"
          description="Manage every tournament hosted by your organization, including recently deleted events."
          actions={
            <CommandButton asChild>
              <Link to="/tournaments/create">Create Tournament</Link>
            </CommandButton>
          }
        />

        <Tabs defaultValue="active" className="w-full">
          <CommandTabs
            active="active"
            onChange={() => undefined}
            tabs={[
              { value: 'active', label: `Hosted (${tournaments.length})` },
              { value: 'deleted', label: `Deleted (${deletedTournaments.length})` },
            ]}
            className="mb-6 hidden"
          />
          <TabsList className="mb-6 h-auto rounded-none border border-white/10 bg-[#0a0a0c]/92 p-2">
            <TabsTrigger value="active" className="rounded-none data-[state=active]:bg-rose-500 data-[state=active]:text-white">
              Hosted Tournaments ({tournaments.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="rounded-none text-red-300 data-[state=active]:bg-rose-500 data-[state=active]:text-white">
              <Trash2 className="w-4 h-4 mr-2" />
              Deleted ({deletedTournaments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {tournaments.length === 0 ? (
              <CommandEmptyState
                title="No hosted tournaments found"
                description="Create your first tournament and it will appear here."
                icon={<Clock className="h-5 w-5" />}
                action={<CommandButton asChild><Link to="/tournaments/create">Create Tournament</Link></CommandButton>}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    id={tournament.id}
                    name={tournament.name}
                    game={tournament.game}
                    date={tournament.date}
                    time={tournament.time}
                    venue={tournament.venue}
                    max_participants={tournament.max_participants}
                    current_participants={tournament.current_participants}
                    status={tournament.status}
                    team_size={tournament.team_size}
                    prize_pool={tournament.prize_pool}
                    user_id={tournament.user_id}
                    entry_fee={tournament.entry_fee || 'Free'}
                    is_online={tournament.is_online ?? false}
                    image_url={tournament.image_url || undefined}
                    currentUserId={user?.id}
                    slug={tournament.slug || ''}
                    start_date={tournament.start_date}
                    end_date={tournament.end_date}
                    currency={tournament.currency}
                    onDelete={() => handleDeleteClick(tournament.id, tournament.name, tournament.status)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deleted">
            {deletedTournaments.length === 0 ? (
              <CommandEmptyState title="No deleted tournaments" description="Deleted tournaments will appear here while they can still be restored." icon={<Trash2 className="h-5 w-5" />} />
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-none p-4 mb-6">
                  <p className="text-sm text-amber-200">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Deleted tournaments will be permanently removed after 7 days. Restore them before the deadline to keep your data.
                  </p>
                </div>

                {deletedTournaments.map((tournament) => (
                  <CommandPanel key={tournament.id} className="flex items-center justify-between p-4">
                      <div>
                        <h3 className="font-semibold text-white">{tournament.name}</h3>
                        <p className="text-sm text-gray-400">{tournament.game}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={tournament.days_remaining <= 2 ? 'destructive' : 'secondary'}>
                            <Clock className="w-3 h-3 mr-1" />
                            {tournament.days_remaining} {tournament.days_remaining === 1 ? 'day' : 'days'} left to restore
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <CommandButton
                          size="sm"
                          variant="success"
                          onClick={() => handleRestore(tournament.id, tournament.name)}
                          disabled={restoring === tournament.id}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {restoring === tournament.id ? 'Restoring...' : 'Restore'}
                        </CommandButton>
                        <CommandButton
                          size="sm"
                          variant="danger"
                          onClick={() => handlePermanentDelete(tournament.id, tournament.name)}
                          disabled={restoring === tournament.id}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Forever
                        </CommandButton>
                      </div>
                  </CommandPanel>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Modal */}
      {tournamentToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setTournamentToDelete(null);
            setCascadeWarnings([]);
          }}
          onConfirm={handleDeleteConfirm}
          entityType="tournament"
          entityName={tournamentToDelete.name}
          isDeleting={deleteLoading}
          cascadeWarnings={cascadeWarnings}
          requireNameConfirmation={cascadeWarnings.length > 0 || tournamentToDelete.status !== 'upcoming'}
          customWarning={
            tournamentToDelete.status === 'ongoing'
              ? 'This tournament is currently ongoing. Deleting it will affect all participants.'
              : tournamentToDelete.status === 'completed'
                ? 'This tournament is completed. All historical data will be preserved but hidden.'
                : undefined
          }
        />
      )}
    </CommandShell>
  );
};

export default TournamentList;
