import React from 'react';
import { PublicTeamCard } from '@/components/tournament/PublicTeamCard';

interface TeamsTabProps {
    participants: any[]; // enriched participants
}

export const TeamsTab: React.FC<TeamsTabProps> = ({ participants }) => {
    return (
        <>
            {participants.length === 0 ? (
                <div className="min-h-[400px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-[#121214]">
                    <p className="text-gray-500 font-mono text-sm tracking-widest">NO_TEAMS_REGISTERED</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {participants
                        .filter(p => p.participant_type === 'team')
                        .map((participant) => (
                            <PublicTeamCard
                                key={participant.id}
                                participant={participant}
                                renderStatusBadge={(p) => (
                                    <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${p.status === 'checked_in' || p.checked_in_at
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                        }`}>
                                        {p.status === 'checked_in' || p.checked_in_at ? 'Ready' : 'Registered'}
                                    </div>
                                )}
                            />
                        ))}
                </div>
            )}
        </>
    );
};
