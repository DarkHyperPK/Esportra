import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Search, Gamepad2, Image, Film, CheckCircle2, XCircle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

const IgdbTest = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [assets, setAssets] = useState<any>(null);
  const [banner, setBanner] = useState<any>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState("");
  const { toast } = useToast();

  const searchGames = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchResults(null);
    setAssets(null);
    setBanner(null);
    try {
      const data = await apiClient.get<any[]>(`/api/games/search?q=${encodeURIComponent(query)}`);
      setSearchResults(data || []);
      toast({ title: `Found ${data?.length || 0} games` });
    } catch (err: any) {
      toast({ title: 'Search failed', description: err.message, variant: 'destructive' });
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async (game: string) => {
    setAssetsLoading(true);
    setAssets(null);
    setSelectedGame(game);
    try {
      const data = await apiClient.get<any>(`/api/games/igdb-assets?game=${encodeURIComponent(game)}`);
      setAssets(data);
      toast({ title: 'IGDB assets loaded' });
    } catch (err: any) {
      toast({ title: 'Assets failed', description: err.message, variant: 'destructive' });
    } finally {
      setAssetsLoading(false);
    }
  };

  const fetchBanner = async (game: string) => {
    setBannerLoading(true);
    setBanner(null);
    setSelectedGame(game);
    try {
      const data = await apiClient.get<any>(`/api/games/igdb-banner?game=${encodeURIComponent(game)}`);
      setBanner(data);
      toast({ title: data?.url ? 'Banner found' : 'No banner available' });
    } catch (err: any) {
      toast({ title: 'Banner failed', description: err.message, variant: 'destructive' });
    } finally {
      setBannerLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl pb-40">
      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-white italic">
          IGDB<span className="text-purple-500">DEBUG</span>
        </h1>
        <p className="text-zinc-400">Test IGDB integration — game search, assets, and banners.</p>
      </div>

      {/* Search */}
      <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-lg">
            <Gamepad2 className="w-5 h-5 text-purple-500" /> Game Search
          </CardTitle>
          <CardDescription className="text-zinc-500">Search games via /api/games/search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label className="text-zinc-400 text-xs">Game Name</Label>
              <Input
                placeholder="Valorant, CS2, League of Legends..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchGames()}
                className="bg-zinc-950 border-zinc-800 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={searchGames} disabled={loading || !query.trim()} className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {searchResults && (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              {searchResults.length > 0
                ? <><CheckCircle2 className="w-5 h-5 text-emerald-500" /> {searchResults.length} Results</>
                : <><XCircle className="w-5 h-5 text-rose-500" /> No Results</>
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {searchResults.map((game: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-purple-500/30 transition-colors">
                  {game.background_image || game.image_url ? (
                    <img src={game.background_image || game.image_url} alt={game.name} className="w-16 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-16 h-12 rounded bg-zinc-800 flex items-center justify-center">
                      <Gamepad2 className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{game.name}</p>
                    {game.slug && <p className="text-xs text-zinc-500 font-mono">{game.slug}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="border-zinc-700 text-xs" onClick={() => fetchAssets(game.name)}>
                      <Image className="w-3 h-3 mr-1" /> Assets
                    </Button>
                    <Button size="sm" variant="outline" className="border-zinc-700 text-xs" onClick={() => fetchBanner(game.name)}>
                      <Film className="w-3 h-3 mr-1" /> Banner
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assets Result */}
      {(assetsLoading || assets) && (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Image className="w-5 h-5 text-cyan-500" /> IGDB Assets — {selectedGame}
            </CardTitle>
            <CardDescription className="text-zinc-500">/api/games/igdb-assets</CardDescription>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>
            ) : assets ? (
              <div className="space-y-4">
                {/* Screenshots */}
                {assets.screenshots?.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-2">Screenshots ({assets.screenshots.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {assets.screenshots.slice(0, 8).map((url: string, i: number) => (
                        <img key={i} src={url} alt={`Screenshot ${i + 1}`} className="rounded-lg border border-zinc-800 w-full h-24 object-cover" />
                      ))}
                    </div>
                  </div>
                )}
                {/* Videos */}
                {assets.videos?.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-2">Videos ({assets.videos.length})</p>
                    <div className="grid grid-cols-2 gap-2">
                      {assets.videos.slice(0, 4).map((v: any, i: number) => (
                        <div key={i} className="rounded-lg border border-zinc-800 p-2 bg-zinc-950 text-xs text-zinc-300">
                          <p className="font-mono truncate">{typeof v === 'string' ? v : v.video_id || JSON.stringify(v)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Artworks */}
                {assets.artworks?.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-2">Artworks ({assets.artworks.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {assets.artworks.slice(0, 8).map((url: string, i: number) => (
                        <img key={i} src={url} alt={`Artwork ${i + 1}`} className="rounded-lg border border-zinc-800 w-full h-24 object-cover" />
                      ))}
                    </div>
                  </div>
                )}
                {/* Raw JSON */}
                <details className="mt-4">
                  <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400">Raw JSON Response</summary>
                  <pre className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-400 overflow-auto max-h-60">
                    {JSON.stringify(assets, null, 2)}
                  </pre>
                </details>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Banner Result */}
      {(bannerLoading || banner) && (
        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-500" /> IGDB Banner — {selectedGame}
            </CardTitle>
            <CardDescription className="text-zinc-500">/api/games/igdb-banner</CardDescription>
          </CardHeader>
          <CardContent>
            {bannerLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>
            ) : banner ? (
              <div className="space-y-3">
                {banner.url ? (
                  <img src={banner.url} alt="Banner" className="rounded-xl border border-zinc-800 w-full max-h-64 object-cover" />
                ) : (
                  <Alert className="bg-amber-500/10 border-amber-500/20">
                    <AlertDescription className="text-amber-400 text-sm">No banner found for this game.</AlertDescription>
                  </Alert>
                )}
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-400 overflow-auto max-h-40">
                  {JSON.stringify(banner, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IgdbTest;
