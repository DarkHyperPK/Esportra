import { useRef, useState } from 'react';
import { Map, Plus, Upload, Trash2, Loader2, Search, Check, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandIconButton,
  CommandPanel,
  CommandToolbar,
} from '@/components/management/CommandSurface';
import { cn } from '@/lib/utils';

const SUPPORTED_GAMES = ['Counter-Strike 2', 'Valorant', 'Rainbow Six Siege'] as const;
type SupportedGame = typeof SUPPORTED_GAMES[number];

interface GameMap {
  id: string;
  game: string;
  map_name: string;
  map_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

const FIELD_LABEL = 'font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500';

function MapCard({
  map,
  onEdit,
  onDelete,
  onUploadImage,
  isUploading,
}: {
  map: GameMap;
  onEdit: (map: GameMap) => void;
  onDelete: (id: string) => void;
  onUploadImage: (id: string, file: File) => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn(
      'relative flex flex-col overflow-hidden border border-white/10 bg-white/[0.025]',
      !map.is_active && 'opacity-60',
    )}>
      {/* Map Image */}
      <div className="relative flex aspect-video items-center justify-center border-b border-white/10 bg-[#0a0a0c]">
        {map.map_image_url ? (
          <img
            src={map.map_image_url}
            alt={map.map_name}
            className="h-full w-full object-contain"
          />
        ) : (
          <Map className="h-12 w-12 text-zinc-700" />
        )}
        {!map.is_active && (
          <span className="absolute right-2 top-2 border border-white/15 bg-[#0a0a0c] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Inactive
          </span>
        )}
      </div>

      {/* Map Info */}
      <div className="flex-1 p-4">
        <h3 className="truncate text-sm font-semibold text-white">{map.map_name}</h3>
        <p className={cn('mt-1', FIELD_LABEL)}>{map.game}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-4 pt-0">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadImage(map.id, file);
            e.target.value = '';
          }}
        />
        <CommandButton
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Image
        </CommandButton>
        <CommandIconButton label={`Edit ${map.map_name}`} variant="ghost" onClick={() => onEdit(map)}>
          <Edit2 />
        </CommandIconButton>
        <CommandIconButton label={`Delete ${map.map_name}`} variant="danger" onClick={() => onDelete(map.id)}>
          <Trash2 />
        </CommandIconButton>
      </div>
    </div>
  );
}

interface MapManagementProps {
  embedded?: boolean;
}

export default function MapManagement({ embedded = false }: MapManagementProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGame, setFilterGame] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<GameMap | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Form state
  const [formGame, setFormGame] = useState<SupportedGame>('Counter-Strike 2');
  const [formMapName, setFormMapName] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Fetch maps
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'game-maps', filterGame],
    queryFn: () => {
      const params = filterGame !== 'all' ? `?game=${encodeURIComponent(filterGame)}` : '';
      return apiClient.get<{ maps: GameMap[]; total: number }>(`/api/admin/game-maps${params}`);
    },
  });

  // Create map mutation
  const createMap = useMutation({
    mutationFn: (data: { game: string; map_name: string; is_active: boolean }) =>
      apiClient.post('/api/admin/game-maps', { Game: data.game, MapName: data.map_name, IsActive: data.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'game-maps'] });
      toast({ title: 'Map created', description: 'The map has been added successfully.' });
      resetForm();
      setCreateDialogOpen(false);
    },
    onError: (err) => {
      toast({
        title: 'Failed to create map',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Update map mutation
  const updateMap = useMutation({
    mutationFn: (data: { id: string; map_name?: string; is_active?: boolean }) =>
      apiClient.put(`/api/admin/game-maps/${data.id}`, { MapName: data.map_name, IsActive: data.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'game-maps'] });
      toast({ title: 'Map updated' });
      setEditingMap(null);
      resetForm();
    },
    onError: (err) => {
      toast({
        title: 'Failed to update map',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Delete map mutation
  const deleteMap = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/admin/game-maps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'game-maps'] });
      toast({ title: 'Map deleted' });
    },
    onError: (err) => {
      toast({
        title: 'Failed to delete map',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Upload image mutation
  const uploadImage = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.upload<{ map_image_url: string }>(`/api/admin/game-maps/${id}/image`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'game-maps'] });
      toast({ title: 'Image uploaded' });
      setUploadingId(null);
    },
    onError: (err) => {
      toast({
        title: 'Failed to upload image',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      setUploadingId(null);
    },
  });

  const resetForm = () => {
    setFormGame('Counter-Strike 2');
    setFormMapName('');
    setFormIsActive(true);
  };

  const openEdit = (map: GameMap) => {
    setEditingMap(map);
    setFormMapName(map.map_name);
    setFormIsActive(map.is_active);
  };

  const handleCreate = () => {
    if (!formMapName.trim()) {
      toast({ title: 'Map name required', variant: 'destructive' });
      return;
    }
    createMap.mutate({ game: formGame, map_name: formMapName.trim(), is_active: formIsActive });
  };

  const handleUpdate = () => {
    if (!editingMap) return;
    updateMap.mutate({ id: editingMap.id, map_name: formMapName.trim() || undefined, is_active: formIsActive });
  };

  const handleUploadImage = (id: string, file: File) => {
    setUploadingId(id);
    uploadImage.mutate({ id, file });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this map? If it\'s in use by tournaments, it will be deactivated instead.')) {
      deleteMap.mutate(id);
    }
  };

  // Filter and search maps
  const maps = (data?.maps ?? []).filter((map) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!map.map_name.toLowerCase().includes(query) && !map.game.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Group maps by game
  const groupedMaps = maps.reduce((acc, map) => {
    const game = map.game;
    if (!acc[game]) acc[game] = [];
    acc[game].push(map);
    return acc;
  }, {} as Record<string, GameMap[]>);

  const addMapButton = (
    <CommandButton size="sm" onClick={() => setCreateDialogOpen(true)}>
      <Plus className="h-4 w-4" /> Add Map
    </CommandButton>
  );

  const body = (
    <>
      {/* Filters */}
      <CommandToolbar>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search maps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="-none border-white/10 bg-[#0a0a0c] pl-10"
          />
        </div>
        <Select value={filterGame} onValueChange={setFilterGame}>
          <SelectTrigger className="w-[200px] -none border-white/10 bg-[#0a0a0c]">
            <SelectValue placeholder="Filter by game" />
          </SelectTrigger>
          <SelectContent className="-none border-white/10 bg-[#0a0a0c]">
            <SelectItem value="all">All Games</SelectItem>
            {SUPPORTED_GAMES.map((game) => (
              <SelectItem key={game} value={game}>{game}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CommandToolbar>

      {/* Maps Grid */}
      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading maps...
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedMaps).map(([game, gameMaps]) => (
            <div key={game}>
              <h2 className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
                {game}
                <span className="border border-white/15 px-2 py-0.5 text-zinc-400">{gameMaps.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {gameMaps.map((map) => (
                  <MapCard
                    key={map.id}
                    map={map}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onUploadImage={handleUploadImage}
                    isUploading={uploadingId === map.id}
                  />
                ))}
              </div>
            </div>
          ))}
          {maps.length === 0 && (
            <div className="border border-dashed border-white/10 bg-white/[0.02] py-12 text-center text-sm text-zinc-500">
              No maps found. Click "Add Map" to create one.
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="-none border border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle>Add New Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className={FIELD_LABEL}>Game</Label>
              <Select value={formGame} onValueChange={(v) => setFormGame(v as SupportedGame)}>
                <SelectTrigger className="-none border-white/10 bg-[#0a0a0c]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="-none border-white/10 bg-[#0a0a0c]">
                  {SUPPORTED_GAMES.map((game) => (
                    <SelectItem key={game} value={game}>{game}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={FIELD_LABEL}>Map Name</Label>
              <Input
                placeholder="e.g., Dust 2, Ascent, Bank"
                value={formMapName}
                onChange={(e) => setFormMapName(e.target.value)}
                className="-none border-white/10 bg-[#0a0a0c]"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className={FIELD_LABEL}>Active</Label>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </CommandButton>
            <CommandButton size="sm" onClick={handleCreate} disabled={createMap.isPending}>
              {createMap.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMap} onOpenChange={(open) => { if (!open) { setEditingMap(null); resetForm(); } }}>
        <DialogContent className="-none border border-white/10 bg-[#0a0a0c] text-white">
          <DialogHeader>
            <DialogTitle>Edit Map: {editingMap?.map_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className={FIELD_LABEL}>Map Name</Label>
              <Input
                value={formMapName}
                onChange={(e) => setFormMapName(e.target.value)}
                className="-none border-white/10 bg-[#0a0a0c]"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className={FIELD_LABEL}>Active</Label>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => { setEditingMap(null); resetForm(); }}>
              Cancel
            </CommandButton>
            <CommandButton size="sm" onClick={handleUpdate} disabled={updateMap.isPending}>
              {updateMap.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </CommandButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (error) {
    return (
      <AdminPage eyebrow="Content" title="Game Maps">
        <div className="border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
          Failed to load maps: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </AdminPage>
    );
  }

  if (embedded) {
    return (
      <div className="space-y-5">
        <CommandToolbar>
          <span className={FIELD_LABEL}>
            Add and manage game maps for CS2, Valorant, and R6 Siege
          </span>
          {addMapButton}
        </CommandToolbar>
        {body}
      </div>
    );
  }

  return (
    <AdminPage
      eyebrow="Content"
      title="Game Maps"
      description="Add and manage game maps for CS2, Valorant, and R6 Siege"
      actions={addMapButton}
    >
      <CommandPanel className="space-y-6">{body}</CommandPanel>
    </AdminPage>
  );
}
