import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { fetchCurrentOrganizationId } from '@/lib/currentOrganization';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, RotateCcw, Clock } from 'lucide-react';
import { OrganizerTournamentCard } from '@/components/organizer/OrganizerTournamentCard';
import { useOrganizerGameAssetsPrefetch } from '@/hooks/useOrganizerGameAssets';
import {
  CommandButton,
  CommandEmptyState,
  CommandHeader,
  CommandPanel,
  CommandShell,
  CommandSection,
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
  status: string;
  team_size: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  currency?: string;
}

interface DeletedTournament {
  id: string;
  name: string;
  game: string;
  deleted_at: string;
  days_remaining: number;
}

const normalizeTournamentRows = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

function sortByNewest<T extends { created_at?: string; start_date?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.created_at || a.start_date || 0).getTime();
    const bTime = new Date(b.created_at || b.start_date || 0).getTime();
    return bTime - aTime;
  });
}

const TournamentList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [restoring, setRestoring] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedActiveIds, setSelectedActiveIds] = useState<Set<string>>(new Set());
  const [selectedDeletedIds, setSelectedDeletedIds] = useState<Set<string>>(new Set());

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<{ id: string; name: string; status: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cascadeWarnings, setCascadeWarnings] = useState<Array<{ entity: string; count: number; description?: string }>>([]);

  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  const { data: tournaments = [], isLoading: loading } = useQuery({
    queryKey: ['organizer-tournaments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const organizationId = await fetchCurrentOrganizationId();
      if (!organizationId) return [];

      const data = await apiClient.get<any[]>(`/api/organizations/${organizationId}/tournaments`);

      return sortByNewest(
        normalizeTournamentRows(data).map((tournament: any) => ({
          id: tournament.id,
          name: tournament.name,
          game: tournament.game,
          date: tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : '',
          time: tournament.start_date ? new Date(tournament.start_date).toTimeString().split(' ')[0] : '',
          venue: tournament.venue_id ? `Venue ${tournament.venue_id}` : 'Online',
          max_participants: tournament.max_teams ?? tournament.max_participants ?? 0,
          current_participants: tournament.current_participants ?? tournament.participant_count ?? 0,
          prize_pool: tournament.prize_pool?.toString() || '0',
          user_id: user.id,
          entry_fee: tournament.entry_fee?.toString() || 'Free',
          is_online: !tournament.venue_id,
          image_url: tournament.banner_url || undefined,
          slug: tournament.slug,
          status: (tournament.status || 'draft') as Tournament['status'],
          team_size: tournament.team_size || 1,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          created_at: tournament.created_at,
          currency: tournament.currency,
        })),
      );
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const { data: deletedTournaments = [], isLoading: loadingDeleted } = useQuery({
    queryKey: ['organizer-deleted-tournaments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const organizationId = await fetchCurrentOrganizationId();
      if (!organizationId) return [];

      const data = await apiClient.get<any[]>(`/api/organizations/${organizationId}/tournaments?deleted=true`);

      return sortByNewest(
        normalizeTournamentRows(data).map((t: any) => {
          const deletedDate = new Date(t.deleted_at);
          const now = new Date();
          const diffTime = 7 * 24 * 60 * 60 * 1000 - (now.getTime() - deletedDate.getTime());
          const daysRemaining = Math.max(0, Math.ceil(diffTime / (24 * 60 * 60 * 1000)));
          return {
            id: t.id,
            name: t.name,
            game: t.game,
            deleted_at: t.deleted_at,
            created_at: t.created_at,
            days_remaining: daysRemaining,
          };
        }),
      );
    },
    enabled: !!user?.id && activeTab === 'deleted',
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const refreshLists = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['organizer-tournaments'] });
    queryClient.invalidateQueries({ queryKey: ['organizer-deleted-tournaments'] });
    queryClient.invalidateQueries({ queryKey: ['browse-tournaments'] });
  }, [queryClient]);

  const toggleActiveSelect = useCallback((id: string) => {
    setSelectedActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleDeletedSelect = useCallback((id: string) => {
    setSelectedDeletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allActiveSelected = tournaments.length > 0 && selectedActiveIds.size === tournaments.length;
  const allDeletedSelected = deletedTournaments.length > 0 && selectedDeletedIds.size === deletedTournaments.length;

  const tournamentGames = useMemo(() => tournaments.map((t) => t.game), [tournaments]);
  useOrganizerGameAssetsPrefetch(tournamentGames);

  const tournamentsRef = useRef(tournaments);
  tournamentsRef.current = tournaments;

  const handleDeleteClick = useCallback(async (tournamentId: string, tournamentName: string, status: string) => {
    try {
      const participantsResult = await apiClient
        .get<any>(`/api/tournaments/${tournamentId}/participants?count_only=true`)
        .catch(() => ({ count: 0 }));

      const warnings = [];
      if (participantsResult.count && participantsResult.count > 0) {
        warnings.push({
          entity: 'participant',
          count: participantsResult.count,
          description: 'will be removed from this tournament',
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
  }, [toast]);

  const requestDelete = useCallback((id: string) => {
    const tournament = tournamentsRef.current.find((t) => t.id === id);
    if (tournament) {
      void handleDeleteClick(tournament.id, tournament.name, tournament.status);
    }
  }, [handleDeleteClick]);

  const handleDeleteConfirm = async () => {
    if (!tournamentToDelete) return;

    try {
      setDeleteLoading(true);
      await apiClient.put(`/api/tournaments/${tournamentToDelete.id}`, { deletedAt: new Date().toISOString() });

      toast({
        title: 'Tournament deleted',
        description: `${tournamentToDelete.name} has been moved to deleted tournaments. You can restore it within 7 days.`,
      });

      setSelectedActiveIds((prev) => {
        const next = new Set(prev);
        next.delete(tournamentToDelete.id);
        return next;
      });
      refreshLists();
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

  const handleBatchSoftDelete = async () => {
    if (selectedActiveIds.size === 0) return;

    try {
      setBatchDeleteLoading(true);
      const ids = Array.from(selectedActiveIds);
      const deletedAt = new Date().toISOString();
      await Promise.all(ids.map((id) => apiClient.put(`/api/tournaments/${id}`, { deletedAt })));

      toast({
        title: 'Tournaments deleted',
        description: `${ids.length} tournament${ids.length === 1 ? '' : 's'} moved to deleted.`,
      });

      setSelectedActiveIds(new Set());
      setBatchDeleteOpen(false);
      refreshLists();
    } catch (error: any) {
      console.error('Error batch deleting tournaments:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete selected tournaments',
        variant: 'destructive',
      });
    } finally {
      setBatchDeleteLoading(false);
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

      setSelectedDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
      });
      refreshLists();
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

  const handleBatchRestore = async () => {
    if (selectedDeletedIds.size === 0) return;

    try {
      setRestoring('batch');
      const ids = Array.from(selectedDeletedIds);
      await Promise.all(
        ids.map((id) => apiClient.put(`/api/tournaments/${id}`, { clearDeletedAt: true, status: 'open' })),
      );

      toast({
        title: 'Tournaments restored',
        description: `${ids.length} tournament${ids.length === 1 ? '' : 's'} restored.`,
      });

      setSelectedDeletedIds(new Set());
      refreshLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore selected tournaments',
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

      setSelectedDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
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

  const handleBatchPermanentDelete = async () => {
    if (selectedDeletedIds.size === 0) return;
    const count = selectedDeletedIds.size;
    if (!confirm(`Permanently delete ${count} tournament${count === 1 ? '' : 's'}? This cannot be undone.`)) {
      return;
    }

    try {
      setRestoring('batch');
      const ids = Array.from(selectedDeletedIds);
      await Promise.all(ids.map((id) => apiClient.delete(`/api/tournaments/${id}`)));

      toast({
        title: 'Tournaments permanently deleted',
        description: `${count} tournament${count === 1 ? '' : 's'} removed.`,
      });

      setSelectedDeletedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['organizer-deleted-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-tournaments'] });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to permanently delete selected tournaments',
        variant: 'destructive',
      });
    } finally {
      setRestoring(null);
    }
  };

  const selectionToolbar = useMemo(() => {
    if (activeTab === 'active' && tournaments.length > 0) {
      return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-none border border-white/10 bg-[#0a0a0c]/80 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
            <Checkbox
              checked={allActiveSelected}
              onCheckedChange={(checked) => {
                if (checked) setSelectedActiveIds(new Set(tournaments.map((t) => t.id)));
                else setSelectedActiveIds(new Set());
              }}
              aria-label="Select all hosted tournaments"
            />
            <span>Select all ({tournaments.length})</span>
            {selectedActiveIds.size > 0 && (
              <span className="text-rose-300">{selectedActiveIds.size} selected</span>
            )}
          </label>
          {selectedActiveIds.size > 0 && (
            <CommandButton
              size="sm"
              variant="danger"
              onClick={() => setBatchDeleteOpen(true)}
            >
              Delete selected ({selectedActiveIds.size})
            </CommandButton>
          )}
        </div>
      );
    }

    if (activeTab === 'deleted' && deletedTournaments.length > 0) {
      return (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-none border border-white/10 bg-[#0a0a0c]/80 px-4 py-3">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
            <Checkbox
              checked={allDeletedSelected}
              onCheckedChange={(checked) => {
                if (checked) setSelectedDeletedIds(new Set(deletedTournaments.map((t) => t.id)));
                else setSelectedDeletedIds(new Set());
              }}
              aria-label="Select all deleted tournaments"
            />
            <span>Select all ({deletedTournaments.length})</span>
            {selectedDeletedIds.size > 0 && (
              <span className="text-rose-300">{selectedDeletedIds.size} selected</span>
            )}
          </label>
          {selectedDeletedIds.size > 0 && (
            <div className="flex flex-wrap gap-2">
              <CommandButton
                size="sm"
                variant="success"
                onClick={handleBatchRestore}
                disabled={restoring === 'batch'}
              >
                Restore selected ({selectedDeletedIds.size})
              </CommandButton>
              <CommandButton
                size="sm"
                variant="danger"
                onClick={handleBatchPermanentDelete}
                disabled={restoring === 'batch'}
              >
                Delete forever ({selectedDeletedIds.size})
              </CommandButton>
            </div>
          )}
        </div>
      );
    }

    return null;
  }, [
    activeTab,
    allActiveSelected,
    allDeletedSelected,
    deletedTournaments,
    handleBatchPermanentDelete,
    handleBatchRestore,
    restoring,
    selectedActiveIds.size,
    selectedDeletedIds.size,
    tournaments,
  ]);

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
          description="Newest tournaments first. Select multiple events to delete or restore in bulk."
          actions={
            <CommandButton asChild>
              <Link to="/tournaments/create">Create Tournament</Link>
            </CommandButton>
          }
        />

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as 'active' | 'deleted');
            setSelectedActiveIds(new Set());
            setSelectedDeletedIds(new Set());
          }}
          className="w-full"
        >
          <TabsList className="mb-6 h-auto rounded-none border border-white/10 bg-[#0a0a0c]/92 p-2">
            <TabsTrigger value="active" className="rounded-none data-[state=active]:bg-rose-500 data-[state=active]:text-white">
              Hosted Tournaments ({tournaments.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="rounded-none text-red-300 data-[state=active]:bg-rose-500 data-[state=active]:text-white">
              <Trash2 className="mr-2 h-4 w-4" />
              Deleted ({deletedTournaments.length})
            </TabsTrigger>
          </TabsList>

          {selectionToolbar}

          <TabsContent value="active">
            {tournaments.length === 0 ? (
              <CommandEmptyState
                title="No hosted tournaments found"
                description="Create your first tournament and it will appear here."
                icon={<Clock className="h-5 w-5" />}
                action={<CommandButton asChild><Link to="/tournaments/create">Create Tournament</Link></CommandButton>}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                {tournaments.map((tournament) => (
                  <OrganizerTournamentCard
                    key={tournament.id}
                    id={tournament.id}
                    name={tournament.name}
                    game={tournament.game}
                    slug={tournament.slug || ''}
                    status={tournament.status}
                    max_participants={tournament.max_participants}
                    current_participants={tournament.current_participants}
                    prize_pool={tournament.prize_pool}
                    entry_fee={tournament.entry_fee || 'Free'}
                    is_online={tournament.is_online ?? false}
                    image_url={tournament.image_url || undefined}
                    start_date={tournament.start_date}
                    created_at={tournament.created_at}
                    selectable
                    selected={selectedActiveIds.has(tournament.id)}
                    onToggleSelect={toggleActiveSelect}
                    onDelete={requestDelete}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deleted">
            {loadingDeleted ? (
              <div className="py-16 text-center text-zinc-500">Loading deleted tournaments...</div>
            ) : deletedTournaments.length === 0 ? (
              <CommandEmptyState
                title="No deleted tournaments"
                description="Deleted tournaments will appear here while they can still be restored."
                icon={<Trash2 className="h-5 w-5" />}
              />
            ) : (
              <div className="space-y-4">
                <div className="mb-6 rounded-none border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm text-amber-200">
                    <Clock className="mr-2 inline h-4 w-4" />
                    Deleted tournaments will be permanently removed after 7 days. Restore them before the deadline to keep your data.
                  </p>
                </div>

                {deletedTournaments.map((tournament) => (
                  <CommandPanel key={tournament.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedDeletedIds.has(tournament.id)}
                        onCheckedChange={() => toggleDeletedSelect(tournament.id)}
                        aria-label={`Select ${tournament.name}`}
                        className="mt-1"
                      />
                      <div>
                        <h3 className="font-semibold text-white">{tournament.name}</h3>
                        <p className="text-sm text-gray-400">{tournament.game}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant={tournament.days_remaining <= 2 ? 'destructive' : 'secondary'}>
                            <Clock className="mr-1 h-3 w-3" />
                            {tournament.days_remaining} {tournament.days_remaining === 1 ? 'day' : 'days'} left to restore
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <CommandButton
                        size="sm"
                        variant="success"
                        onClick={() => handleRestore(tournament.id, tournament.name)}
                        disabled={restoring === tournament.id || restoring === 'batch'}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {restoring === tournament.id ? 'Restoring...' : 'Restore'}
                      </CommandButton>
                      <CommandButton
                        size="sm"
                        variant="danger"
                        onClick={() => handlePermanentDelete(tournament.id, tournament.name)}
                        disabled={restoring === tournament.id || restoring === 'batch'}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
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

      <DeleteConfirmationModal
        isOpen={batchDeleteOpen}
        onClose={() => setBatchDeleteOpen(false)}
        onConfirm={handleBatchSoftDelete}
        entityType="tournament"
        entityName={`${selectedActiveIds.size} selected tournaments`}
        isDeleting={batchDeleteLoading}
        cascadeWarnings={[]}
        requireNameConfirmation={false}
        customWarning="Selected tournaments will move to the Deleted tab and can be restored within 7 days."
      />
    </CommandShell>
  );
};

export default TournamentList;
