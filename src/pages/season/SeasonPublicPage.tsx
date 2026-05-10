import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Users, ArrowRight, Gamepad2, Loader2, Swords } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRegisterForSeason } from '@/hooks/useSeasonParticipants';
import type { Season, SeasonStanding, SeasonTournamentDetails, SeasonParticipant } from '@/types/season';

export default function SeasonPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegisterForSeason();

  const [season, setSeason] = useState<Season | null>(null);
  const [tournaments, setTournaments] = useState<SeasonTournamentDetails[]>([]);
  const [standings, setStandings] = useState<SeasonStanding[]>([]);
  const [participants, setParticipants] = useState<SeasonParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const seasonData = await apiClient.get<Season>(`/api/seasons/slug/${slug}`);
        setSeason(seasonData);

        if (seasonData?.id) {
          const [tournamentsData, standingsData, participantsData] = await Promise.all([
            apiClient.get<SeasonTournamentDetails[]>(`/api/seasons/${seasonData.id}/tournaments`).catch(() => []),
            apiClient.get<SeasonStanding[]>(`/api/seasons/${seasonData.id}/standings?page=1&limit=10`).catch(() => []),
            apiClient.get<SeasonParticipant[]>(`/api/seasons/${seasonData.id}/participants`).catch(() => []),
          ]);
          setTournaments(tournamentsData);
          setStandings(standingsData);
          setParticipants(participantsData);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load season');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const handleRegister = () => {
    if (!season) return;
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to register your team.' });
      return;
    }
    registerMutation.mutate(season.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-blue-500';
      case 'live': return 'bg-green-500';
      case 'completed': return 'bg-purple-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTournamentStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-500';
      case 'ongoing': return 'bg-blue-500';
      case 'completed': return 'bg-purple-500';
      case 'closed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">{error || 'Season not found'}</p>
          <Link to="/">
            <Button variant="outline" className="border-gray-700 hover:bg-white/10">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Header */}
        <div className="relative overflow-hidden">
          {season.banner_url && (
            <div className="absolute inset-0 z-0">
              <img src={season.banner_url} alt="" className="w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]" />
            </div>
          )}
          <div className="relative z-10 container mx-auto px-4 py-12 md:py-20">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-[1px] bg-rose-500" />
                <span className="text-rose-500 font-mono text-xs tracking-widest uppercase">SEASON</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">{season.name}</h1>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Badge className={`${getStatusColor(season.status)} text-white`}>{season.status}</Badge>
                <span className="flex items-center gap-2 text-gray-400">
                  <Gamepad2 className="w-4 h-4" /> {season.game}
                </span>
                {(season.start_date || season.end_date) && (
                  <span className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    {season.start_date ? new Date(season.start_date).toLocaleDateString() : 'TBD'}
                    {' - '}
                    {season.end_date ? new Date(season.end_date).toLocaleDateString() : 'TBD'}
                  </span>
                )}
              </div>
              {season.description && (
                <p className="text-gray-300 text-lg max-w-2xl">{season.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="container mx-auto px-4 mb-8">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-[#0a0a0c] p-4 text-center">
              <Trophy className="w-6 h-6 text-rose-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{tournaments.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Tournaments</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0a0a0c] p-4 text-center">
              <Users className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{participants.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Teams</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0a0a0c] p-4 text-center">
              <Swords className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{standings.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">In Standings</p>
            </div>
          </div>
        </div>

        {/* Register CTA */}
        {(season.status === 'published' || season.status === 'live') && (
          <div className="container mx-auto px-4 mb-10">
            <div className="max-w-4xl mx-auto rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Register your team</h3>
                <p className="text-gray-400 text-sm">Join this season and compete against {participants.length} other team{participants.length !== 1 ? 's' : ''}.</p>
              </div>
              <Button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold"
              >
                {registerMutation.isPending ? 'Submitting...' : 'Register for Season'}
              </Button>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 pb-20">
          <div className="max-w-4xl mx-auto space-y-10">
            {/* Tournament Schedule */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-rose-400" />
                Tournament Schedule
              </h2>
              {tournaments.length === 0 ? (
                <Card className="bg-[#0a0a0c] border border-white/10">
                  <CardContent className="p-8 text-center text-gray-400">No tournaments scheduled yet.</CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {tournaments.map((t) => (
                    <Card key={t.id} className="bg-[#0a0a0c] border border-white/10 hover:border-rose-500/30 transition-colors">
                      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <Badge className={`${getTournamentStatusColor(t.status)} text-white`}>{t.status}</Badge>
                            {t.season_role && <span className="text-xs text-gray-500 uppercase">{t.season_role}</span>}
                          </div>
                          <h3 className="text-lg font-semibold">{t.name}</h3>
                          <p className="text-sm text-gray-400">
                            {t.start_date ? new Date(t.start_date).toLocaleDateString() : 'TBD'}
                            {' - '}
                            {t.end_date ? new Date(t.end_date).toLocaleDateString() : 'TBD'}
                            {' · '}
                            {t.current_participants} participants
                          </p>
                        </div>
                        <Link to={`/tournament/${t.slug}`}>
                          <Button variant="outline" size="sm" className="border-gray-700 hover:bg-white/10">
                            View <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Standings */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                Season Standings
              </h2>
              {standings.length === 0 ? (
                <Card className="bg-[#0a0a0c] border border-white/10">
                  <CardContent className="p-8 text-center text-gray-400">No standings data yet.</CardContent>
                </Card>
              ) : (
                <Card className="bg-[#0a0a0c] border border-white/10 overflow-hidden">
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-4 text-gray-400 font-medium text-sm">Rank</th>
                          <th className="text-left p-4 text-gray-400 font-medium text-sm">Team</th>
                          <th className="text-right p-4 text-gray-400 font-medium text-sm">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, i) => (
                          <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <span className="font-bold text-lg">{i + 1}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {s.team_logo_url && (
                                  <img src={s.team_logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                )}
                                <span className="font-medium">{s.team_name || 'Unknown Team'}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <span className="text-xl font-bold text-emerald-400">{s.total_points}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Registered Teams */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-emerald-400" />
                Registered Teams
              </h2>
              {participants.length === 0 ? (
                <Card className="bg-[#0a0a0c] border border-white/10">
                  <CardContent className="p-8 text-center text-gray-400">No teams registered yet.</CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {participants.map((p) => (
                    <Card key={p.id} className="bg-[#0a0a0c] border border-white/10">
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        {p.team_logo_url ? (
                          <img src={p.team_logo_url} alt={p.team_name} className="w-12 h-12 rounded-full object-cover mb-2" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-2">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                        <p className="font-medium text-sm truncate w-full">{p.team_name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
