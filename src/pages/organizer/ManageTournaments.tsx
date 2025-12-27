import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import esportsGames from '@/data/esportsGames.json';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { Trash2, RotateCcw, Clock } from 'lucide-react';

import { TournamentCard } from '@/components/TournamentCard';

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
}

interface DeletedTournament {
  id: string;
  name: string;
  game: string;
  deleted_at: string;
  days_remaining: number;
}

const TournamentList = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<(Tournament & { status: 'upcoming' | 'ongoing' | 'completed', team_size: number })[]>([]);
  const [deletedTournaments, setDeletedTournaments] = useState<DeletedTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);
  const { toast } = useToast();

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState<{ id: string; name: string; status: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cascadeWarnings, setCascadeWarnings] = useState<Array<{ entity: string; count: number; description?: string }>>([]);

  useEffect(() => {
    fetchTournaments();
    fetchDeletedTournaments();
  }, [user]);

  const fetchTournaments = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, game, start_date, end_date, venue_id, max_teams, prize_pool, organizer_id, entry_fee, is_public, banner_url, logo_url, slug, description, deleted_at')
        .eq('organizer_id', user.id)
        .is('deleted_at', null)  // Only fetch non-deleted tournaments
        .order('start_date', { ascending: true });

      if (error) throw error;

      // Fetch participant count for each tournament
      const tournamentsWithCounts = await Promise.all(
        (data || []).map(async (tournament: any) => {
          const { count } = await supabase
            .from('tournament_participants')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tournament.id);

          // Compute status dynamically
          const now = new Date();
          const start = new Date(tournament.start_date);
          const end = tournament.end_date ? new Date(tournament.end_date) : null;

          let computedStatus: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
          if (now >= start) {
            if (end && now > end) {
              computedStatus = 'completed';
            } else {
              computedStatus = 'ongoing';
            }
          }

          return {
            id: tournament.id,
            name: tournament.name,
            game: tournament.game,
            date: tournament.start_date ? new Date(tournament.start_date).toISOString().split('T')[0] : '',
            time: tournament.start_date ? new Date(tournament.start_date).toTimeString().split(' ')[0] : '',
            venue: tournament.venue_id ? `Venue ${tournament.venue_id}` : 'Online',
            max_participants: tournament.max_teams,
            current_participants: count || 0,
            prize_pool: tournament.prize_pool?.toString() || '0',
            user_id: tournament.organizer_id,
            entry_fee: tournament.entry_fee?.toString() || 'Free',
            is_online: !tournament.venue_id,
            image_url: tournament.banner_url || tournament.logo_url,
            slug: tournament.slug,
            status: computedStatus,
            team_size: 1, // fallback default
          };
        })
      );

      setTournaments(tournamentsWithCounts as (Tournament & { status: 'upcoming' | 'ongoing' | 'completed', team_size: number })[]);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournaments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedTournaments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, game, deleted_at')
        .eq('organizer_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;

      const deletedWithDays = (data || []).map((t: any) => {
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

      setDeletedTournaments(deletedWithDays);
    } catch (error) {
      console.error('Error fetching deleted tournaments:', error);
    }
  };

  const handleDeleteClick = async (tournamentId: string, tournamentName: string, status: string) => {
    try {
      // Query cascade effects
      const [participantsResult, matchesResult] = await Promise.all([
        supabase
          .from('tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId),
        supabase
          .from('tournament_matches')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', tournamentId),
      ]);

      const warnings = [];
      if (participantsResult.count && participantsResult.count > 0) {
        warnings.push({
          entity: 'participant',
          count: participantsResult.count,
          description: 'will be removed from this tournament'
        });
      }
      if (matchesResult.count && matchesResult.count > 0) {
        warnings.push({
          entity: 'match',
          count: matchesResult.count,
          description: 'including all results and scores'
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
      const { error } = await supabase
        .from('tournaments')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', tournamentToDelete.id);

      if (error) throw error;

      toast({
        title: 'Tournament deleted',
        description: `${tournamentToDelete.name} has been moved to deleted tournaments. You can restore it within 7 days.`,
      });

      // Refresh both lists
      fetchTournaments();
      fetchDeletedTournaments();
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

      const { error } = await supabase
        .from('tournaments')
        .update({ deleted_at: null } as any)
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: 'Tournament restored',
        description: `${tournamentName} has been restored successfully.`,
      });

      // Refresh both lists
      fetchTournaments();
      fetchDeletedTournaments();
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

      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: 'Tournament permanently deleted',
        description: `${tournamentName} has been permanently removed.`,
      });

      fetchDeletedTournaments();
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
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Tournaments</h1>
            <p className="text-gray-400">Manage your tournaments</p>
          </div>
          <Link to="/organizer/tournaments/new">
            <Button>Create Tournament</Button>
          </Link>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              Active Tournaments ({tournaments.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" className="text-red-400">
              <Trash2 className="w-4 h-4 mr-2" />
              Deleted ({deletedTournaments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">You haven't created any tournaments yet</p>
                <Link to="/organizer/tournaments/new">
                  <Button>Create Your First Tournament</Button>
                </Link>
              </div>
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
                    onDelete={() => handleDeleteClick(tournament.id, tournament.name, tournament.status)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deleted">
            {deletedTournaments.length === 0 ? (
              <div className="text-center py-12">
                <Trash2 className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">No deleted tournaments</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-200">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Deleted tournaments will be permanently removed after 7 days. Restore them before the deadline to keep your data.
                  </p>
                </div>

                {deletedTournaments.map((tournament) => (
                  <Card key={tournament.id} className="bg-gray-800/50 border-gray-700">
                    <CardContent className="flex items-center justify-between p-4">
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
                        <Button
                          size="sm"
                          onClick={() => handleRestore(tournament.id, tournament.name)}
                          disabled={restoring === tournament.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          {restoring === tournament.id ? 'Restoring...' : 'Restore'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handlePermanentDelete(tournament.id, tournament.name)}
                          disabled={restoring === tournament.id}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Forever
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
    </div>
  );
};

export default TournamentList;
