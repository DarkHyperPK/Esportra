import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit2, Trophy, Target, Calendar, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import EntityAvatar from '@/components/ui/EntityAvatar';
import PlayerCard from '@/components/player/PlayerCard';

interface TeamMember {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    card_image_url: string | null;
    role: string;
}

interface TeamDetail {
    id: string;
    slug: string | null;
    name: string;
    tag: string | null;
    logo_url: string | null;
    description: string | null;
    game: string | null;
    game_format: string | null;
    country_code: string | null;
    owner_id: string;
    created_at: string;
    members: TeamMember[];
}

interface TournamentEntry {
    tournament_id: string;
    tournament_name: string;
    game: string;
    format: string;
    start_date: string;
    tournament_status: string;
    placement: number | null;
}

function memberToPlayerCardShape(member: TeamMember, ownerId: string, game?: string | null) {
    return {
        user_id: member.id,
        username: member.username,
        avatar_url: member.avatar_url ?? undefined,
        card_image_url: member.card_image_url ?? undefined,
        role: member.role,
        game: game ?? undefined,
    };
}

function placementLabel(placement: number | null): string {
    if (!placement) return '—';
    if (placement === 1) return '1st';
    if (placement === 2) return '2nd';
    if (placement === 3) return '3rd';
    return `${placement}th`;
}


function StatTile({ value, label }: { value: string | number; label: string }) {
    return (
        <div className="flex flex-col gap-1.5 px-5 py-4 bg-white/[0.03] border border-white/[0.06] rounded-xl min-w-[100px]">
            <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{label}</span>
        </div>
    );
}


function HistoryRow({ entry }: { entry: TournamentEntry }) {
    const date = new Date(entry.start_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    const won = entry.placement === 1;

    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
            <div className="w-1.5 h-10 rounded-full shrink-0" style={{ background: won ? '#f59e0b' : 'rgba(255,255,255,0.08)' }} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{entry.tournament_name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{entry.game} · {date}</p>
            </div>
            <div className="shrink-0 text-right">
                {entry.placement ? (
                    <span className={`text-sm font-bold tabular-nums ${won ? 'text-yellow-400' : 'text-zinc-300'}`}>
                        {placementLabel(entry.placement)}
                    </span>
                ) : (
                    <span className="text-xs text-zinc-600">No placement</span>
                )}
            </div>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="flex items-end gap-6 pb-8 border-b border-white/5">
                <div className="w-24 h-24 rounded-2xl bg-white/10" />
                <div className="space-y-3 pb-1">
                    <div className="h-7 w-48 bg-white/10 rounded" />
                    <div className="h-4 w-24 bg-white/5 rounded" />
                </div>
            </div>
            <div className="flex gap-10">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-8 w-12 bg-white/10 rounded" />
                        <div className="h-3 w-16 bg-white/5 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function TeamProfilePage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { profile } = useAuth();

    const { data: team, isLoading: loadingTeam } = useQuery<TeamDetail>({
        queryKey: ['team-profile', slug],
        queryFn: async () => {
            const data = await apiClient.get<any>(`/api/teams/${slug}`);
            return { ...data, members: Array.isArray(data.members) ? data.members : [] };
        },
        enabled: !!slug,
        staleTime: 30_000,
    });

    const { data: historyData } = useQuery<{ items: TournamentEntry[] }>({
        queryKey: ['team-history', team?.id],
        queryFn: () => apiClient.get(`/api/teams/${team!.id}/tournament-history`),
        enabled: !!team?.id,
        staleTime: 30_000,
    });

    useEffect(() => {
        if (team?.slug && slug && UUID_RE.test(slug) && team.slug !== slug) {
            navigate(`/teams/${team.slug}`, { replace: true });
        }
    }, [team, slug, navigate]);

    const history = historyData?.items ?? [];
    const totalTournaments = history.length;
    const wins = history.filter(e => e.placement === 1).length;
    const placements = history.map(e => e.placement).filter((p): p is number => p != null);
    const bestPlacement = placements.length > 0 ? Math.min(...placements) : null;

    const isOwner = !!profile && !!team && team.owner_id === profile.id;

    return (
        <div className="min-h-screen bg-[#09090b] text-white">
            {/* Back nav */}
            <div className="border-b border-white/5 px-6 py-4">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
            </div>

            <div className="px-6 py-10 space-y-10">
                {loadingTeam ? (
                    <Skeleton />
                ) : !team ? (
                    <div className="text-center py-20">
                        <p className="text-zinc-500">Team not found.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-start gap-6">
                            <EntityAvatar
                                type="team"
                                src={team.logo_url}
                                name={team.name}
                                entityId={team.id}
                                size="w-24 h-24"
                                className="border border-white/10 bg-white/[0.03] p-2 rounded-2xl shrink-0"
                                imgClassName="object-contain"
                            />
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-white leading-tight">{team.name}</h1>
                                        {team.tag && (
                                            <p className="text-sm text-zinc-500 mt-1 uppercase tracking-widest">[{team.tag}]</p>
                                        )}
                                        {team.game && (
                                            <p className="text-sm text-zinc-600 mt-1">{team.game}</p>
                                        )}
                                    </div>
                                    {isOwner && (
                                        <Link
                                            to="/player/teams"
                                            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 transition-colors shrink-0"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Edit Team
                                        </Link>
                                    )}
                                </div>
                                {team.description && (
                                    <p className="text-sm text-zinc-400 mt-3 leading-relaxed max-w-xl">
                                        {team.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Stats — system-derived, transparent */}
                        <div className="flex gap-3 py-4 border-y border-white/5">
                            <StatTile value={totalTournaments} label="Tournaments" />
                            <StatTile
                                value={wins > 0 ? wins : '—'}
                                label={wins === 1 ? 'Win' : 'Wins'}
                            />
                            <StatTile
                                value={bestPlacement ? placementLabel(bestPlacement) : '—'}
                                label="Best Place"
                            />
                        </div>

                        {/* Roster */}
                        <section>
                            <h2 className="text-xs text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                Roster
                                <span className="text-zinc-700">·</span>
                                <span>{team.members.length} members</span>
                            </h2>
                            {team.members.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {team.members.map(member => (
                                        <PlayerCard
                                            key={member.id}
                                            member={memberToPlayerCardShape(member, team.owner_id, team.game)}
                                            isOwner={member.id === team.owner_id}
                                            className="transition-all duration-300 hover:scale-[1.03] hover:z-10"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-600 italic">No roster data available.</p>
                            )}
                        </section>

                        {/* Tournament Record */}
                        <section>
                            <h2 className="text-xs text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Trophy className="w-3.5 h-3.5" />
                                Tournament Record
                            </h2>
                            {history.length > 0 ? (
                                <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2">
                                    {history.map(entry => (
                                        <HistoryRow key={entry.tournament_id} entry={entry} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 py-8 text-center justify-center">
                                    <Target className="w-5 h-5 text-zinc-700" />
                                    <p className="text-sm text-zinc-600">No tournament history yet.</p>
                                </div>
                            )}
                        </section>

                        {/* Member since */}
                        <div className="flex items-center gap-2 text-xs text-zinc-700 pt-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Team founded {new Date(team.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
