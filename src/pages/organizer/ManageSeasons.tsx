import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeasons, useDeleteSeason, usePublishSeason, useCancelSeason } from '@/hooks/useSeasons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Calendar, Trophy, PlayCircle, XCircle, AlertTriangle } from 'lucide-react';

const ManageSeasons = () => {
  const [activeTab, setActiveTab] = useState('all');
  const { data: seasons = [], isLoading } = useSeasons(1, 100, activeTab === 'all' ? undefined : activeTab);
  const deleteSeason = useDeleteSeason();
  const publishSeason = usePublishSeason();
  const cancelSeason = useCancelSeason();

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
    publishSeason.mutate(seasonId);
  };

  const handleCancel = (seasonId: string) => {
    cancelSeason.mutate(seasonId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'published':
        return 'bg-blue-500';
      case 'live':
        return 'bg-green-500';
      case 'completed':
        return 'bg-purple-500';
      case 'archived':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Seasons</h1>
              <p className="text-gray-400">Loading seasons...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Seasons</h1>
            <p className="text-gray-400">Manage your seasons and tournaments</p>
          </div>
          <Link to="/organizer/seasons/create">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Season
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Seasons ({seasons.length})</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {seasons.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 mb-4">
                  {activeTab === 'all' ? "You haven't created any seasons yet" : `No ${activeTab} seasons found`}
                </p>
                <Link to="/organizer/seasons/create">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Season
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {seasons.map((season) => (
                  <Card key={season.id} className="bg-[#0d0d10] border border-white/10 hover:border-white/20 transition-colors">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-white">{season.name}</CardTitle>
                        <Badge className={getStatusColor(season.status)}>
                          {season.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">{season.game}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Trophy className="w-4 h-4" />
                          <span>{season.tournament_count} tournaments</span>
                        </div>
                        {season.start_date && (
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(season.start_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Link to={`/organizer/seasons/${season.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full border-gray-700 hover:bg-white/10">
                              Manage
                            </Button>
                          </Link>
                          {season.status === 'draft' && (
                            <Button
                              size="sm"
                              onClick={() => handlePublish(season.id)}
                              disabled={publishSeason.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {season.status === 'published' && (
                            <Button
                              size="sm"
                              onClick={() => handleCancel(season.id)}
                              disabled={cancelSeason.isPending}
                              variant="destructive"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(season.id, season.name)}
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
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {deleteModalOpen && seasonToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Delete Season</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Are you sure you want to delete "{seasonToDelete.name}"? This will delete the season and unlink all associated tournaments. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setSeasonToDelete(null);
                }}
                className="flex-1 border-gray-700 hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteSeason.isPending}
                className="flex-1"
              >
                {deleteSeason.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSeasons;
