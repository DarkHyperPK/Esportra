import React, { memo, useCallback, useEffect, useState } from 'react';
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, Users, Trophy, ChevronDown, ChevronUp, Search, Swords } from "lucide-react";
import { apiClient } from '@/lib/apiClient';
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRawgGame } from "@/hooks/useRawgGame";
import { Link } from "react-router-dom";
import { usePublicBracketData } from "@/hooks/usePublicBracketData";
import { PublicBracketView } from "@/pages/tournaments/brackets/PublicBracketView";
import BRGroupStageView from '@/components/tournament/br/BRGroupStageView';
import { useGameTerminology } from '@/hooks/useGameTerminology';
import { formatParticipantDisplay, getPersistedTournamentFormat, isBattleRoyaleTournament } from '@/utils/gameFeatures';
import { getStageBRConfig } from '@/utils/brConfigResolve';
import { CommandButton, CommandEmptyState, CommandPanel, CommandTabs, CommandTabButton, CommandToolbar } from "@/components/management/CommandSurface";

type TournamentFilterStatus = 'active' | 'upcoming' | 'completed' | 'all';

export default function TournamentHistory() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<TournamentFilterStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // 1. Fetch tournaments
            const rawData = await apiClient.get<any>(`/api/tournaments?organizer_id=${user.id}`);
            const tData: any[] = Array.isArray(rawData) ? rawData : (rawData?.items || rawData?.data || []);

            const processedTournaments = tData.map(t => {
                // Map DB status to filter groups, inferring 'ongoing' from dates
                let computedStatus: TournamentFilterStatus = 'completed';
                const s = t.status as string;

                if (s === 'ongoing') {
                    computedStatus = 'active';
                } else if (['draft', 'published', 'open', 'closed'].includes(s)) {
                    computedStatus = 'upcoming';
                } else if (['completed', 'cancelled'].includes(s)) {
                    computedStatus = 'completed';
                }

                return {
                    ...t,
                    computedStatus,
                    participantCount: t.registration_count ?? t.participant_count ?? t.current_participants ?? t.participants?.[0]?.count ?? 0,
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
    }, [user?.id]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const fetchTournamentDetails = useCallback(async (tournamentId: string) => {
        const tournament = tournaments.find(t => t.id === tournamentId);
        if (tournament?.detailsLoading || tournament?.participantList) return;

        setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, detailsLoading: true } : t));

        try {
            const rawParticipants = await apiClient.get<any>(`/api/tournaments/${tournamentId}/participants`).catch(() => []);
            const participantsData: any[] = Array.isArray(rawParticipants) ? rawParticipants : (rawParticipants?.items || rawParticipants?.data || []);

            const formattedParticipants = participantsData?.map(p => ({
                id: p.id,
                ...formatParticipantDisplay(p),
            })) || [];

            setTournaments(prev => prev.map(t =>
                t.id === tournamentId
                    ? { ...t, participantList: formattedParticipants, detailsLoading: false }
                    : t
            ));

        } catch (err) {
            console.error("Error fetching tournament nested details:", err);
            setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, detailsLoading: false } : t));
        }
    }, [tournaments]);

    const toggleTournament = useCallback((tournamentId: string) => {
        if (expandedId === tournamentId) {
            setExpandedId(null);
            return;
        }

        setExpandedId(tournamentId);
        void fetchTournamentDetails(tournamentId);
    }, [expandedId, fetchTournamentDetails]);

    const filteredTournaments = tournaments.filter(t => {
        if (filter !== 'all' && t.computedStatus !== filter) return false;
        if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="space-y-4 h-full">
            <CommandToolbar>
                <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">Archive</p>
                    <h2 className="mt-1 text-xl font-black uppercase text-white">Tournament History</h2>
                </div>
                <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 rounded-none border-white/10 bg-black/40 pl-9 text-white placeholder:text-zinc-600 focus:border-rose-500"
                        />
                </div>
            </CommandToolbar>

            <CommandTabs
                active={filter}
                onChange={(value) => setFilter(value as TournamentFilterStatus)}
                tabs={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'upcoming', label: 'Upcoming' },
                    { value: 'completed', label: 'Completed' },
                ]}
            />

            {/* List */}
            {loading ? (
                <CommandPanel className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 text-rose-500 animate-spin" />
                </CommandPanel>
            ) : filteredTournaments.length === 0 ? (
                <CommandEmptyState
                    title="No tournaments found"
                    description={searchQuery ? "Try adjusting your search or filters." : "Hosted tournament history will appear here."}
                    icon={<Trophy className="h-5 w-5" />}
                />
            ) : (
                <div className="space-y-4">
                    {filteredTournaments.map(tournament => (
                        <TournamentHistoryCard
                            key={tournament.id}
                            tournament={tournament}
                            isExpanded={expandedId === tournament.id}
                            onToggle={() => toggleTournament(tournament.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function HistoryBRView({
    tournamentId,
    gameName,
    tournamentSlug,
}: {
    tournamentId: string;
    gameName: string;
    tournamentSlug?: string | null;
}) {
    const { stages, loading } = usePublicBracketData(tournamentId, { includeVersions: false });
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

    useEffect(() => {
        if (stages.length > 0 && !selectedStageId) {
            const brStage =
                stages.find((s) => (s.format || '').toLowerCase().replace(/-/g, '_') === 'battle_royale') ||
                stages[stages.length - 1];
            setSelectedStageId(brStage.id);
        }
    }, [stages, selectedStageId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
            </div>
        );
    }

    if (!stages.length) {
        return (
            <div className="border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
                No game stages have been created yet.
            </div>
        );
    }

    const selectedStage = stages.find((s) => s.id === selectedStageId);

    return (
        <div className="w-full space-y-3">
            {stages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {stages.map((stage) => (
                        <button
                            key={stage.id}
                            type="button"
                            onClick={() => setSelectedStageId(stage.id)}
                            className={cn(
                                'px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap border',
                                selectedStageId === stage.id
                                    ? 'bg-white/10 border-white/20 text-white'
                                    : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]',
                            )}
                        >
                            {stage.name || `Stage ${stage.stage_order + 1}`}
                        </button>
                    ))}
                </div>
            )}
            {selectedStageId && selectedStage && (
                <div className="min-h-[420px] w-full overflow-hidden border border-white/10 bg-[#0a0a0c] md:min-h-[500px]">
                    <BRGroupStageView
                        stageId={selectedStageId}
                        gameName={gameName}
                        stageFormat={getStageBRConfig(selectedStage)?.format}
                        qualificationCount={(selectedStage as { advancement_count?: number }).advancement_count}
                    />
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
            <div className="border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
                No bracket stages have been created yet.
            </div>
        );
    }

    return (
        <div className="h-[420px] w-full overflow-hidden border border-white/10 bg-[#0a0a0c] md:h-[500px]">
            <PublicBracketView
                versionId={selectedStageId ? activeVersionsMap[selectedStageId] : null}
                tournamentId={tournamentId}
                stages={stages}
                selectedStageId={selectedStageId}
                onStageSelect={setSelectedStageId}
                versionsMap={activeVersionsMap}
                mode="embedded"
                disableMotion
                height="100%"
            />
        </div>
    );
}

function RawgThumbnail({ gameName }: { gameName: string }) {
    const rawgData = useRawgGame(gameName || "unknown");
    const displayLogo = rawgData.gameLogo || rawgData.gameBanner;
    return (
        <div
            className="h-16 w-16 md:h-12 md:w-12 bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center bg-cover bg-center"
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
                className="h-16 w-16 md:h-12 md:w-12 bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center bg-cover bg-center"
                style={{ backgroundImage: `url(${displayLogo})` }}
            />
        );
    }
    return <RawgThumbnail gameName={tournament.game} />;
}

const TournamentHistoryCard = memo(function TournamentHistoryCard({ tournament, isExpanded, onToggle }: { tournament: any, isExpanded: boolean, onToggle: () => void }) {
    const [activeTab, setActiveTab] = useState<'matches' | 'participants'>('participants');
    const isBR = isBattleRoyaleTournament(
        tournament.game || '',
        getPersistedTournamentFormat(tournament),
    );
    const terminology = useGameTerminology(tournament.game, tournament.game_mode, tournament.team_size > 1 ? 'team' : 'solo');
    const resultsTabLabel = isBR ? 'Games' : 'Brackets';
    const participantsTabLabel = terminology.competitorLabelPlural;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'border-emerald-500/40 text-emerald-300';
            case 'upcoming': return 'border-amber-500/40 text-amber-300';
            case 'completed': return 'border-white/15 text-zinc-400';
            default: return 'border-white/15 text-zinc-400';
        }
    };

    return (
        <CommandPanel className={cn(
            "overflow-hidden p-0 transition-colors",
            isExpanded ? "border-rose-500/35" : "hover:border-white/20"
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
                        <h3 className="font-bold text-white truncate text-lg uppercase">{tournament.name}</h3>
                        <span className={cn("border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider", getStatusColor(tournament.computedStatus))}>
                            {tournament.computedStatus}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
                        <span className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-1.5" /> {format(new Date(tournament.start_date), 'MMM d, yyyy')}</span>
                        <span className="flex items-center"><Swords className="h-3.5 w-3.5 mr-1.5" /> {tournament.game || 'Unknown Game'}</span>
                        <span className="flex items-center"><Users className="h-3.5 w-3.5 mr-1.5" /> {tournament.participantCount} / {tournament.max_teams || tournament.max_participants || '∞'} Registrations</span>
                    </div>
                </div>

                {/* Expand Icon */}
                <div className="flex-shrink-0 self-center hidden md:flex h-8 w-8 items-center justify-center border border-white/10 bg-white/[0.02] text-zinc-400 group-hover:bg-white group-hover:text-black transition-colors">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-white/5 bg-black/20 p-5">
                    {tournament.detailsLoading ? (
                        <div className="grid gap-3 py-2 md:grid-cols-3">
                            {[0, 1, 2].map((item) => (
                                <div key={item} className="h-14 animate-pulse border border-white/10 bg-white/[0.03]" />
                            ))}
                        </div>
                    ) : (
                        <div>
                            {/* Tabs */}
                            <div className="flex justify-between items-center border-b border-white/5 pb-0 mb-5">
                                <div className="flex gap-4">
                                    <CommandTabButton
                                        active={activeTab === 'matches'}
                                        className="px-3 py-2 text-[10px]"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setActiveTab('matches');
                                        }}
                                    >
                                        {resultsTabLabel}
                                    </CommandTabButton>
                                    <CommandTabButton
                                        active={activeTab === 'participants'}
                                        className="px-3 py-2 text-[10px]"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setActiveTab('participants');
                                        }}
                                    >
                                        {participantsTabLabel}
                                    </CommandTabButton>
                                </div>
                                <CommandButton size="sm" variant="secondary" asChild onClick={(event) => event.stopPropagation()}>
                                    <Link to={`/tournaments/${tournament.slug || tournament.id}`}>
                                        View Full
                                    </Link>
                                </CommandButton>
                            </div>

                            {/* Match Tab Content */}
                            {activeTab === 'matches' && (
                                <div className="w-full overflow-hidden">
                                    {isBR ? (
                                        <HistoryBRView
                                            tournamentId={tournament.id}
                                            gameName={tournament.game || ''}
                                            tournamentSlug={tournament.slug}
                                        />
                                    ) : (
                                        <HistoryBracketView tournamentId={tournament.id} />
                                    )}
                                </div>
                            )}

                            {/* Participant Tab Content */}
                            {activeTab === 'participants' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {tournament.participantList?.length > 0 ? (
                                        <>
                                            {tournament.participantList.map((p: any) => (
                                                <div key={p.id} className="flex items-center gap-3 border border-white/10 bg-white/[0.02] p-2">
                                                    <div
                                                        className="h-8 w-8 bg-zinc-800 flex items-center justify-center flex-shrink-0 bg-cover bg-center overflow-hidden"
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
                                                <div className="flex items-center justify-center border border-dashed border-white/10 p-2">
                                                    <span className="text-xs text-zinc-500">+{tournament.participantCount - 10} more</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="col-span-full border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-sm text-zinc-500">
                                            No participants registered yet.
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            )}
        </CommandPanel>
    );
});
