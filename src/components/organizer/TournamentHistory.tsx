import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, Users, Trophy, ChevronDown, ChevronUp, Search, Swords } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRawgGame } from "@/hooks/useRawgGame";
import { Link } from "react-router-dom";
import { usePublicBracketData } from "@/hooks/usePublicBracketData";
import { PublicBracketView } from "@/pages/tournaments/brackets/PublicBracketView";

type TournamentStatus = 'active' | 'upcoming' | 'completed' | 'all';

export default function TournamentHistory() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<TournamentStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchHistory();
    }, [user?.id]);

    const fetchHistory = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // 1. Fetch tournaments
            const { data: tData, error: tError } = await supabase
                .from('tournaments')
                .select(`
          id, name, game, start_date, status, format, team_size, 
          max_teams, prize_pool, logo_url, banner_url,
          participants:tournament_participants(count)
        `)
                .eq('organizer_id', user.id)
                .order('start_date', { ascending: false });

            if (tError) throw tError;

            // Classify status the same way useOrganizerStats does
            const now = new Date();
            const processedTournaments = tData?.map(t => {
                let computedStatus: TournamentStatus = 'completed';
                const startDate = new Date(t.start_date);

                if (['open', 'ongoing', 'check_in'].includes(t.status)) {
                    computedStatus = 'active';
                } else if (t.status === 'upcoming') {
                    computedStatus = 'upcoming';
                } else if (['completed', 'closed'].includes(t.status)) {
                    computedStatus = 'completed';
                } else {
                    if (startDate > now) computedStatus = 'upcoming';
                    else if (startDate.toDateString() === now.toDateString()) computedStatus = 'active';
                    else computedStatus = 'completed';
                }

                return {
                    ...t,
                    computedStatus,
                    participantCount: t.participants?.[0]?.count || 0,
                    matchHistory: null, // Fetched lazily
                    participantList: null, // Fetched lazily
                    detailsLoading: false
                };
            }) || [];

            setTournaments(processedTournaments);
        } catch (err) {
            console.error("Error fetching tournament history:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadTournamentDetails = async (tournamentId: string) => {
        // If we're closing it, just clear the expansion
        if (expandedId === tournamentId) {
            setExpandedId(null);
            return;
        }

        setExpandedId(tournamentId);

        // If data already exists, don't refetch
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (tournament?.matchHistory && tournament?.participantList) return;

        // Mark as loading details
        setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, detailsLoading: true } : t));

        try {
            // 1. Fetch Participants (up to 10 for preview)
            const { data: participantsData, error: participantsError } = await supabase
                .from('tournament_participants')
                .select(`
          id, participant_type, team_name, status,
          user:profiles!user_id (username, avatar_url),
          team:teams!team_id (name, logo_url)
        `)
                .eq('tournament_id', tournamentId)
                .limit(10);

            // Process participant names formatting
            const formattedParticipants = participantsData?.map(p => {
                const teamObj = Array.isArray(p.team) ? p.team[0] : p.team as any;
                const userObj = Array.isArray(p.user) ? p.user[0] : p.user as any;
                return {
                    id: p.id,
                    name: p.participant_type === 'team' ? (teamObj?.name || p.team_name || 'Unnamed Team') : (userObj?.username || 'Unknown Player'),
                    avatar: p.participant_type === 'team' ? teamObj?.logo_url : userObj?.avatar_url,
                    type: p.participant_type
                };
            }) || [];

            // 2. Fetch Match History
            // Since brkt_matches links through brkt_versions, we first need the active version for this tournament
            const { data: versionData } = await supabase
                .from('brkt_versions')
                .select('id')
                .eq('tournament_id', tournamentId)
                .eq('status', 'active')
                .limit(1)
                .maybeSingle();

            let matchData: any[] = [];
            if (versionData?.id) {
                const { data: matches } = await supabase
                    .from('brkt_matches')
                    .select(`
            id, round_index, match_number, status, team1_score, team2_score, scheduled_time, bracket_type,
            team1:teams!team1_id(name),
            team2:teams!team2_id(name),
            winner:teams!winner_id(name)
          `)
                    .eq('version_id', versionData.id)
                    .order('round_index', { ascending: false })
                    .limit(5); // Show latest 5 matches

                matchData = matches || [];
            } else {
                // Fallback for custom tournaments without brkt_versions
                const { data: fallbackMatches } = await supabase
                    .from('matches')
                    .select('*')
                    .eq('tournament_id', tournamentId)
                    .order('created_at', { ascending: false })
                    .limit(5);
                if (fallbackMatches && fallbackMatches.length > 0) matchData = fallbackMatches;
            }

            setTournaments(prev => prev.map(t =>
                t.id === tournamentId
                    ? { ...t, matchHistory: matchData, participantList: formattedParticipants, detailsLoading: false }
                    : t
            ));

        } catch (err) {
            console.error("Error fetching tournament nested details:", err);
            setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, detailsLoading: false } : t));
        }
    };

    const filteredTournaments = tournaments.filter(t => {
        if (filter !== 'all' && t.computedStatus !== filter) return false;
        if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fade-in-0 h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold font-heading">Tournament History</h2>
                    <p className="text-zinc-400">View past, active, and upcoming events</p>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                    <div className="relative flex-grow md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-zinc-900/50 border-white/5"
                        />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-1 bg-zinc-900/50 p-1 w-max rounded-lg border border-white/5">
                {(['all', 'active', 'upcoming', 'completed'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md capitalize transition-all",
                            filter === f ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
                </div>
            ) : filteredTournaments.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-white/5 border-dashed">
                    <Trophy className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-1">No tournaments found</h3>
                    <p className="text-zinc-500">
                        {searchQuery ? "Try adjusting your search or filters." : "You haven't organized any tournaments yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTournaments.map(tournament => (
                        <TournamentHistoryCard
                            key={tournament.id}
                            tournament={tournament}
                            isExpanded={expandedId === tournament.id}
                            onToggle={() => loadTournamentDetails(tournament.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function HistoryBracketView({ tournamentId }: { tournamentId: string }) {
    const { stages, activeVersionsMap, loading } = usePublicBracketData(tournamentId);
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

    useEffect(() => {
        if (stages && stages.length > 0 && !selectedStageId) {
            const stageWithVersion = [...stages].reverse().find(s => activeVersionsMap[s.id]);
            if (stageWithVersion) {
                setSelectedStageId(stageWithVersion.id);
            } else {
                setSelectedStageId(stages[stages.length - 1].id);
            }
        }
    }, [stages, activeVersionsMap, selectedStageId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
            </div>
        );
    }

    if (!stages || stages.length === 0) {
        return (
            <div className="p-8 text-center bg-zinc-900/30 rounded-lg border border-white/5 border-dashed text-zinc-500 text-sm">
                No bracket stages have been created yet.
            </div>
        );
    }

    return (
        <div className="w-full h-[500px] border border-white/10 rounded-xl overflow-hidden bg-[#121214]">
            <PublicBracketView
                versionId={selectedStageId ? activeVersionsMap[selectedStageId] : null}
                tournamentId={tournamentId}
                stages={stages}
                selectedStageId={selectedStageId}
                onStageSelect={setSelectedStageId}
                versionsMap={activeVersionsMap}
            />
        </div>
    );
}

function RawgThumbnail({ gameName }: { gameName: string }) {
    const rawgData = useRawgGame(gameName || "unknown");
    const displayLogo = rawgData.gameLogo || rawgData.gameBanner;
    return (
        <div
            className="h-16 w-16 md:h-12 md:w-12 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center bg-cover bg-center"
            style={displayLogo ? { backgroundImage: `url(${displayLogo})` } : {}}
        >
            {!displayLogo && <Trophy className="h-5 w-5 text-zinc-600" />}
        </div>
    );
}

function TournamentThumbnail({ tournament }: { tournament: any }) {
    const displayLogo = tournament.logo_url || tournament.banner_url;
    if (displayLogo) {
        return (
            <div
                className="h-16 w-16 md:h-12 md:w-12 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center bg-cover bg-center"
                style={{ backgroundImage: `url(${displayLogo})` }}
            />
        );
    }
    return <RawgThumbnail gameName={tournament.game} />;
}

function TournamentHistoryCard({ tournament, isExpanded, onToggle }: { tournament: any, isExpanded: boolean, onToggle: () => void }) {
    const [activeTab, setActiveTab] = useState<'matches' | 'participants'>('matches');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'completed': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
        }
    };

    return (
        <Card className={cn(
            "border-white/5 bg-[#0a0a0c] transition-all duration-200 overflow-hidden",
            isExpanded ? "border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.05)]" : "hover:border-white/10"
        )}>
            <div
                className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center cursor-pointer select-none group"
                onClick={onToggle}
            >
                {/* Thumbnail */}
                <TournamentThumbnail tournament={tournament} />

                {/* Info */}
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white truncate text-lg">{tournament.name}</h3>
                        <Badge variant="outline" className={cn("capitalize px-2 py-0.5 text-xs font-semibold", getStatusColor(tournament.computedStatus))}>
                            {tournament.computedStatus}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
                        <span className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-1.5" /> {format(new Date(tournament.start_date), 'MMM d, yyyy')}</span>
                        <span className="flex items-center"><Swords className="h-3.5 w-3.5 mr-1.5" /> {tournament.game || 'Unknown Game'}</span>
                        <span className="flex items-center"><Users className="h-3.5 w-3.5 mr-1.5" /> {tournament.participantCount} / {tournament.max_teams || '∞'} Registrations</span>
                    </div>
                </div>

                {/* Expand Icon */}
                <div className="flex-shrink-0 self-center hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-white transition-colors">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-white/5 bg-black/20 p-5 animate-in slide-in-from-top-2 fade-in duration-200">
                    {tournament.detailsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                        </div>
                    ) : (
                        <div>
                            {/* Tabs */}
                            <div className="flex justify-between items-center border-b border-white/5 pb-0 mb-5">
                                <div className="flex gap-4">
                                    <button
                                        className={cn("text-sm font-medium pb-2 transition-colors", activeTab === 'matches' ? "text-rose-500 border-b-2 border-rose-500" : "text-zinc-500 hover:text-zinc-300")}
                                        onClick={() => setActiveTab('matches')}
                                    >
                                        Brackets
                                    </button>
                                    <button
                                        className={cn("text-sm font-medium pb-2 transition-colors", activeTab === 'participants' ? "text-rose-500 border-b-2 border-rose-500" : "text-zinc-500 hover:text-zinc-300")}
                                        onClick={() => setActiveTab('participants')}
                                    >
                                        Teams
                                    </button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mb-2 h-8 text-xs border-white/10 hover:bg-white/5"
                                    asChild
                                >
                                    <Link to={`/tournaments/${tournament.id}`}>
                                        View Full
                                    </Link>
                                </Button>
                            </div>

                            {/* Match Tab Content */}
                            {activeTab === 'matches' && (
                                <div className="w-full">
                                    <HistoryBracketView tournamentId={tournament.id} />
                                </div>
                            )}

                            {/* Participant Tab Content */}
                            {activeTab === 'participants' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {tournament.participantList?.length > 0 ? (
                                        <>
                                            {tournament.participantList.map((p: any) => (
                                                <div key={p.id} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-lg border border-white/5">
                                                    <div
                                                        className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0 bg-cover bg-center overflow-hidden"
                                                        style={p.avatar ? { backgroundImage: `url(${p.avatar})` } : {}}
                                                    >
                                                        {!p.avatar && <Users className="h-4 w-4 text-zinc-500" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-zinc-300 truncate">{p.name}</p>
                                                        <p className="text-xs text-zinc-600 capitalize">{p.type}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {tournament.participantCount > 10 && (
                                                <div className="flex items-center justify-center p-2 rounded-lg border border-white/5 border-dashed">
                                                    <span className="text-xs text-zinc-500">+{tournament.participantCount - 10} more</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="col-span-full p-4 text-center bg-zinc-900/30 rounded-lg border border-white/5 border-dashed text-zinc-500 text-sm">
                                            No participants registered yet.
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
