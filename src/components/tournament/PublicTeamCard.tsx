import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { normalizeStorageUrl } from '@/lib/storage';
import { resolveSoloEsportraDisplayName } from '@/utils/gameFeatures';

interface PublicTeamCardProps {
    participant: any;
    isSolo?: boolean;
    game?: string;
    gameMode?: string | null;
    renderStatusBadge?: (participant: any) => React.ReactNode;
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

function SoloPlayerAvatar({
    src,
    name,
}: {
    src?: string | null;
    name: string;
}) {
    const [imgError, setImgError] = useState(false);
    const resolvedSrc = normalizeStorageUrl(src);
    const initials = useMemo(() => getInitials(name), [name]);

    useEffect(() => {
        setImgError(false);
    }, [src]);

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

function SoloPlayerCard({
    participant,
    displayName,
    avatarSrc,
    registeredAt,
    renderStatusBadge,
}: {
    participant: any;
    displayName: string;
    avatarSrc?: string | null;
    registeredAt?: string | null;
    renderStatusBadge?: (participant: any) => React.ReactNode;
}) {
    return (
        <div className="relative w-full h-[320px]">
            <div
                className="h-[320px] bg-[#09090b] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                style={{ fontFamily: "'Poppins', sans-serif" }}
            >
                <div className="p-6 flex flex-col items-center justify-center h-full gap-4 relative">
                    {renderStatusBadge && (
                        <div className="absolute top-3 left-3 z-10 scale-90 origin-top-left">
                            {renderStatusBadge(participant)}
                        </div>
                    )}

                    <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden px-4">
                        <SoloPlayerAvatar src={avatarSrc} name={displayName} />
                    </div>

                    <div className="text-center w-full">
                        <h3 className="text-xl font-bold text-white truncate px-2">
                            {displayName}
                        </h3>
                        {registeredAt && (
                            <p className="text-sm text-gray-500 mt-1">
                                {new Date(registeredAt).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const PublicTeamCard: React.FC<PublicTeamCardProps> = ({
    participant,
    isSolo = false,
    renderStatusBadge,
}) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const registeredAt = participant.registered_at || participant.created_at;

    if (isSolo) {
        const displayName = resolveSoloEsportraDisplayName(participant);
        const avatarSrc = participant.solo_avatar_url || participant.user?.avatar_url || participant.team_logo;

        return (
            <SoloPlayerCard
                participant={participant}
                displayName={displayName}
                avatarSrc={avatarSrc}
                registeredAt={registeredAt}
                renderStatusBadge={renderStatusBadge}
            />
        );
    }

    const displayName = participant.team_name || 'Unknown Team';
    const avatarSrc = participant.team_logo;
    const members = parseTeamMembers(participant.team_members);

    return (
        <div className="relative w-full h-[320px] z-0">
            <motion.div
                className="absolute top-0 left-0 w-full min-h-[320px] bg-[#09090b] border border-white/5 rounded-xl shadow-2xl flex flex-col overflow-hidden group"
                style={{ fontFamily: "'Poppins', sans-serif" }}
                initial={false}
                animate={{
                    height: isHovered ? 'auto' : '320px',
                    zIndex: isHovered ? 50 : 1,
                    borderColor: isHovered ? 'rgba(124, 58, 237, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <AnimatePresence mode="wait">
                    {!isHovered ? (
                        <motion.div
                            key="front"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-6 flex flex-col items-center justify-center h-[320px] gap-3 relative"
                        >
                            {renderStatusBadge && (
                                <div className="absolute top-3 left-3 z-10 scale-90 origin-top-left">
                                    {renderStatusBadge(participant)}
                                </div>
                            )}

                            <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                                <EntityAvatar
                                    type="team"
                                    src={avatarSrc}
                                    name={displayName}
                                    entityId={participant.team_id || participant.user_id || participant.id}
                                    size="w-24 h-24"
                                    className="border border-white/10 bg-white/[0.03] p-1.5"
                                    imgClassName="object-contain filter drop-shadow-md"
                                    fallbackClassName="text-xl tracking-wider"
                                />
                            </div>

                            <div className="text-center w-full relative z-10">
                                <h3 className="text-xl font-bold text-white truncate px-2">
                                    {displayName}
                                </h3>
                                {registeredAt && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        {new Date(registeredAt).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="back"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-6 flex flex-col h-full bg-[#09090b]"
                        >
                            <div className="flex items-center justify-center gap-2 mb-6 pt-2">
                                <Users className="w-5 h-5 text-purple-400" />
                                <h4 className="text-lg font-bold text-white tracking-wide uppercase">
                                    ROSTER
                                </h4>
                            </div>

                            <div className="flex flex-col gap-3 px-2 pb-6">
                                {members.length > 0 ? (
                                    members.slice(0, 5).map((member, idx) => (
                                        <div key={idx} className="flex items-baseline gap-3 text-white font-medium text-lg">
                                            <span className="text-gray-500 text-sm font-normal w-4 text-right">{idx + 1}.</span>
                                            <span className="truncate">{member}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic text-center py-4">
                                        No members listed
                                    </p>
                                )}
                                {members.length > 5 && (
                                    <p className="text-xs text-gray-500 text-center italic mt-1">
                                        + {members.length - 5} more
                                    </p>
                                )}
                            </div>

                            <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
