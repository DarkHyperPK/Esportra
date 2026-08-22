import React from 'react';
import { Users, ChevronRight, Clock, MapPin, Globe, ExternalLink, MessageCircle, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDateTime } from '@/utils/dateFormat';
import { apiClient } from '@/lib/apiClient';
import { VerticalAdPlacement } from './VerticalAdPlacement';
import { TournamentWidePartners } from '@/components/tournament/TournamentWidePartners';
import { TournamentPartnerLogos } from '@/components/tournament/TournamentPartnerLogos';

interface MapPoolMap {
    id: string;
    map_name: string;
    map_image_url?: string | null;
}


// Simple HTML entity decoder
const decodeHtml = (html: string) => {
    if (!html) return '';
    return html.replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&amp;/g, '&')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'")
               .replace(/&#x27;/g, "'")
               .replace(/&#x2F;/g, '/')
               .replace(/&#60;/g, '<')
               .replace(/&#62;/g, '>')
               .replace(/&#38;/g, '&')
               .replace(/&#34;/g, '"');
};

interface OverviewTabProps {
    tournament: any;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ tournament }) => {
    const navigate = useNavigate();

    const { data: mapPool } = useQuery({
        queryKey: ['tournament-map-pool', tournament.id],
        queryFn: async () => {
            const res = await apiClient.get<any[]>(`/api/tournaments/${tournament.id}/map-pool`);
            return (res || []).map((item: any) => {
                if (item.game_maps) {
                    return { id: item.game_maps.id, map_name: item.game_maps.map_name, map_image_url: item.game_maps.map_image_url };
                }
                return { id: item.id, map_name: item.map_name, map_image_url: item.map_image_url };
            }) as MapPoolMap[];
        },
        enabled: !!tournament.id,
        staleTime: 60_000,
    });

    // Check if vertical ad is enabled for this tournament

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
                                        loading="lazy"
                                        decoding="async"
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
                            {/* Sidebar Partner Ads */}
                            {tournament.id && <VerticalAdPlacement tournamentId={tournament.id} />}
                        </div>

                        {/* Right: Content */}
                        <div className="lg:col-span-9">
                            <div className="prose prose-invert prose-lg max-w-none">
                                <div
                                    className="text-[18px] text-gray-200 font-light leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: decodeHtml(tournament.description || '') }}
                                />
                            </div>

                            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-12 border-t border-white/10 pt-12">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-blue-500" /> Timeframe
                                    </h4>
                                    <ul className="space-y-4">
                                        <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                            <span>Tournament Start</span>
                                            <span className="text-white">{tournament.date}{tournament.time && ` • ${tournament.time}`}</span>
                                        </li>
                                        <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                            <span>Registration Deadline</span>
                                            <span className="text-white">
                                              {tournament.registration_deadline
                                                ? formatDateTime(tournament.registration_deadline)
                                                : '—'}
                                            </span>
                                        </li>
                                        <li className="flex justify-between text-sm text-gray-400 font-mono border-b border-white/5 pb-2">
                                            <span>Check-In Window</span>
                                            <span className="text-white">30m Pre-Match</span>
                                        </li>
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
                                                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors font-mono"
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
                                                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 transition-colors font-mono"
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
                                                className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400 hover:bg-rose-500/20 transition-colors font-mono"
                                            >
                                                📺
                                                Stream
                                                <ExternalLink className="w-3 h-3 opacity-50" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Map Pool */}
                            {mapPool && mapPool.length > 0 && (
                                <div className="space-y-6 pt-8 border-t border-white/5">
                                    <div className="flex items-center gap-3">
                                        <Map className="w-5 h-5 text-rose-400" />
                                        <h3 className="text-sm font-mono tracking-[0.2em] text-gray-400 uppercase">Map Pool</h3>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {mapPool.map((map) => (
                                            <div key={map.id} className="relative group overflow-hidden border border-white/10 bg-black/40">
                                                {map.map_image_url ? (
                                                    <img
                                                        src={map.map_image_url}
                                                        alt={map.map_name}
                                                        className="w-full h-24 object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                                    />
                                                ) : (
                                                    <div className="w-full h-24 bg-white/5 flex items-center justify-center">
                                                        <Map className="w-6 h-6 text-gray-600" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                                                    <span className="text-xs font-bold text-white tracking-wide">{map.map_name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Wide Partner Cards (2x2 grid) */}
                            {tournament.id && <TournamentWidePartners tournamentId={tournament.id} />}

                            {/* Partner Logos Row */}
                            {tournament.id && <TournamentPartnerLogos tournamentId={tournament.id} />}

                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
};

