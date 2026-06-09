import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import EntityAvatar from '@/components/ui/EntityAvatar';

interface PublicTeamCardProps {
    participant: any;
    isSolo?: boolean;
    renderStatusBadge?: (participant: any) => React.ReactNode;
}

export const PublicTeamCard: React.FC<PublicTeamCardProps> = ({ participant, isSolo = false, renderStatusBadge }) => {
    const [isHovered, setIsHovered] = useState(false);

    const displayName = isSolo
        ? (participant.display_name || participant.solo_username || participant.solo_riot_tag || participant.team_name || 'Unknown Player')
        : (participant.team_name || 'Unknown Team');

    const avatarSrc = isSolo
        ? (participant.solo_avatar_url || participant.user?.avatar_url || participant.team_logo)
        : participant.team_logo;

    const avatarType = isSolo ? 'user' : 'team';

    // Parse members from multiple formats (JSON array string, comma-separated, or actual array)
    const getMembers = (membersInput: any): string[] => {
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
                    if (Array.isArray(parsed)) return parsed.map((m: any) => typeof m === 'string' ? m : (m?.username || m?.name || '')).filter(Boolean);
                } catch { /* fall through to comma split */ }
            }
            return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        }

        return [];
    };

    const members = useMemo(() => {
        if (isSolo) {
            const details = [
                participant.solo_full_name,
                participant.solo_riot_tag,
                participant.solo_username || participant.user?.username,
            ].filter(Boolean) as string[];
            const uniqueDetails = [...new Set(details.map(d => d.trim().toLowerCase()))]
                .map(key => details.find(d => d.trim().toLowerCase() === key)!)
                .filter(Boolean);
            return uniqueDetails.length > 0 ? uniqueDetails : [];
        }
        return getMembers(participant.team_members);
    }, [isSolo, participant.solo_full_name, participant.solo_riot_tag, participant.solo_username, participant.user?.username, participant.team_members]);

    const registeredAt = participant.registered_at || participant.created_at;

    return (
        // Layout Placeholder - Keeps the grid cell stable
        <div className="relative w-full h-[320px] z-0">
            {/* Animated Floating Card */}
            <motion.div
                className="absolute top-0 left-0 w-full min-h-[320px] bg-[#09090b] border border-white/5 rounded-xl shadow-2xl flex flex-col overflow-hidden group"
                style={{ fontFamily: "'Poppins', sans-serif" }}
                initial={false}
                animate={{
                    height: isHovered ? "auto" : "320px",
                    zIndex: isHovered ? 50 : 1,
                    borderColor: isHovered ? "rgba(124, 58, 237, 0.5)" : "rgba(255, 255, 255, 0.1)",
                }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <AnimatePresence mode="wait">
                    {!isHovered ? (
                        /* FRONT FACE: Logo & Info */
                        <motion.div
                            key="front"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-6 flex flex-col items-center justify-center h-[320px] gap-3 relative"
                        >
                            {/* Status Badge */}
                            {renderStatusBadge && (
                                <div className="absolute top-3 left-3 z-10 scale-90 origin-top-left">
                                    {renderStatusBadge(participant)}
                                </div>
                            )}

                            {/* Logo */}
                            <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                                <EntityAvatar
                                    type={avatarType}
                                    src={avatarSrc}
                                    name={displayName}
                                    entityId={participant.team_id || participant.user_id || participant.id}
                                    size="w-24 h-24"
                                    className="border border-white/10 bg-white/[0.03] p-1.5"
                                    imgClassName={isSolo ? 'object-cover filter drop-shadow-md' : 'object-contain filter drop-shadow-md'}
                                    fallbackClassName="text-xl tracking-wider"
                                />
                            </div>

                            {/* Name */}
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
                        /* BACK FACE: Simple Roster List */
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
                                    {isSolo ? 'PROFILE' : 'ROSTER'}
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
                                        {isSolo ? 'No profile details listed' : 'No members listed'}
                                    </p>
                                )}
                                {members.length > 5 && (
                                    <p className="text-xs text-gray-500 text-center italic mt-1">
                                        + {members.length - 5} more
                                    </p>
                                )}
                            </div>

                            {/* Purple Bottom Border Accent */}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
