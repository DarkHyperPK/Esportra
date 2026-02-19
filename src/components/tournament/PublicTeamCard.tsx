import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';

interface PublicTeamCardProps {
    participant: any;
    renderStatusBadge?: (participant: any) => React.ReactNode;
}

export const PublicTeamCard: React.FC<PublicTeamCardProps> = ({ participant, renderStatusBadge }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Parse members robustly
    const getMembers = (membersInput: any) => {
        if (!membersInput) return [];

        // If it's already an array, filter and return
        if (Array.isArray(membersInput)) {
            return membersInput
                .map(m => typeof m === 'string' ? m : (m?.username || m?.name || JSON.stringify(m)))
                .filter(Boolean);
        }

        // If it's a string, split by comma
        if (typeof membersInput === 'string') {
            return membersInput.split(',').map(s => s.trim()).filter(Boolean);
        }

        return [];
    };

    const members = getMembers(participant.team_members);

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
                                {participant.team_logo ? (
                                    <img
                                        src={participant.team_logo}
                                        alt={participant.team_name}
                                        className="w-full h-full object-contain filter drop-shadow-md"
                                    />
                                ) : (
                                    <Users className="w-16 h-16 text-gray-600" />
                                )}
                            </div>

                            {/* Name */}
                            <div className="text-center w-full relative z-10">
                                <h3 className="text-xl font-bold text-white truncate px-2">
                                    {participant.team_name || 'Unknown Team'}
                                </h3>
                                {participant.registered_at && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        {new Date(participant.registered_at).toLocaleDateString()}
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
                                <h4 className="text-lg font-bold text-white tracking-wide uppercase">ROSTER</h4>
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
