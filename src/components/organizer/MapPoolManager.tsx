import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus, X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameMap {
  id: string;
  game: string;
  map_name: string;
  map_image_url?: string | null;
  is_active: boolean;
}

interface MapPoolManagerProps {
  tournamentId: string;
  game: string;
}

export const MapPoolManager: React.FC<MapPoolManagerProps> = ({ tournamentId, game }) => {
  const { toast } = useToast();
  const [allMaps, setAllMaps] = useState<GameMap[]>([]);
  const [poolMaps, setPoolMaps] = useState<string[]>([]); // Array of map IDs
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapImageUrl, setNewMapImageUrl] = useState('');

  // Fetch all available maps for the game
  useEffect(() => {
    const fetchMaps = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('game_maps')
          .select('*')
          .eq('game', game)
          .eq('is_active', true)
          .order('map_name');

        if (error) throw error;
        setAllMaps((data as GameMap[]) || []);

        // Fetch current tournament map pool
        const { data: poolData, error: poolError } = await supabase
          .from('tournament_map_pools')
          .select('map_id')
          .eq('tournament_id', tournamentId);

        if (poolError) throw poolError;
        setPoolMaps((poolData || []).map((p: any) => p.map_id));
      } catch (error: any) {
        console.error('Error fetching maps:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load maps',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (game && tournamentId) {
      fetchMaps();
    }
  }, [game, tournamentId, toast]);

  // Toggle map in pool
  const toggleMapInPool = async (mapId: string, isInPool: boolean) => {
    try {
      if (isInPool) {
        // Remove from pool
        const { error } = await supabase
          .from('tournament_map_pools')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('map_id', mapId);

        if (error) throw error;
        setPoolMaps((prev) => prev.filter((id) => id !== mapId));
        toast({
          title: 'Map removed',
          description: 'Map has been removed from the pool',
        });
      } else {
        // Add to pool
        const { error } = await supabase.from('tournament_map_pools').insert({
          tournament_id: tournamentId,
          map_id: mapId,
        });

        if (error) throw error;
        setPoolMaps((prev) => [...prev, mapId]);
        toast({
          title: 'Map added',
          description: 'Map has been added to the pool',
        });
      }
    } catch (error: any) {
      console.error('Error toggling map:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update map pool',
        variant: 'destructive',
      });
    }
  };

  // Add new map
  const handleAddMap = async () => {
    if (!newMapName.trim()) {
      toast({
        title: 'Map name required',
        description: 'Please enter a map name',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('game_maps')
        .insert({
          game: game,
          map_name: newMapName.trim(),
          map_image_url: newMapImageUrl.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // If map already exists, just add it to pool
        if (error.code === '23505') {
          const { data: existingMap } = await supabase
            .from('game_maps')
            .select('*')
            .eq('game', game)
            .eq('map_name', newMapName.trim())
            .single();

          if (existingMap) {
            await toggleMapInPool(existingMap.id, false);
            setShowAddDialog(false);
            setNewMapName('');
            setNewMapImageUrl('');
            return;
          }
        }
        throw error;
      }

      // Add to pool
      await supabase.from('tournament_map_pools').insert({
        tournament_id: tournamentId,
        map_id: data.id,
      });

      setAllMaps((prev) => [...prev, data]);
      setPoolMaps((prev) => [...prev, data.id]);
      setShowAddDialog(false);
      setNewMapName('');
      setNewMapImageUrl('');

      toast({
        title: 'Map added',
        description: 'Map has been added to the pool',
      });
    } catch (error: any) {
      console.error('Error adding map:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add map',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gaming-purple"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Map Pool</CardTitle>
            <CardDescription className="text-gray-400">
              Select maps available for veto in this tournament
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Map
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {allMaps.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No maps available for {game}.</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
              className="mt-4"
            >
              Add First Map
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {allMaps.map((map) => {
              const isInPool = poolMaps.includes(map.id);
              return (
                <div
                  key={map.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    isInPool
                      ? 'bg-blue-900/20 border-blue-700'
                      : 'bg-gray-800/50 border-gray-700'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={isInPool}
                      onCheckedChange={() => toggleMapInPool(map.id, isInPool)}
                    />
                    {map.map_image_url && (
                      <img
                        src={map.map_image_url}
                        alt={map.map_name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <span className="font-medium text-white">{map.map_name}</span>
                  </div>
                  {isInPool && (
                    <Badge variant="secondary" className="bg-blue-600">
                      In Pool
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {poolMaps.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 mb-2">
              {poolMaps.length} map{poolMaps.length !== 1 ? 's' : ''} in pool
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Map Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Add New Map</DialogTitle>
            <DialogDescription className="text-gray-400">
              Add a new map for {game}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Map Name *
              </label>
              <Input
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="e.g., Dust II"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Map Image URL (optional)
              </label>
              <Input
                value={newMapImageUrl}
                onChange={(e) => setNewMapImageUrl(e.target.value)}
                placeholder="https://example.com/map-image.jpg"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setNewMapName('');
                setNewMapImageUrl('');
              }}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMap}
              disabled={saving || !newMapName.trim()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {saving ? 'Adding...' : 'Add Map'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

