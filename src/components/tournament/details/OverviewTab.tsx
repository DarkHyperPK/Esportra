import React, { useState, useEffect } from 'react';
import { Users, ChevronRight, Trophy, Clock, Zap, CheckCircle, MapPin, Globe, ExternalLink, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VerticalAdPlacement } from './VerticalAdPlacement';
import { TournamentSponsorSidebar } from '@/components/tournament/TournamentSponsorSidebar';

import { isBattleRoyale } from '@/utils/gameFeatures';

interface Stage {
    id: string;
    name: string;
    stage_order: number;
    format?: string;
    scheduling_config?: {
        self_play_enabled?: boolean;
        checkin_window_minutes?: number;
    };
}

interface OverviewTabProps {
    tournament: any;
    stages?: Stage[];
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ tournament, stages = [] }) => {
    const navigate = useNavigate();

    // Check if any stage has self-play enabled (not applicable for Battle Royale games)
    const isBR = isBattleRoyale(tournament?.game || '');
    const selfPlayStage = stages.find(s => s.scheduling_config?.self_play_enabled);
    const isSelfPlayEnabled = !isBR && !!selfPlayStage;

    // Check if vertical ad is enabled for this tournament
    const showVerticalAd = tournament.settings?.showVerticalAd === true;

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
                                    {tournament.date || 'TBA'}
                                </span>
                                <span className="text-white/20">-</span>
                                <span className="text-red-400">
                                    {tournament.end_date || 'TBA'}
                                </span>
                            </p>
                        </div>

                        <div className="h-12 w-px bg-white/10 hidden md:block" />

                        <div
                            className={`text-center md:text-right flex-1 ${tournament.organization?.slug ? 'cursor-pointer group' : ''}`}
                            onClick={tournament.organization?.slug ? () => navigate(`/org/${tournament.organization.slug}`) : undefined}
                        >
                            <p className={`text-[10px] font-mono tracking-[0.3em] text-gray-500 uppercase mb-2 ${tournament.organization?.slug ? 'group-hover:text-esports-primary transition-colors' : ''}`}>Authenticated Host</p>
                            <div className={`flex items-center justify-center md:justify-end gap-3 ${tournament.organization?.slug ? 'group-hover:translate-x-1 transition-transform' : ''}`}>
                                {tournament.organization?.logo_url || tournament.organizer?.avatar_url ? (
                                    <img
                                        src={tournament.organization?.logo_url || tournament.organizer?.avatar_url}
                                        alt={tournament.organization?.name || tournament.organizer?.username}
                                        className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-gray-400" />
                                    </div>
                                )}
                                <span className={`text-lg font-bold text-white ${tournament.organization?.slug ? 'group-hover:text-esports-primary transition-colors' : ''}`}>
                                    {tournament.organization?.name || tournament.organizer?.username || 'Unknown Organizer'}
                                </span>
                                {tournament.organization?.slug && <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-esports-primary" />}
                            </div>
                        </div>
                    </div>


                    {/* 2. The "Mission Brief" - Typography Focus */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                        {/* Left: Section Title */}
                        <div className="lg:col-span-3">
                            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Mission Brief</h2>
                            <div className="h-1 w-20 bg-esports-primary mb-6" />
                            <p className="text-sm font-mono text-gray-500 leading-relaxed uppercase tracking-widest">
                                CLASSIFIED INTEL <br />
                                AUTHORIZED EYES ONLY
                            </p>
                            {/* Vertical Ad Placement (On Demand) */}
                            {showVerticalAd && <VerticalAdPlacement />}
                            {/* Tournament-specific sponsor sidebar */}
                            {tournament.id && <TournamentSponsorSidebar tournamentId={tournament.id} />}
                        </div>

                        {/* Right: Content */}
                        <div className="lg:col-span-9">
                            <div className="prose prose-invert prose-lg max-w-none">
                                <p className="text-2xl text-gray-200 font-light leading-relaxed">
                                    {tournament.description}
                                </p>
                            </div>

                            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12 border-t border-white/10 pt-12">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-blue-500" /> Timeframe
                                    </h4>
                                    <ul className="space-y-4">
                                        <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                            <span>Registration Deadline</span>
                                            <span className="text-white">{tournament.date}{tournament.time && ` • ${tournament.time}`}</span>
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

                                {/* Location / Venue */}
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                                        {tournament.settings?.isOnline === false
                                            ? <><MapPin className="w-4 h-4 text-red-500" /> Venue</>
                                            : <><Globe className="w-4 h-4 text-emerald-500" /> Location</>}
                                    </h4>
                                    <ul className="space-y-4">
                                        <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                            <span>Type</span>
                                            <span className="text-white">
                                                {tournament.settings?.isOnline === false ? 'LAN' : 'Online'}
                                            </span>
                                        </li>
                                        {tournament.settings?.isOnline === false && tournament.settings?.venue && (
                                            <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                                <span>Address</span>
                                                <span className="text-white text-right max-w-[200px]">
                                                    {tournament.settings.venue}
                                                </span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>

                            {/* Social Links */}
                            {(tournament.settings?.discordUrl || tournament.settings?.twitterUrl || tournament.stream_url) && (
                                <div className="mt-12 border-t border-white/10 pt-8">
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                                        <ExternalLink className="w-4 h-4 text-purple-500" /> Connect
                                    </h4>
                                    <div className="flex flex-wrap gap-4">
                                        {tournament.settings?.discordUrl && (
                                            <a
                                                href={tournament.settings.discordUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2.5 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-lg text-sm text-[#5865F2] hover:bg-[#5865F2]/20 transition-colors font-mono"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                Discord
                                                <ExternalLink className="w-3 h-3 opacity-50" />
                                            </a>
                                        )}
                                        {tournament.settings?.twitterUrl && (
                                            <a
                                                href={tournament.settings.twitterUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors font-mono"
                                            >
                                                𝕏
                                                Twitter/X
                                                <ExternalLink className="w-3 h-3 opacity-50" />
                                            </a>
                                        )}
                                        {tournament.stream_url && (
                                            <a
                                                href={tournament.stream_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm text-purple-400 hover:bg-purple-500/20 transition-colors font-mono"
                                            >
                                                📺
                                                Stream
                                                <ExternalLink className="w-3 h-3 opacity-50" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* 3. Self-Play Mode Info (Conditionally Rendered) */}
                    {isSelfPlayEnabled && (
                        <div className="p-8 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/5 border border-purple-500/20 rounded-3xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-purple-500/20 rounded-2xl">
                                    <Zap className="w-8 h-8 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white tracking-tight">Self-Play Mode</h3>
                                    <p className="text-sm text-purple-300/80">Teams coordinate and start matches themselves</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                                {[
                                    { step: '1', title: 'Round Deadline', desc: 'Organizer sets a deadline for each round' },
                                    { step: '2', title: 'Coordinate', desc: 'Teams chat and propose match times within deadline' },
                                    { step: '3', title: 'Check-In', desc: 'Both teams check in when ready to play' },
                                    { step: '4', title: 'Start Match', desc: 'Team 1 generates party code to start the match' },
                                ].map((item) => (
                                    <div key={item.step} className="flex flex-col items-center text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-lg mb-3">
                                            {item.step}
                                        </div>
                                        <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                                        <p className="text-gray-500 text-xs">{item.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 flex items-center gap-3 text-sm text-gray-400 border-t border-white/5 pt-6">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span>Match chat is always enabled for captains to coordinate</span>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

