import { Link } from 'react-router-dom';
import { useCallback, memo, useState } from 'react';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useSeasons } from '@/hooks/useSeasons';
import { Plus, Trash2, Trophy, Workflow } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

const SeasonCard = memo(({ season, handleDelete, isSelected, onToggleSelect }: { 
  season: any; 
  handleDelete: (id: string, name: string, status: string) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) => (
  <div className="group rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl hover:border-rose-500/40 hover:bg-black/50 transition-all duration-200">
    <div className="flex items-start gap-3 mb-4">
      {season.status === 'draft' && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(season.id)}
          className="mt-1 flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-rose-600/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
            <Trophy className="h-4 w-4 text-rose-400" />
          </div>
          <h3 className="text-base font-bold truncate">{season.name}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10 text-xs px-2 py-0.5">{season.status}</Badge>
          {season.isSeasonStaff && (
            <Badge className="bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/10 text-xs px-2 py-0.5">staff</Badge>
          )}
          <Badge className="bg-white/10 text-white hover:bg-white/10 text-xs px-2 py-0.5">{season.participantMode}</Badge>
        </div>
      </div>
    </div>

    <p className="text-xs text-zinc-400 line-clamp-2 mb-4 h-8">{season.description || 'No description yet.'}</p>

    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1">Nodes</p>
        <p className="text-sm font-semibold text-white">{season.nodeCount ?? 0}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1">Starts</p>
        <p className="text-sm font-semibold text-white truncate">{season.startDate ? new Date(season.startDate).toLocaleDateString() : 'Open'}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
        <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1">Game</p>
        <p className="text-sm font-semibold text-white truncate">{season.game}</p>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      <Button asChild size="sm" className="bg-rose-500 text-white hover:bg-rose-600 flex-1 min-w-[100px]">
        <Link to={`/organizer/seasons/${season.id}`}>
          Manage
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10 flex-1 min-w-[80px]">
        <Link to={`/seasons/${season.id}`}>View</Link>
      </Button>
      {season.status === 'draft' && (
        <Button
          size="sm"
          variant="outline"
          className="border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10 px-3"
          onClick={() => handleDelete(season.id, season.name, season.status)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  </div>
));

SeasonCard.displayName = 'SeasonCard';

const ManageSeasons = () => {
  const { data: seasons, isLoading, error, refetch } = useSeasons({ mine: true });
  const { toast } = useToast();
  const [selectedSeasons, setSelectedSeasons] = useState<Set<string>>(new Set());

  const handleDelete = useCallback(async (seasonId: string, seasonName: string, status: string) => {
    if (status !== 'draft') {
      toast({
        title: 'Cannot delete',
        description: 'Only draft seasons can be deleted.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${seasonName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/seasons/${seasonId}`);
      toast({ title: 'Season deleted', description: 'The season has been deleted.' });
      refetch();
    } catch (deleteError) {
      toast({
        title: 'Deletion failed',
        description: deleteError instanceof Error ? deleteError.message : 'Could not delete this season.',
        variant: 'destructive',
      });
    }
  }, [toast, refetch]);

  const handleBulkDelete = useCallback(async () => {
    const draftSeasons = seasons?.filter(s => s.status === 'draft' && selectedSeasons.has(s.id)) || [];
    if (draftSeasons.length === 0) {
      toast({
        title: 'Cannot delete',
        description: 'Only draft seasons can be deleted.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${draftSeasons.length} draft season(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.post('/api/seasons/bulk-delete', { seasonIds: Array.from(selectedSeasons) });
      toast({ title: 'Seasons deleted', description: `${draftSeasons.length} season(s) deleted.` });
      setSelectedSeasons(new Set());
      refetch();
    } catch (deleteError) {
      toast({
        title: 'Deletion failed',
        description: deleteError instanceof Error ? deleteError.message : 'Could not delete seasons.',
        variant: 'destructive',
      });
    }
  }, [selectedSeasons, seasons, toast, refetch]);

  const toggleSeasonSelection = (seasonId: string) => {
    setSelectedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seasonId)) {
        newSet.delete(seasonId);
      } else {
        newSet.add(seasonId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const draftSeasons = seasons?.filter(s => s.status === 'draft') || [];
    const draftIds = new Set(draftSeasons.map(s => s.id));
    const allSelected = draftIds.size > 0 && Array.from(selectedSeasons).every(id => draftIds.has(id));
    
    if (allSelected) {
      setSelectedSeasons(new Set());
    } else {
      setSelectedSeasons(draftIds);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-400">Organizer seasons</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Manage season trees</h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Create qualifier-to-final trees, wire tournaments into the structure, and manage standings and
              qualification records from one place.
            </p>
          </div>

          <Button asChild className="bg-rose-500 text-white hover:bg-rose-600">
            <Link to="/tournaments/create?mode=season">
              <Plus className="mr-2 h-4 w-4" />
              Create season
            </Link>
          </Button>
        </div>

        {isLoading && (
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
            Loading your seasons...
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
            <p className="font-semibold text-red-100">Could not load organizer seasons.</p>
            <p className="mt-2 text-sm text-red-200/80">{error instanceof Error ? error.message : 'Unknown error'}</p>
            <Button onClick={() => refetch()} className="mt-4 bg-white/10 text-white hover:bg-white/20">
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && seasons && seasons.length === 0 && (
          <div className="rounded-[32px] border border-dashed border-white/10 bg-black/20 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/10 text-rose-300">
              <Workflow className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">No seasons yet</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
              Create your first season to connect city qualifiers, group stages, and grand finals into one public tree.
            </p>
            <Button asChild className="mt-6 bg-rose-500 text-white hover:bg-rose-600">
              <Link to="/tournaments/create?mode=season">Create the first season</Link>
            </Button>
          </div>
        )}

        {!isLoading && !error && seasons && seasons.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedSeasons.size > 0}
                  onCheckedChange={toggleSelectAll}
                  id="select-all-drafts"
                />
                <label htmlFor="select-all-drafts" className="text-sm text-zinc-400 cursor-pointer">
                  Select all draft seasons
                </label>
              </div>
              {selectedSeasons.size > 0 && (
                <Button
                  variant="outline"
                  className="border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedSeasons.size} season(s)
                </Button>
              )}
            </div>
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {seasons.map((season) => (
                <SeasonCard 
                  key={season.id} 
                  season={season} 
                  handleDelete={handleDelete}
                  isSelected={selectedSeasons.has(season.id)}
                  onToggleSelect={toggleSeasonSelection}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default ManageSeasons;

