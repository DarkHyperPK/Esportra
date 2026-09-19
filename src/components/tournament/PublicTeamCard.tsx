import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { normalizeStorageUrl } from '@/lib/storage';
import { resolveSoloEsportraDisplayName } from '@/utils/gameFeatures';
import { usePeekStore } from '@/stores/peekStore';

interface PublicTeamCardProps {
    participant: any;
    isSolo?: boolean;
    game?: string;
    gameMode?: string | null;
    renderStatusBadge?: (participant: any) => React.ReactNode;
    onTeamClick?: (teamId: string) => void;
}

function parseTeamMembers(membersInput: unknown): string[] {
    if (!membersInput) return [];

    if (Array.isArray(membersInput)) {
        return membersInput
            .map(m => typeof m === 'string' ? m : (m?.username || m?.name || JSON.stringify(m)))
            .filter(Boolean);
    }

    if (typeof membersInput === 'string') {
        const trimmed = membersInput.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed
                        .map((m: unknown) => typeof m === 'string' ? m : ((m as { username?: string; name?: string })?.username || (m as { name?: string })?.name || ''))
                        .filter(Boolean);
                }
            } catch { /* fall through to comma split */ }
        }
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }

    return [];
}

function getInitials(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function SoloPlayerAvatar({ src, name }: { src?: string | null; name: string }) {
    const [imgError, setImgError] = useState(false);
    const resolvedSrc = normalizeStorageUrl(src);
    const initials = useMemo(() => getInitials(name), [name]);

    useEffect(() => { setImgError(false); }, [src]);

    if (!resolvedSrc || imgError) {
        return (
            <span className="text-2xl font-bold uppercase tracking-wider text-zinc-500">
                {initials}
            </span>
        );
    }

    return (
        <img
            src={resolvedSrc}
            alt={name}
            className="max-h-24 max-w-full w-auto h-auto object-contain drop-shadow-lg"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
        />
    );
}

function HoverHint({ label }: { label: string }) {
    return (
        <div className="absolute inset-x-0 bottom-0 h-11 flex items-center justify-center gap-1.5 bg-gradient-to-t from-rose-950/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out rounded-b-xl pointer-events-none">
            <span className="text-xs font-medium text-rose-300">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-300" />
        </div>
    );
}

export const PublicTeamCard: React.FC<PublicTeamCardProps> = ({
    participant,
    isSolo = false,
    renderStatusBadge,
    onTeamClick,
}) => {
    const openPeek = usePeekStore((s) => s.openPeek);

    const registeredAt = participant.registered_at || participant.created_at;

    if (isSolo) {
        const displayName = resolveSoloEsportraDisplayName(participant);
        const avatarSrc = participant.solo_avatar_url || participant.user?.avatar_url || participant.team_logo;
        const userId: string | undefined = participant.user_id || participant.user?.id;

        return (
            <div
                className={`relative w-full h-[280px] overflow-hidden${userId ? ' cursor-pointer group' : ''}`}
                onClick={userId ? () => openPeek(userId) : undefined}
                role={userId ? 'button' : undefined}
                tabIndex={userId ? 0 : undefined}
                onKeyDown={userId ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPeek(userId); } } : undefined}
            >
                <div className="h-full bg-[#09090b] border border-white/10 rounded-xl shadow-2xl overflow-hidden transition-colors duration-200 group-hover:border-white/20">
                    {renderStatusBadge && (
                        <div className="absolute top-3 left-3 z-10 scale-90 origin-top-left">
                            {renderStatusBadge(participant)}
                        </div>
                    )}

                    <div className="p-6 flex flex-col items-center justify-center h-full gap-4 relative">
                        <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden px-4">
                            <SoloPlayerAvatar src={avatarSrc} name={displayName} />
                        </div>

                        <div className="text-center w-full">
                            <h3 className="text-xl font-bold text-white truncate px-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                                {displayName}
                            </h3>
                            {registeredAt && (
                                <p className="text-sm text-gray-500 mt-1">
                                    {new Date(registeredAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {userId && <HoverHint label="View Profile" />}
                </div>
            </div>
        );
    }

    const displayName = participant.team_name || 'Unknown Team';
    const avatarSrc = participant.team_logo;
    const members = parseTeamMembers(participant.team_members);
    const teamId: string | undefined = participant.team_id;
    const isClickable = !!(teamId && onTeamClick);

    return (
        <div
            className={`relative w-full h-[280px] overflow-hidden${isClickable ? ' cursor-pointer group' : ''}`}
            onClick={isClickable ? () => onTeamClick!(teamId!) : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTeamClick!(teamId!); } } : undefined}
            style={{ fontFamily: "'Poppins', sans-serif" }}
        >
            <div className="h-full bg-[#09090b] border border-white/10 rounded-xl shadow-2xl overflow-hidden transition-colors duration-200 group-hover:border-white/20">
                {renderStatusBadge && (
                    <div className="absolute top-3 left-3 z-10 scale-90 origin-top-left">
                        {renderStatusBadge(participant)}
                    </div>
                )}

                <div className="p-6 flex flex-col items-center justify-center h-full gap-3 relative">
                    <div className="relative w-20 h-20 flex items-center justify-center mb-1">
                        <EntityAvatar
                            type="team"
                            src={avatarSrc}
                            name={displayName}
                            entityId={participant.team_id || participant.user_id || participant.id}
                            size="w-20 h-20"
                            className="border border-white/10 bg-white/[0.03] p-1.5"
                            imgClassName="object-contain filter drop-shadow-md"
                            fallbackClassName="text-xl tracking-wider"
                        />
                    </div>

                    <div className="text-center w-full">
                        <h3 className="text-lg font-bold text-white truncate px-2">
                            {displayName}
                        </h3>
                        {members.length > 0 && (
                            <p className="text-xs text-zinc-500 mt-1">
                                {members.length} member{members.length !== 1 ? 's' : ''}
                            </p>
                        )}
                        {registeredAt && (
                            <p className="text-xs text-zinc-600 mt-0.5">
                                {new Date(registeredAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>

                {isClickable && <HoverHint label="View Roster" />}
            </div>
        </div>
    );
};
