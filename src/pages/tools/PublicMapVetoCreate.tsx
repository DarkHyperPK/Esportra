import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Swords } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient, getApiErrorMessage } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type GameMap = {
  id: string;
  game?: string;
  map_name?: string;
  mapName?: string;
  map_image_url?: string | null;
  mapImageUrl?: string | null;
};

const games = [
  { value: "valorant", apiName: "Valorant", label: "Valorant", poolSize: 7 },
  { value: "cs2", apiName: "Counter-Strike 2", label: "Counter-Strike 2", poolSize: 7 },
  { value: "r6s", apiName: "Rainbow Six Siege", label: "Rainbow Six Siege", poolSize: 9 },
];

const mapName = (map: GameMap) => map.mapName ?? map.map_name ?? "Unknown map";
const fallbackMapImage = "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=500&fit=crop&q=80";

const getMapImage = (map: GameMap, game: string) => {
  const explicit = map.mapImageUrl ?? map.map_image_url;
  if (explicit) return explicit.trim();
  if (game === "valorant" && /^[0-9a-f-]{36}$/i.test(map.id)) {
    return `https://media.valorant-api.com/maps/${map.id}/splash.png`;
  }
  return fallbackMapImage;
};

const PublicMapVetoCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [game, setGame] = useState("valorant");
  const [bestOf, setBestOf] = useState("3");
  const [team1Name, setTeam1Name] = useState("Team A");
  const [team2Name, setTeam2Name] = useState("Team B");
  const [selectedMapIds, setSelectedMapIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const gameConfig = games.find((item) => item.value === game) ?? games[0];

  const { data: maps = [], isLoading } = useQuery({
    queryKey: ["public-tool-map-pool", game],
    queryFn: () => apiClient.get<GameMap[]>(`/api/game-maps?game=${encodeURIComponent(gameConfig.apiName)}&is_active=true`),
  });

  useEffect(() => {
    setSelectedMapIds((current) => {
      const available = maps.map((map) => map.id);
      const kept = current.filter((id) => available.includes(id));
      if (kept.length > 0) return kept.slice(0, gameConfig.poolSize);
      return available.slice(0, gameConfig.poolSize);
    });
  }, [gameConfig.poolSize, maps]);

  const selectedCount = selectedMapIds.length;
  const hasValidPool = selectedCount === gameConfig.poolSize;

  const toggleMap = (mapId: string) => {
    setSelectedMapIds((current) => {
      if (current.includes(mapId)) return current.filter((id) => id !== mapId);
      if (current.length >= gameConfig.poolSize) {
        toast({
          title: "Map pool full",
          description: `${gameConfig.label} veto uses ${gameConfig.poolSize} maps. Remove one before adding another.`,
        });
        return current;
      }
      return [...current, mapId];
    });
  };

  const createSession = async () => {
    if (!hasValidPool) {
      toast({
        title: "Select the veto pool",
        description: `Select exactly ${gameConfig.poolSize} maps for ${gameConfig.label}.`,
        variant: "destructive",
      });
      return;
    }
    setCreating(true);
    try {
      const response = await apiClient.post<{ hostToken: string }>("/api/tools/map-veto", {
        game,
        bestOf: Number(bestOf),
        team1Name,
        team2Name,
        mapIds: selectedMapIds,
      });
      navigate(`/tools/map-veto/host/${response.hostToken}`);
    } catch (err) {
      toast({ title: "Could not create veto room", description: getApiErrorMessage(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 text-white">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-rose-400">Public tools</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Map Veto Room</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Create an anonymous 24-hour veto room and send each team their action link.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section className="border border-white/10 bg-black/40 p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Game</Label>
              <Select value={game} onValueChange={(next) => { setGame(next); setSelectedMapIds([]); }}>
                <SelectTrigger className="border-white/10 bg-black/40 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {games.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Best of</Label>
              <Select value={bestOf} onValueChange={setBestOf}>
                <SelectTrigger className="border-white/10 bg-black/40 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">BO1</SelectItem>
                  <SelectItem value="3">BO3</SelectItem>
                  <SelectItem value="5">BO5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-a">Team A</Label>
              <Input id="team-a" value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} className="border-white/10 bg-black/40 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-b">Team B</Label>
              <Input id="team-b" value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} className="border-white/10 bg-black/40 text-white" />
            </div>
            <Button disabled={creating || !hasValidPool} onClick={createSession} className="w-full bg-rose-600 text-white hover:bg-rose-500">
              <Swords className="mr-2 h-4 w-4" /> Create veto links
            </Button>
            {!hasValidPool && (
              <p className="text-xs text-amber-300">
                Select exactly {gameConfig.poolSize} maps before creating the room.
              </p>
            )}
          </div>
        </section>

        <section className="border border-white/10 bg-black/35 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Map pool</h2>
              <p className="text-xs text-zinc-500">
                {isLoading ? "Loading maps..." : `${selectedCount}/${gameConfig.poolSize} selected from ${maps.length} maps`}
              </p>
            </div>
            <Button size="sm" variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" onClick={() => setSelectedMapIds(maps.slice(0, gameConfig.poolSize).map((map) => map.id))}>
              Auto-select {gameConfig.poolSize}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {maps.map((map) => (
              <div
                key={map.id}
                className={`overflow-hidden border bg-black/45 transition ${
                  selectedMapIds.includes(map.id) ? "border-rose-400/70" : "border-white/10 hover:border-white/25"
                }`}
              >
                <div
                  aria-hidden="true"
                  className="h-24 bg-zinc-900 bg-cover bg-center"
                  style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.08)), url(${getMapImage(map, game)})` }}
                />
                <div className="flex items-center gap-3 p-3">
                  <Checkbox
                    id={`map-${map.id}`}
                    checked={selectedMapIds.includes(map.id)}
                    onCheckedChange={() => toggleMap(map.id)}
                  />
                  <Label htmlFor={`map-${map.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className="block truncate text-sm font-semibold">{mapName(map)}</span>
                  </Label>
                </div>
              </div>
            ))}
            {!isLoading && maps.length === 0 && (
              <div className="col-span-full border border-white/10 bg-black/30 p-5 text-sm text-zinc-400">
                No map catalog entries were returned. The backend will use the default pool when possible.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PublicMapVetoCreate;
