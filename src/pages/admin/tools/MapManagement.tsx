import React, { useRef, useState } from 'react';
import { Map, Plus, Upload, Trash2, Loader2, Search, Check, X, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      "relative flex flex-col rounded-xl border border-zinc-800 bg-[#0a0a0c] overflow-hidden",
      !map.is_active && "opacity-60"
    )}>
      {/* Map Image */}
      <div className="relative aspect-video bg-zinc-900 flex items-center justify-center">
        {map.map_image_url ? (
          <img
            src={map.map_image_url}
            alt={map.map_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Map className="w-12 h-12 text-zinc-700" />
        )}
        {!map.is_active && (
          <Badge className="absolute top-2 right-2 bg-zinc-700">Inactive</Badge>
        )}
      </div>

      {/* Map Info */}
      <div className="p-4 flex-1">
        <h3 className="font-semibold text-white truncate">{map.map_name}</h3>
        <p className="text-sm text-zinc-400">{map.game}</p>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
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
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="ml-2">Image</span>
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(map)}>
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDelete(map.id)}>
          <Trash2 className="w-4 h-4 text-red-400" />
        </Button>
      </div>
    </div>
  );
}

export default function MapManagement() {
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
    onSuccess: (_, id) => {
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

  if (error) {
    return (
      <div className="p-6 text-red-400">
        Failed to load maps: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Map className="w-7 h-7 text-rose-500" />
            Map Management
          </h1>
          <p className="text-zinc-400 mt-1">
            Add and manage game maps for CS2, Valorant, and R6 Siege
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Map
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search maps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterGame} onValueChange={setFilterGame}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by game" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Games</SelectItem>
            {SUPPORTED_GAMES.map((game) => (
              <SelectItem key={game} value={game}>{game}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Maps Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh] text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading maps...
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedMaps).map(([game, gameMaps]) => (
            <div key={game}>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                {game}
                <Badge variant="outline">{gameMaps.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            <div className="text-center text-zinc-500 py-12">
              No maps found. Click "Add Map" to create one.
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Map</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Game</Label>
              <Select value={formGame} onValueChange={(v) => setFormGame(v as SupportedGame)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_GAMES.map((game) => (
                    <SelectItem key={game} value={game}>{game}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Map Name</Label>
              <Input
                placeholder="e.g., Dust 2, Ascent, Bank"
                value={formMapName}
                onChange={(e) => setFormMapName(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMap.isPending}>
              {createMap.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMap} onOpenChange={(open) => { if (!open) { setEditingMap(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Map: {editingMap?.map_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Map Name</Label>
              <Input
                value={formMapName}
                onChange={(e) => setFormMapName(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingMap(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMap.isPending}>
              {updateMap.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
