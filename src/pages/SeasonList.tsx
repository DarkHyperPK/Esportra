import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/apiClient';
import type { SeasonListItem } from '@/types/season';
import esportsGames from '@/data/esportsGames.json';

export default function SeasonList() {
  const { data: seasons, isLoading } = useQuery<SeasonListItem[]>({
    queryKey: ['publicSeasons'],
    queryFn: () => apiClient.get('/api/public/seasons'),
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black tracking-tight">Seasons</h1>
            <p className="mt-3 text-sm text-zinc-400">Browse active and upcoming esports seasons.</p>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
              Loading seasons...
            </div>
          ) : seasons && seasons.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {seasons.map((season) => {
                const game = esportsGames.games.find((g) => g.name === season.game);
                return (
                  <Link key={season.id} to={`/seasons/${season.slug}`}>
                    <div className="group rounded-3xl border border-white/10 bg-black/30 p-6 transition hover:border-rose-500/30 hover:bg-black/40">
                      {season.bannerUrl && (
                        <div className="mb-4 aspect-video overflow-hidden rounded-2xl bg-black/20">
                          <img
                            src={season.bannerUrl}
                            alt={season.name}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        {game && (
                          <img src={game.logo} alt={game.name} className="h-8 w-8 rounded-full" />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white group-hover:text-rose-400">{season.name}</h3>
                          <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{season.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10">{season.status}</Badge>
                            <Badge className="bg-white/10 text-white hover:bg-white/10">{season.participantMode}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
              No seasons available at this time.
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
