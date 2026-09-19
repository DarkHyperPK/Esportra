import { useQuery } from '@tanstack/react-query';
import { Crown, Shield, ExternalLink, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { PlayerHandle } from '@/components/profile/PlayerHandle';
import { apiClient } from '@/lib/apiClient';
import { JackButton } from '@/components/ui/JackButton';

interface TeamMember {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    riot_tag: string | null;
    discord_handle: string | null;
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
    members: TeamMember[];
}

interface TeamDetailSheetProps {
    teamId: string | null;
    onClose: () => void;
    game?: string;
}

function DiscordMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
        </svg>
    );
}

const ROLE_RANK: Record<string, number> = { captain: 0, owner: 0, co_captain: 1 };

function sortedRoster(members: TeamMember[]): TeamMember[] {
    return [...members].sort((a, b) => {
        const ra = ROLE_RANK[a.role] ?? 2;
        const rb = ROLE_RANK[b.role] ?? 2;
        if (ra !== rb) return ra - rb;
        return (a.full_name ?? a.username).localeCompare(b.full_name ?? b.username);
    });
}

function HandleDisplay({ member }: { member: TeamMember }) {
    if (member.riot_tag) {
        return (
            <span className="flex items-center justify-center gap-1 text-[11px] text-zinc-500 truncate w-full px-2">
                <span className="text-[9px] font-bold text-zinc-600 leading-none shrink-0">R</span>
                <span className="truncate">{member.riot_tag}</span>
            </span>
        );
    }
    if (member.discord_handle) {
        return (
            <span className="flex items-center justify-center gap-1 text-[11px] text-zinc-500 truncate w-full px-2">
                <DiscordMark className="w-3 h-3 text-zinc-600 shrink-0" />
                <span className="truncate">{member.discord_handle}</span>
            </span>
        );
    }
    return (
        <span className="text-[11px] text-zinc-500 text-center truncate w-full px-2">
            @{member.username}
        </span>
    );
}

function PlayerCard({ member }: { member: TeamMember }) {
    const isCaptain = member.role === 'captain' || member.role === 'owner';
    const isCoCapt = member.role === 'co_captain';
    const displayName = member.full_name || member.username;

    return (
        <PlayerHandle userId={member.id} className="block w-full h-full">
            <div
                className={[
                    'relative flex flex-col items-center justify-center w-full h-full rounded-2xl cursor-pointer',
                    'border transition-colors duration-150',
                    isCaptain
                        ? 'bg-rose-950/40 border-rose-500/65 hover:border-rose-400/90'
                        : 'bg-[#1a1a22] border-white/[0.08] hover:bg-[#1e1e28] hover:border-white/[0.15]',
                ].join(' ')}
            >
                {isCaptain && (
                    <Crown
                        className="absolute top-2.5 right-2.5 w-4 h-4 text-yellow-400 shrink-0"
                        fill="currentColor"
                    />
                )}
                {isCoCapt && (
                    <Shield className="absolute top-2.5 right-2.5 w-4 h-4 text-zinc-500" />
                )}

                <EntityAvatar
                    type="user"
                    src={member.avatar_url}
                    name={member.username}
                    entityId={member.id}
                    size="w-[60px] h-[60px]"
                    shape="circle"
                    className={isCaptain ? 'ring-2 ring-yellow-400/55 ring-offset-1 ring-offset-rose-950/60' : ''}
                />

                <p className="mt-2.5 text-[13px] font-bold text-white text-center truncate w-full leading-tight px-2">
                    {displayName}
                </p>
                <div className="mt-0.5">
                    <HandleDisplay member={member} />
                </div>
            </div>
        </PlayerHandle>
    );
}

function Skeleton() {
    return (
        <div className="flex flex-wrap justify-center gap-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="w-[calc(33.333%_-_8px)] aspect-square rounded-2xl bg-[#1a1a22] border border-white/[0.08] flex flex-col items-center justify-center gap-2">
                    <div className="w-[60px] h-[60px] rounded-full bg-white/[0.08]" />
                    <div className="h-3 w-16 bg-white/[0.08] rounded" />
                    <div className="h-2.5 w-12 bg-white/[0.05] rounded" />
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
    const roster = team ? sortedRoster(team.members) : [];

    const handleViewProfile = () => {
        onClose();
        navigate(`/teams/${team?.slug ?? teamId}`);
    };

    return (
        <Dialog open={!!teamId} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[480px] bg-[#0f0f14] border border-white/[0.08] text-white p-0 overflow-hidden rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
                <DialogTitle className="sr-only">{team?.name ?? 'Team Details'}</DialogTitle>

                {/* Header */}
                <div className="relative flex items-center gap-4 px-5 pt-5 pb-5 overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-[200px] pointer-events-none select-none overflow-hidden" aria-hidden="true">
                        <svg viewBox="0 0 200 84" className="w-full h-full" preserveAspectRatio="xMaxYMid meet">
                            <polygon points="200,0 100,0 58,84 200,84" fill="rgba(180,20,45,0.16)" />
                            <polygon points="200,0 145,0 103,84 200,84" fill="rgba(180,20,45,0.10)" />
                            <polygon points="200,0 178,0 155,84 200,84" fill="rgba(180,20,45,0.06)" />
                        </svg>
                    </div>

                    {isLoading || !team ? (
                        <div className="flex items-center gap-4 w-full animate-pulse relative z-10">
                            <div className="w-[68px] h-[68px] rounded-2xl bg-white/10 shrink-0" />
                            <div className="space-y-2.5">
                                <div className="h-5 w-32 bg-white/10 rounded" />
                                <div className="h-3.5 w-24 bg-white/5 rounded" />
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 flex items-center gap-4 w-full pr-8">
                            <EntityAvatar
                                type="team"
                                src={team.logo_url}
                                name={team.name}
                                entityId={team.id}
                                size="w-[68px] h-[68px]"
                                className="rounded-2xl border border-white/10 bg-[#1a1a22] p-1.5 shrink-0"
                                imgClassName="object-contain"
                            />
                            <div className="min-w-0">
                                <p className="text-[22px] font-bold text-white leading-tight tracking-tight truncate">
                                    {team.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {team.tag && (
                                        <span className="text-[12px] text-zinc-400 font-medium">[{team.tag}]</span>
                                    )}
                                    {team.tag && effectiveGame && (
                                        <span className="text-zinc-600 leading-none">·</span>
                                    )}
                                    {effectiveGame && (
                                        <span className="text-[12px] font-bold text-[#FF3F6C] uppercase tracking-wide">
                                            {effectiveGame}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-px bg-white/[0.07]" />

                {/* Roster */}
                <div className="px-4 pt-4 pb-4 max-h-[460px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#FF3F6C]" />
                            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-[0.15em]">Roster</span>
                        </div>
                        {team && !isLoading && (
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.1em]">
                                {team.members.length} Players
                            </span>
                        )}
                    </div>

                    {isLoading && <Skeleton />}

                    {isError && (
                        <p className="text-sm text-zinc-500 text-center py-8">
                            Could not load team details.
                        </p>
                    )}

                    {!isLoading && !isError && team && (
                        roster.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-3">
                                {roster.map((member) => (
                                    <div key={member.id} className="w-[calc(33.333%_-_8px)] aspect-square min-w-0">
                                        <PlayerCard member={member} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-600 text-center py-8">
                                No players on this roster
                            </p>
                        )
                    )}
                </div>

                {/* CTA */}
                {team && !isLoading && (
                    <div className="px-4 pb-4 pt-0">
                        <JackButton
                            onClick={handleViewProfile}
                            size="lg"
                            variant="primary"
                            className="w-full"
                        >
                            <ExternalLink className="w-[17px] h-[17px]" />
                            View Team Profile
                        </JackButton>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
