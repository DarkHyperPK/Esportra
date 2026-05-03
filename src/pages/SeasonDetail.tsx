import { useParams } from 'react-router-dom';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Season, SeasonTournament, SeasonStanding } from '@/types/season';
import { Calendar, Users, Trophy, TrendingUp } from 'lucide-react';

export default function SeasonDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: season, isLoading: seasonLoading } = useQuery<Season>({
    queryKey: ['publicSeason', slug],
    queryFn: () => apiClient.get(`/api/public/seasons/${slug}`),
    enabled: !!slug,
  });

  const { data: tournaments } = useQuery<SeasonTournament[]>({
    queryKey: ['seasonTournaments', season?.id],
    queryFn: () => apiClient.get(`/api/public/seasons/${season?.id}/tournaments`),
    enabled: !!season?.id,
  });

  const { data: standings } = useQuery<SeasonStanding[]>({
    queryKey: ['seasonStandings', season?.id],
    queryFn: () => apiClient.get(`/api/public/seasons/${season?.id}/standings`),
    enabled: !!season?.id,
  });

  if (seasonLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
            Loading season...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
            <p className="font-semibold text-red-100">Season not found.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10">{season.status}</Badge>
              <Badge className="bg-white/10 text-white hover:bg-white/10">{season.participantMode}</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight">{season.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">{season.description}</p>

            {season.bannerUrl && (
              <div className="mt-6 aspect-[21/9] overflow-hidden rounded-3xl bg-black/20">
                <img src={season.bannerUrl} alt={season.name} className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          {/* Info Cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center gap-2 text-zinc-400">
                <Users className="h-4 w-4" />
                <span className="text-sm">Mode</span>
              </div>
              <p className="mt-2 text-lg font-semibold">{season.participantMode}</p>
            </div>
            {season.startDate && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Start</span>
                </div>
                <p className="mt-2 text-lg font-semibold">{new Date(season.startDate).toLocaleDateString()}</p>
              </div>
            )}
            {season.endDate && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">End</span>
                </div>
                <p className="mt-2 text-lg font-semibold">{new Date(season.endDate).toLocaleDateString()}</p>
              </div>
            )}
            {tournaments && tournaments.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm">Tournaments</span>
                </div>
                <p className="mt-2 text-lg font-semibold">{tournaments.length}</p>
              </div>
            )}
          </div>

          {/* Tournaments */}
          {tournaments && tournaments.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold">Tournaments</h2>
              <div className="mt-4 space-y-3">
                {tournaments.map((st) => (
                  <div key={st.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div>
                      <p className="font-semibold text-white">{st.displayName || st.tournamentName}</p>
                      <p className="text-sm text-zinc-400">Role: {st.role} · Status: {st.status}</p>
                    </div>
                    <Badge className="bg-white/10">{st.tournamentStatus}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Standings */}
          {standings && standings.length > 0 && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Standings</h2>
                <Button variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Full Standings
                </Button>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="space-y-2">
                  {standings.slice(0, 10).map((standing, index) => (
                    <div key={standing.id} className="flex items-center justify-between rounded-xl bg-black/20 p-3">
                      <div className="flex items-center gap-4">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-white">{standing.teamName}</p>
                          <p className="text-xs text-zinc-400">
                            {standing.tournamentsPlayed} tournaments · Best: #{standing.bestFinish}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-rose-400">{standing.totalPoints} pts</p>
                        <Badge className="bg-white/10 text-xs">{standing.currentStatus}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
