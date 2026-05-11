import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeasons, useDeleteSeason, usePublishSeason, useArchiveSeason } from '@/hooks/useSeasons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Calendar, Trophy, PlayCircle, XCircle, AlertTriangle, Users, Layers } from 'lucide-react';
import type { SeasonList } from '@/types/season';

const ManageSeasons = () => {
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();
  const { data: seasons = [], isLoading, isError } = useSeasons(1, 100, activeTab === 'all' ? undefined : activeTab);
  const deleteSeason = useDeleteSeason();
  const publishSeason = usePublishSeason();
  const archiveSeason = useArchiveSeason();

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteClick = (seasonId: string, seasonName: string) => {
    setSeasonToDelete({ id: seasonId, name: seasonName });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!seasonToDelete) return;
    deleteSeason.mutate(seasonToDelete.id, {
      onSuccess: () => {
        setDeleteModalOpen(false);
        setSeasonToDelete(null);
      },
    });
  };

  const handlePublish = (seasonId: string) => {
    publishSeason.mutate({ seasonId });
  };

  const handleArchive = (seasonId: string) => {
    archiveSeason.mutate(seasonId);
  };

  if (isLoading) {
    return (
      <div className="px-8 py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <div className="w-6 h-6 border-2 border-zinc-600 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-sm">Loading seasons...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-8 py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <p className="text-white font-medium">Failed to load seasons</p>
          <p className="text-zinc-400 text-sm">There was a problem fetching your seasons. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // Proper empty state — no aggressive redirect
  if (seasons.length === 0 && activeTab === 'all') {
    return (
      <div className="px-8 py-16 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <div className="w-16 h-16 bg-[#111] border border-white/10 rounded-2xl flex items-center justify-center">
            <Layers className="w-8 h-8 text-zinc-500" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg mb-2">No seasons yet</h3>
            <p className="text-zinc-400 text-sm">Create your first season to start managing multi-event tournament trees.</p>
          </div>
          <button
            onClick={() => navigate('/organizer/seasons/create')}
            className="flex items-center gap-2 px-6 h-11 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Season
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-8 py-8">
        <div className="flex justify-end mb-6">
          <Link to="/organizer/seasons/create">
            <Button className="bg-rose-500 hover:bg-rose-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Season
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-[#0a0a0c] border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">All ({seasons.length})</TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">Draft</TabsTrigger>
            <TabsTrigger value="published" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">Published</TabsTrigger>
            <TabsTrigger value="live" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">Live</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">Completed</TabsTrigger>
            <TabsTrigger value="archived" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400">Archived</TabsTrigger>
          </TabsList>

          {['all', 'draft', 'published', 'live', 'completed', 'archived'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <SeasonGrid
                seasons={seasons}
                activeTab={tab}
                onPublish={handlePublish}
                onArchive={handleArchive}
                onDeleteClick={handleDeleteClick}
                publishPending={publishSeason.isPending}
                archivePending={archiveSeason.isPending}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteModalOpen && seasonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Delete Season</h3>
                <p className="text-zinc-400 text-sm">
                  Are you sure you want to delete <span className="text-white font-medium">"{seasonToDelete.name}"</span>? This will delete the season and unlink all associated tournaments. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSeasonToDelete(null);
                }}
                className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteSeason.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {deleteSeason.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface SeasonGridProps {
  seasons: SeasonList[];
  activeTab: string;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDeleteClick: (id: string, name: string) => void;
  publishPending: boolean;
  archivePending: boolean;
}

const SeasonGrid: React.FC<SeasonGridProps> = ({
  seasons,
  activeTab,
  onPublish,
  onArchive,
  onDeleteClick,
  publishPending,
  archivePending,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'published': return 'bg-blue-500';
      case 'live': return 'bg-green-500';
      case 'completed': return 'bg-purple-500';
      case 'archived': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (seasons.length === 0) {
    // Simple inline empty for filtered tabs; full onboarding is at ManageSeasons level
    return (
      <div className="text-center py-16">
        <p className="text-[#808080] text-sm uppercase tracking-wider">
          {activeTab === 'all' ? 'No seasons found' : `No ${activeTab} seasons`}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {seasons.map((season) => (
        <Card key={season.id} className="bg-[#0a0a0c] border border-white/10 hover:border-rose-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5">
          <CardHeader>
            <div className="flex justify-between items-start mb-3">
              <CardTitle className="text-lg text-white font-semibold">{season.name}</CardTitle>
              <Badge className={getStatusColor(season.status)} variant="secondary">
                {season.status}
              </Badge>
            </div>
            <p className="text-sm text-zinc-400">{season.game}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Trophy className="w-4 h-4 text-rose-400" />
                <span>{season.tournament_count} tournament{season.tournament_count !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Users className="w-4 h-4 text-rose-400" />
                <span>{season.participant_count} team{season.participant_count !== 1 ? 's' : ''}</span>
              </div>
              {season.start_date && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Calendar className="w-4 h-4 text-rose-400" />
                  <span>{new Date(season.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              <div className="flex gap-2 pt-3">
                <Link to={`/organizer/seasons/${season.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white">
                    Manage
                  </Button>
                </Link>
                {season.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => onPublish(season.id)}
                    disabled={publishPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <PlayCircle className="w-4 h-4" />
                  </Button>
                )}
                {season.status === 'published' && (
                  <Button
                    size="sm"
                    onClick={() => onArchive(season.id)}
                    disabled={archivePending}
                    variant="destructive"
                    title="Archive"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDeleteClick(season.id, season.name)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ManageSeasons;
