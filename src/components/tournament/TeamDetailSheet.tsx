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

    return (
        <PlayerHandle userId={member.id}>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                <EntityAvatar
                    type="user"
                    src={member.avatar_url}
                    name={member.username}
                    entityId={member.id}
                    size="w-9 h-9"
                    shape="circle"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate">
                            {member.full_name || member.username}
                        </span>
                        <RoleBadge role={member.role} />
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                        {tag ? tag.value : `@${member.username}`}
                    </p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-600 capitalize shrink-0">
                    {member.role === 'co_captain' ? 'co-capt' : member.role}
                </span>
            </div>
        </PlayerHandle>
    );
}

function Skeleton() {
    return (
        <div className="space-y-4 animate-pulse px-1">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
                <div className="space-y-2">
                    <div className="h-4 w-36 bg-white/10 rounded" />
                    <div className="h-3 w-20 bg-white/5 rounded" />
                </div>
            </div>
            <div className="h-px bg-white/5" />
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-28 bg-white/10 rounded" />
                        <div className="h-2.5 w-20 bg-white/5 rounded" />
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
            <DialogContent className="sm:max-w-md bg-[#0f0f11] border border-white/10 text-white p-0 overflow-hidden">
                {/* Header */}
                <div className="p-6 pb-4">
                    <DialogHeader>
                        {isLoading || !team ? (
                            <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                        ) : (
                            <div className="flex items-center gap-3">
                                <EntityAvatar
                                    type="team"
                                    src={team.logo_url}
                                    name={team.name}
                                    entityId={team.id}
                                    size="w-12 h-12"
                                    className="border border-white/10 bg-white/[0.03] p-1"
                                    imgClassName="object-contain"
                                />
                                <div>
                                    <DialogTitle className="text-white text-lg font-bold leading-tight">
                                        {team.name}
                                    </DialogTitle>
                                    {team.tag && (
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest mt-0.5">
                                            [{team.tag}]
                                        </p>
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
                <div className="px-3 py-4 max-h-[340px] overflow-y-auto">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 mb-2">Roster</p>

                    {isLoading && <Skeleton />}

                    {isError && (
                        <p className="text-sm text-zinc-500 text-center py-6">
                            Could not load team details.
                        </p>
                    )}

                    {!isLoading && !isError && team && (
                        team.members.length > 0 ? (
                            <div className="space-y-0.5">
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

                {/* Footer — View Team Profile */}
                {team && !isLoading && (
                    <>
                        <div className="h-px bg-white/5" />
                        <div className="p-4">
                            <button
                                onClick={handleViewProfile}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] transition-colors text-sm font-medium text-white"
                            >
                                <ExternalLink className="w-4 h-4 text-zinc-400" />
                                View Team Profile
                            </button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
