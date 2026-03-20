import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import Footer from '@/components/Footer';
import { Trophy, Calendar, Clock, MapPin } from 'lucide-react';

const PlayerHistory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const historyQuery = useQuery({
        queryKey: ['tournaments', 'my-history'],
        queryFn: () => apiClient.get<any[]>('/api/tournaments/me/history'),
        enabled: !!user,
        staleTime: 1000 * 60 * 2,
    });

    const { activeTournaments, pastTournaments } = useMemo(() => {
        const allTournaments = historyQuery.data || [];
        const active: any[] = [];
        const past: any[] = [];

        for (const t of allTournaments) {
            let status = t.status;
            if (!status) {
                const tDate = t.start_date ? new Date(t.start_date) : null;
                const now = new Date();
                if (tDate && tDate < now) status = 'completed';
                else status = 'upcoming';
            }

            if (status === 'completed') {
                past.push(t);
            } else {
                active.push(t);
            }
        }

        return { activeTournaments: active, pastTournaments: past };
    }, [historyQuery.data]);
    const loading = historyQuery.isLoading;

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'upcoming': return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20">Upcoming</Badge>;
            case 'ongoing': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 animate-pulse">Live</Badge>;
            case 'completed': return <Badge className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20">Finished</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const TournamentList = ({ list, emptyMsg }: { list: any[], emptyMsg: string }) => {
        if (list.length === 0) return <div className="text-gray-500 italic py-8 text-center">{emptyMsg}</div>;

        return (
            <div className="space-y-4">
                {list.map((t) => (
                    <div key={t.id} className="group relative overflow-hidden rounded-xl bg-[#121214] border border-zinc-800 p-4 transition-all hover:border-rose-500/50 hover:shadow-[0_0_30px_-5px_rgba(244,63,94,0.1)]">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 relative z-10">
                            {/* Image/Icon */}
                            <div className="h-16 w-16 shrink-0 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                {t.banner_url || t.logo_url ? (
                                    <img src={t.banner_url || t.logo_url} alt={t.game} className="h-full w-full object-cover" />
                                ) : (
                                    <Trophy className="h-6 w-6 text-zinc-700" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-grow">
                                <div className="flex flex-wrap gap-2 mb-1">
                                    <StatusBadge status={t.status || 'upcoming'} />
                                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider py-1">{t.game}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-rose-500 transition-colors">{t.name}</h3>
                                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                                    <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.start_date ? new Date(t.start_date).toLocaleDateString() : 'TBD'}</div>
                                    {t.prize_pool && <div className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-500" /> ${t.prize_pool}</div>}
                                </div>
                            </div>

                            {/* Action */}
                            <div className="mt-4 md:mt-0">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-zinc-700 hover:border-rose-500 hover:text-rose-500 bg-transparent"
                                    onClick={() => navigate(`/tournaments/${t.slug || t.id}`)}
                                >
                                    View Details
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-rose-500/30 font-sans">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 max-w-5xl">
                <div className="mb-12 border-b border-white/10 pb-6">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">MY <span className="text-rose-500">HISTORY</span></h1>
                    <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">/records/tournament-entries</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">Loading history...</div>
                ) : (
                    <div className="grid gap-12">
                        <section>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Active Tournaments
                            </h2>
                            <TournamentList list={activeTournaments} emptyMsg="No active tournaments found. Go join one!" />
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-t border-white/5 pt-8">
                                <div className="w-2 h-2 bg-zinc-700 rounded-full" />
                                Past Participation
                            </h2>
                            <TournamentList list={pastTournaments} emptyMsg="No past tournaments found." />
                        </section>
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default PlayerHistory;
