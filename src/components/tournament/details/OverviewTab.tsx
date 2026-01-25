import React from 'react';
import { Users, ChevronRight, Trophy, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OverviewTabProps {
    tournament: any;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ tournament }) => {
    const navigate = useNavigate();

    return (
        <div className="space-y-32">
            {/* --- LAYOUT VARIANT: "ETHEREAL SPECS" --- */}
            <section className="bg-transparent py-20 relative overflow-visible">

                <div className="max-w-6xl mx-auto space-y-24">

                    {/* 1. The "Stats Horizon" - Minimalist Data Bar */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12 border-y border-white/10 py-12 relative">
                        {/* Subtle Glow Behind */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent blur-3xl -z-10" />

                        <div className="text-center flex-1">
                            <p className="text-[10px] font-mono tracking-[0.3em] text-gray-500 uppercase mb-2">Timeline</p>
                            <p className="text-xl font-bold flex items-center justify-center gap-2 tracking-tight">
                                <span className="text-emerald-400">
                                    {new Date(tournament.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-white/20">-</span>
                                <span className="text-red-400">
                                    {tournament.end_date
                                        ? new Date(tournament.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                        : 'TBA'}
                                </span>
                            </p>
                        </div>

                        <div className="h-12 w-px bg-white/10 hidden md:block" />

                        <div className="text-center md:text-right flex-1 cursor-pointer group" onClick={() => navigate(`/organizer/profile/${tournament.user_id}`)}>
                            <p className="text-[10px] font-mono tracking-[0.3em] text-gray-500 uppercase mb-2 group-hover:text-esports-primary transition-colors">Authenticated Host</p>
                            <div className="flex items-center justify-center md:justify-end gap-3 group-hover:translate-x-1 transition-transform">
                                {tournament.organizer?.avatar_url ? (
                                    <img
                                        src={tournament.organizer.avatar_url}
                                        alt={tournament.organizer.username}
                                        className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-gray-400" />
                                    </div>
                                )}
                                <span className="text-lg font-bold text-white group-hover:text-esports-primary transition-colors">
                                    {tournament.organizer?.username || 'Unknown Organizer'}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-esports-primary" />
                            </div>
                        </div>
                    </div>


                    {/* 2. The "Mission Brief" - Typography Focus */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                        {/* Left: Section Title */}
                        <div className="lg:col-span-4">
                            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Mission Brief</h2>
                            <div className="h-1 w-20 bg-esports-primary mb-6" />
                            <p className="text-sm font-mono text-gray-500 leading-relaxed uppercase tracking-widest">
                                CLASSIFIED INTEL <br />
                                AUTHORIZED EYES ONLY
                            </p>
                        </div>

                        {/* Right: Content */}
                        <div className="lg:col-span-8">
                            <div className="prose prose-invert prose-lg max-w-none">
                                <p className="text-2xl text-gray-200 font-light leading-relaxed">
                                    {tournament.description}
                                </p>
                            </div>

                            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12 border-t border-white/10 pt-12">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-blue-500" /> Timeframe
                                    </h4>
                                    <ul className="space-y-4">
                                        <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                            <span>Registration Deadline</span>
                                            <span className="text-white">{new Date(tournament.date).toLocaleDateString()}</span>
                                        </li>
                                        <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                            <span>Check-In Window</span>
                                            <span className="text-white">30m Pre-Match</span>
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                                        <Trophy className="w-4 h-4 text-yellow-500" /> Rewards
                                    </h4>
                                    <ul className="space-y-4">
                                        {tournament.rewards ? (
                                            tournament.rewards.split('|').map((reward: string, index: number) => {
                                                const [label, value] = reward.split(':').map(s => s.trim());
                                                return (
                                                    <li key={index} className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                                        <span>{label}</span>
                                                        <span className={index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-300" : "text-white"}>
                                                            {value}
                                                        </span>
                                                    </li>
                                                );
                                            })
                                        ) : (
                                            <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                                <span>Prize Distribution</span>
                                                <span className="text-white">TBA</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Sponsors Section - Minimalist Marquee Style */}
            <section className="container mx-auto px-4 py-8 border-t border-white/5">
                <div className="flex items-center justify-between opacity-30 hover:opacity-100 transition-opacity duration-500">
                    <span className="text-[10px] font-mono tracking-[0.5em] uppercase text-gray-500">Supported By</span>
                    <div className="flex gap-8">
                        <span className="font-black text-xl italic tracking-tighter">TECHGEAR</span>
                        <span className="font-black text-xl italic tracking-tighter">ENERGY-X</span>
                        <span className="font-black text-xl italic tracking-tighter">PHANTOM</span>
                    </div>
                </div>
            </section>
        </div>
    );
};
