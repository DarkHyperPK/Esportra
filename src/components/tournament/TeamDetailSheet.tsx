import { useQuery } from '@tanstack/react-query';
import { Crown, Shield, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { PlayerHandle } from '@/components/profile/PlayerHandle';
import { apiClient } from '@/lib/apiClient';

interface TeamMember {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    riot_tag: string | null;
    role: string;
}

interface TeamDetail {
    id: string;
    name: string;
    tag: string | null;
    logo_url: string | null;
    description: string | null;
    game: string | null;
    members: TeamMember[];
}

interface TeamDetailSheetProps {
    teamId: string | null;
    onClose: () => void;
    game?: string;
}

const RIOT_GAMES = ['valorant', 'league of legends', 'league', 'tft', 'teamfight tactics', 'wild rift'];

function isRiotGame(game?: string): boolean {
    if (!game) return false;
    const lower = game.toLowerCase();
    return RIOT_GAMES.some(g => lower.includes(g));
}

function getMemberTag(member: TeamMember, game?: string): { label: string; value: string } | null {
    if (member.riot_tag && isRiotGame(game)) {
        return { label: 'Riot ID', value: member.riot_tag };
    }
    return null;
}

function RoleBadge({ role }: { role: string }) {
    if (role === 'captain' || role === 'owner') {
        return <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" aria-label="Captain" />;
    }
    if (role === 'co_captain') {
        return <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-label="Co-captain" />;
    }
    return null;
}

function MemberRow({ member, game }: { member: TeamMember; game?: string }) {
    const tag = getMemberTag(member, game);
    const isCaptain = member.role === 'captain' || member.role === 'owner';

    return (
        <PlayerHandle userId={member.id}>
            <div className={[
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl',
                'bg-white/[0.04] border border-white/[0.06]',
                'hover:bg-white/[0.07] hover:border-rose-500/20 transition-all cursor-pointer',
                isCaptain ? 'border-l-2 border-l-yellow-500/50' : '',
            ].join(' ')}>
                <EntityAvatar
                    type="user"
                    src={member.avatar_url}
                    name={member.username}
                    entityId={member.id}
                    size="w-9 h-9"
                    shape="circle"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-white truncate leading-tight">
                            {member.full_name || member.username}
                        </span>
                        <RoleBadge role={member.role} />
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {tag ? tag.value : `@${member.username}`}
                    </p>
                </div>
                <span className="text-[9px] uppercase tracking-wide text-zinc-600 capitalize shrink-0">
                    {member.role === 'co_captain' ? 'co-capt' : member.role}
                </span>
            </div>
        </PlayerHandle>
    );
}

function Skeleton() {
    return (
        <div className="grid grid-cols-2 gap-2 animate-pulse">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="h-3 w-20 bg-white/10 rounded" />
                        <div className="h-2.5 w-14 bg-white/5 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function TeamDetailSheet({ teamId, onClose, game }: TeamDetailSheetProps) {
    const navigate = useNavigate();

    const { data: team, isLoading, isError } = useQuery<TeamDetail>({
        queryKey: ['team-detail', teamId],
        queryFn: async () => {
            const data = await apiClient.get<any>(`/api/teams/${teamId}`);
            return {
                ...data,
                members: Array.isArray(data.members) ? data.members : [],
            };
        },
        enabled: !!teamId,
        staleTime: 30_000,
    });

    const effectiveGame = game || team?.game || undefined;

    const handleViewProfile = () => {
        onClose();
        navigate(`/teams/${teamId}`);
    };

    return (
        <Dialog open={!!teamId} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-md bg-[#0c0c0f] border border-white/10 text-white p-0 overflow-hidden">
                {/* Hero Header */}
                <div className="relative px-6 pt-6 pb-5 bg-gradient-to-b from-rose-950/30 via-[#0f0f11] to-transparent">
                    <DialogHeader>
                        {isLoading || !team ? (
                            <div className="flex items-center gap-4 animate-pulse">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 shrink-0" />
                                <div className="space-y-2">
                                    <div className="h-5 w-36 bg-white/10 rounded" />
                                    <div className="h-3.5 w-16 bg-white/5 rounded" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-4">
                                <EntityAvatar
                                    type="team"
                                    src={team.logo_url}
                                    name={team.name}
                                    entityId={team.id}
                                    size="w-14 h-14"
                                    className="rounded-2xl ring-2 ring-rose-500/20 border border-rose-400/20 bg-white/[0.03] shrink-0 p-1"
                                    imgClassName="object-contain"
                                />
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <DialogTitle className="text-white text-xl font-bold leading-tight">
                                            {team.name}
                                        </DialogTitle>
                                        {team.tag && (
                                            <span className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
                                                {team.tag}
                                            </span>
                                        )}
                                    </div>
                                    {effectiveGame && (
                                        <span className="mt-1.5 inline-flex items-center bg-white/[0.06] border border-white/[0.08] rounded-md px-2 py-0.5 text-[10px] text-zinc-400 uppercase tracking-wide">
                                            {effectiveGame}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogHeader>

                    {!isLoading && team?.description && (
                        <p className="text-sm text-zinc-400 mt-3 leading-relaxed line-clamp-2">
                            {team.description}
                        </p>
                    )}
                </div>

                <div className="h-px bg-white/5" />

                {/* Roster */}
                <div className="px-4 py-4 max-h-[340px] overflow-y-auto">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Roster</p>

                    {isLoading && <Skeleton />}

                    {isError && (
                        <p className="text-sm text-zinc-500 text-center py-6">
                            Could not load team details.
                        </p>
                    )}

                    {!isLoading && !isError && team && (
                        team.members.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {team.members.map((member) => (
                                    <MemberRow key={member.id} member={member} game={effectiveGame} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-600 text-center py-6 italic">
                                No roster data available
                            </p>
                        )
                    )}
                </div>

                {/* Footer */}
                {team && !isLoading && (
                    <>
                        <div className="h-px bg-white/5" />
                        <div className="p-4">
                            <button
                                onClick={handleViewProfile}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 transition-all text-sm font-semibold text-white"
                            >
                                <ExternalLink className="w-4 h-4 text-white" />
                                View Team Profile
                            </button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
