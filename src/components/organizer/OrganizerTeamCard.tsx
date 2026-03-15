import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TeamCardProps {
    participant: any;
    onManage: (participant: any) => void;
    renderStatusBadge: (participant: any) => React.ReactNode;
}

export const OrganizerTeamCard: React.FC<TeamCardProps> = ({ participant, onManage, renderStatusBadge }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Parse members from multiple formats (JSON array string, comma-separated, or actual array)
    const getMembers = (membersInput: any): string[] => {
        if (!membersInput) return [];

        // If it's already an array, extract string values
        if (Array.isArray(membersInput)) {
            return membersInput.map((m: any) => typeof m === 'string' ? m : (m?.username || m?.name || String(m))).filter(Boolean);
        }

        // If it's a string, try JSON parse first (JSONB column returns '["a","b"]')
        if (typeof membersInput === 'string') {
            const trimmed = membersInput.trim();
            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
                } catch { /* fall through to comma split */ }
            }
            return trimmed.split(',').map(s => s.trim()).filter(Boolean);
        }

        return [];
    };

    const isSolo = participant.participant_type === 'solo';
    const isValorant = participant.tournament?.game?.toLowerCase() === 'valorant';
    const userTag = isSolo ? (
        (isValorant && participant.user?.riot_tag) ||
        participant.user?.riot_tag ||
        participant.user?.steam_tag ||
        participant.gamer_tag ||
        participant.user?.username ||
        'Solo Player'
    ) : null;

    const displayName = isSolo ? userTag : (participant.team_name || 'Unknown Team');
    const displayLogo = isSolo ? participant.user?.avatar_url : participant.team_logo;
    const members = isSolo ? [displayName] : getMembers(participant.team_members);

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
                {/* Manage Button (Always visible) */}
                <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        onManage(participant);
                    }}
                >
                    <Settings className="w-5 h-5" />
                </Button>

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
                            <div className="absolute top-3 left-3 z-10 scale-90 origin-top-left">
                                {renderStatusBadge(participant)}
                            </div>

                            {/* Logo */}
                            <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                                {displayLogo ? (
                                    <img
                                        src={displayLogo}
                                        alt={displayName}
                                        className={`w-full h-full object-contain filter drop-shadow-md ${isSolo ? 'rounded-full' : ''}`}
                                    />
                                ) : (
                                    isSolo ? <Users className="w-16 h-16 text-purple-600/50" /> : <Users className="w-16 h-16 text-gray-600" />
                                )}
                            </div>

                            {/* Name */}
                            <div className="text-center w-full relative z-10">
                                <h3 className="text-xl font-bold text-white truncate px-2">
                                    {displayName}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1 uppercase tracking-tighter font-medium opacity-50">
                                    {isSolo ? 'Solo Participant' : 'Team Registration'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Joined {participant.registered_at ? new Date(participant.registered_at).toLocaleDateString() : 'Unknown Date'}
                                </p>
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
                                    {isSolo ? 'Player Profile' : 'ROSTER'}
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
                                    <p className="text-sm text-gray-500 italic text-center py-4">No members listed</p>
                                )}
                                {members.length > 5 && (
                                    <p className="text-xs text-gray-500 text-center italic mt-1">
                                        + {members.length - 5} more
                                    </p>
                                )}
                            </div>

                            {/* Purple Bottom Border Accent */}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-indigo-600" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
