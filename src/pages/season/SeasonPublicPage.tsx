import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar, Users, ArrowRight, Gamepad2, Loader2, Swords } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRegisterForSeason, useSeasonParticipants } from '@/hooks/useSeasonParticipants';
import { useSeason } from '@/hooks/useSeasons';
import { useSeasonStandings } from '@/hooks/useSeason';
import { useSeasonTournaments } from '@/hooks/useSeasonStandings';
import { useSeasonAdvancement } from '@/hooks/useSeasons';

export default function SeasonPublicPage() {
  const params = useParams<{ slug?: string; id?: string }>();
  const slug = params.slug ?? params.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegisterForSeason();

  const seasonQuery = useSeason(slug ?? '');
  const seasonId = seasonQuery.data?.id ?? '';

  const tournamentsQuery = useSeasonTournaments(seasonId);
  const standingsQuery = useSeasonStandings(seasonId);
  const participantsQuery = useSeasonParticipants(seasonId);
  const advancementQuery = useSeasonAdvancement(seasonId);

  const season = seasonQuery.data;
  const tournaments = tournamentsQuery.data ?? [];
  const standings = standingsQuery.data ?? [];
  const participants = participantsQuery.data ?? [];
  const advancementConnections = advancementQuery.data ?? [];

  const isLoading =
    seasonQuery.isLoading ||
    (seasonId && (tournamentsQuery.isLoading || standingsQuery.isLoading || participantsQuery.isLoading || advancementQuery.isLoading));

  const error =
    seasonQuery.error?.message ??
    tournamentsQuery.error?.message ??
    standingsQuery.error?.message ??
    participantsQuery.error?.message ??
    advancementQuery.error?.message ??
    null;

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

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="w-8 h-8 flex items-center justify-center bg-rose-500 text-black text-sm font-black">1</span>;
    if (rank === 2) return <span className="w-8 h-8 flex items-center justify-center bg-[#2a2a2a] text-white text-sm font-bold">2</span>;
    if (rank === 3) return <span className="w-8 h-8 flex items-center justify-center bg-[#2a2a2a] text-white text-sm font-bold">3</span>;
    return <span className="w-8 h-8 flex items-center justify-center text-[#555555] text-sm font-bold">{rank}</span>;
  };

  if (isLoading) {
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
      {/* Subtle dot grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10">
        {/* HERO */}
        <div className="relative overflow-hidden border-b border-[#1a1a1a]">
          {season.banner_url && (
            <div className="absolute inset-0 z-0">
              <img src={season.banner_url} alt="" className="w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/70 to-[#050505]" />
            </div>
          )}
          <div className="relative z-10 px-8 py-16 md:py-24">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-[2px] bg-rose-500" />
                <span className="text-rose-400 text-[10px] font-bold tracking-[0.25em] uppercase">SEASON</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight mb-6 leading-[0.95]">{season.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${getStatusColor(season.status)} text-white`}>
                  {season.status}
                </span>
                <span className="flex items-center gap-2 text-[#808080] text-sm">
                  <Gamepad2 className="w-4 h-4" /> {season.game}
                </span>
                {(season.start_date || season.end_date) && (
                  <span className="flex items-center gap-2 text-[#808080] text-sm">
                    <Calendar className="w-4 h-4" />
                    {formatDate(season.start_date)} — {formatDate(season.end_date)}
                  </span>
                )}
              </div>
              {season.description && (
                <p className="text-[#a0a0a0] text-lg max-w-2xl leading-relaxed">{season.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="px-8 py-8 border-b border-[#1a1a1a]">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1a1a1a]">
            {[
              { icon: Trophy, label: 'TOURNAMENTS', value: tournaments.length, accent: 'text-rose-400' },
              { icon: Users, label: 'TEAMS', value: participants.length, accent: 'text-emerald-400' },
              { icon: Swords, label: 'IN STANDINGS', value: standings.length, accent: 'text-blue-400' },
              { icon: Calendar, label: 'DURATION', value: season.start_date && season.end_date ? `${Math.ceil((new Date(season.end_date).getTime() - new Date(season.start_date).getTime()) / (1000 * 60 * 60 * 24))} DAYS` : 'TBD', accent: 'text-amber-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#0a0a0a] p-6">
                <stat.icon className={`w-5 h-5 ${stat.accent} mb-3`} />
                <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
                <p className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* REGISTER CTA */}
        {(season.status === 'published' || season.status === 'active') && (
          <div className="px-8 py-8 border-b border-[#1a1a1a]">
            <div className="max-w-6xl mx-auto border border-rose-500/20 bg-rose-500/5 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-1">REGISTER YOUR TEAM</h3>
                <p className="text-[#808080] text-sm">Join this season and compete against {participants.length} other team{participants.length !== 1 ? 's' : ''}.</p>
              </div>
              <Button
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="h-12 px-8 bg-white text-black text-xs font-bold uppercase tracking-[0.15em] hover:bg-[#e0e0e0] active:bg-[#cccccc] transition-none"
              >
                {registerMutation.isPending ? 'SUBMITTING...' : 'REGISTER FOR SEASON'}
              </Button>
            </div>
          </div>
        )}

        <div className="px-8 py-16">
          <div className="max-w-6xl mx-auto space-y-20">
            {/* TOURNAMENT PIPELINE */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">// THE PIPELINE</span>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tight mb-10">TOURNAMENT SCHEDULE</h2>

              {tournaments.length === 0 ? (
                <div className="border border-[#2a2a2a] bg-[#0a0a0a] p-10 text-center">
                  <p className="text-[#555555] text-sm uppercase tracking-wider">No tournaments scheduled yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Timeline header */}
                  <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
                    {tournaments.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-0 flex-shrink-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rotate-45 ${i === tournaments.length - 1 ? 'bg-rose-500' : 'bg-white'}`} />
                          <span className="text-[9px] font-bold text-[#555555] uppercase tracking-widest mt-2 whitespace-nowrap">
                            {t.season_role || `STAGE ${i + 1}`}
                          </span>
                        </div>
                        {i < tournaments.length - 1 && (
                          <div className="w-16 h-[1px] bg-[#2a2a2a] mx-2" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Tournament cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tournaments.map((t) => (
                      <div key={t.id} className="border border-[#1a1a1a] bg-[#0a0a0a] p-6 hover:border-rose-500/30 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${getTournamentStatusColor(t.status)} text-white`}>
                            {t.status}
                          </span>
                          {t.season_role && (
                            <span className="text-[9px] font-bold text-[#555555] uppercase tracking-widest">{t.season_role}</span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-2 group-hover:text-rose-400 transition-colors">{t.name}</h3>
                        <p className="text-sm text-[#808080] mb-4">
                          {formatDate(t.start_date)} — {formatDate(t.end_date)}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#555555]">{t.current_participants} participants</span>
                          <Link to={`/tournament/${t.slug}`}>
                            <span className="text-xs font-bold text-[#808080] uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                              VIEW <ArrowRight className="w-3 h-3" />
                            </span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* STANDINGS */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">// RANKINGS</span>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tight mb-10">SEASON STANDINGS</h2>

              {standings.length === 0 ? (
                <div className="border border-[#2a2a2a] bg-[#0a0a0a] p-10 text-center">
                  <p className="text-[#555555] text-sm uppercase tracking-wider">No standings data yet.</p>
                </div>
              ) : (
                <div className="border border-[#1a1a1a]">
                  <div className="grid grid-cols-12 gap-0 border-b border-[#2a2a2a] bg-[#0a0a0a]">
                    <div className="col-span-1 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider">RANK</div>
                    <div className="col-span-7 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider">TEAM</div>
                    <div className="col-span-2 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider text-center">STATUS</div>
                    <div className="col-span-2 px-4 py-3 text-[10px] font-bold text-[#555555] uppercase tracking-wider text-right">POINTS</div>
                  </div>
                  {standings.map((s) => (
                    <div key={s.id} className="grid grid-cols-12 gap-0 border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                      <div className="col-span-1 px-4 py-4 flex items-center">{getRankBadge(s.rank ?? 0)}</div>
                      <div className="col-span-7 px-4 py-4 flex items-center gap-3">
                        {s.team_logo_url && (
                          <img src={s.team_logo_url} alt="" className="w-8 h-8 object-cover" />
                        )}
                        <span className="font-semibold text-white">{s.team_name || 'Unknown Team'}</span>
                      </div>
                      <div className="col-span-2 px-4 py-4 flex items-center justify-center">
                        {s.qualification_status && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                            s.qualification_status === 'qualified'
                              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                              : s.qualification_status === 'eliminated'
                                ? 'border-red-500/30 text-red-400 bg-red-500/10'
                                : 'border-[#2a2a2a] text-[#808080] bg-[#111111]'
                          }`}>
                            {s.qualification_status}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 px-4 py-4 flex items-center justify-end">
                        <span className="text-xl font-black text-white">{s.total_points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* QUALIFICATION TRACKER */}
            {advancementConnections.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">// ADVANCEMENT</span>
                </div>
                <h2 className="text-4xl font-black uppercase tracking-tight mb-10">QUALIFICATION TRACKER</h2>

                <div className="space-y-6">
                  {advancementConnections.map((conn) => (
                    <div key={conn.id} className="border border-[#1a1a1a] bg-[#0a0a0a] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white">{conn.sourceNodeName}</span>
                          <ArrowRight className="w-4 h-4 text-[#555555]" />
                          <span className="text-sm font-bold text-emerald-400">{conn.targetNodeName}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#555555] uppercase tracking-wider">
                          Places {conn.placementStart}–{conn.placementEnd}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {standings
                          .filter((s) => {
                            const rank = s.rank ?? 0;
                            return rank >= conn.placementStart && rank <= conn.placementEnd;
                          })
                          .slice(0, conn.advancementCount)
                          .map((s) => (
                            <div key={s.id} className="flex items-center gap-3 border-b border-[#1a1a1a] last:border-0 pb-2 last:pb-0">
                              {s.team_logo_url && (
                                <img src={s.team_logo_url} alt="" className="w-6 h-6 object-cover" />
                              )}
                              <span className="text-sm text-white flex-1">{s.team_name || 'Unknown Team'}</span>
                              <span className="text-xs text-[#555555]">Rank #{s.rank ?? '—'}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
                                s.qualification_status === 'qualified'
                                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                  : 'border-[#2a2a2a] text-[#808080] bg-[#111111]'
                              }`}>
                                {s.qualification_status || 'pending'}
                              </span>
                            </div>
                          ))}
                        {standings.filter((s) => {
                          const rank = s.rank ?? 0;
                          return rank >= conn.placementStart && rank <= conn.placementEnd;
                        }).length === 0 && (
                          <p className="text-sm text-[#555555] text-center py-4">No standings data for this path yet.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* REGISTERED TEAMS */}
            <section>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">// COMPETITORS</span>
              </div>
              <h2 className="text-4xl font-black uppercase tracking-tight mb-10">REGISTERED TEAMS</h2>

              {participants.length === 0 ? (
                <div className="border border-[#2a2a2a] bg-[#0a0a0a] p-10 text-center">
                  <p className="text-[#555555] text-sm uppercase tracking-wider">No teams registered yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-[#1a1a1a]">
                  {participants.map((p) => (
                    <div key={p.id} className="bg-[#0a0a0a] p-6 flex flex-col items-center text-center group hover:bg-[#111111] transition-colors">
                      {p.team_logo_url ? (
                        <img src={p.team_logo_url} alt={p.team_name} className="w-14 h-14 object-cover mb-3" />
                      ) : (
                        <div className="w-14 h-14 bg-[#1a1a1a] flex items-center justify-center mb-3">
                          <Users className="w-6 h-6 text-[#404040]" />
                        </div>
                      )}
                      <p className="font-semibold text-sm text-white truncate w-full">{p.team_name}</p>
                      <p className="text-[10px] text-[#555555] uppercase tracking-wider mt-1">{p.status}</p>
                    </div>
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
