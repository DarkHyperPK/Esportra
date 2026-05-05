import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, ChevronRight, Swords, Edit, Upload, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Countdown } from '@/components/ui/Countdown';
import { isBattleRoyale } from '@/utils/gameFeatures';
import { useRawgGame } from '@/hooks/useRawgGame';

interface TournamentHeaderProps {
    tournament: any;
    isOrganizer: boolean;
    isRegistered: boolean;
    hasMissedCheckIn: boolean;
    canSelfCheckIn: boolean;
    checkInSubmitting: boolean;
    isCaptain: boolean;
    onRegister: () => void;
    onWithdraw: () => void;
    onCheckIn: () => void;

    isLoading?: boolean; // New prop
    checkInStartTime?: Date | null;
    awaitingApproval?: boolean;
}

export const TournamentHeader: React.FC<TournamentHeaderProps> = ({
    tournament,
    isOrganizer,
    isRegistered,
    hasMissedCheckIn,
    canSelfCheckIn,
    checkInSubmitting,
    isCaptain,
    onRegister,
    onWithdraw,
    onCheckIn,
    isLoading = false, // Default to false
    checkInStartTime,
    awaitingApproval = false
}) => {
    const navigate = useNavigate();
    const gameData = useRawgGame(tournament.game || '', { enabled: !tournament.image_url });
    const bannerSrc = tournament.image_url || gameData.gameBanner || '/placeholder.svg';
    const isVideoBanner = bannerSrc.includes('youtube.com/embed/');

    return (
        <>
            {/* --- DYNAMIC BACKGROUND (Noise & Grid) --- */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
                <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 pb-20">

                {/* --- HERO SECTION --- */}
                <section className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 overflow-hidden">

                    {/* Background Image Parallax */}
                    <motion.div
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.4 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 z-0"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-10" />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-transparent z-10" />
                        {isVideoBanner ? (
                            <div className="absolute inset-0 overflow-hidden">
                                <iframe
                                    src={bannerSrc}
                                    title={tournament.name}
                                    className="absolute top-1/2 left-1/2 pointer-events-none"
                                    style={{
                                        border: 'none',
                                        width: '177.78vh',   // 16:9 width relative to viewport height
                                        height: '56.25vw',   // 16:9 height relative to viewport width
                                        minWidth: '100%',
                                        minHeight: '100%',
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                    allow="autoplay; encrypted-media"
                                />
                            </div>
                        ) : (
                            <img
                                src={bannerSrc}
                                alt={tournament.name}
                                decoding="async"
                                fetchPriority="high"
                                className="w-full h-full object-cover contrast-110"
                            />
                        )}
                        {isOrganizer && (
                            <div className="absolute top-8 right-8 z-30">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => (window as any).dispatchBannerEdit?.()}
                                    className="bg-black/40 border-white/10 text-white backdrop-blur-md hover:bg-white/10 flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    EDIT BANNER
                                </Button>
                            </div>
                        )}
                    </motion.div>

                    {/* Hero Content */}
                    <div className="relative z-20 text-center max-w-6xl mx-auto mt-40">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            <div className="mb-8 flex flex-wrap justify-center gap-4">
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-esports-primary font-mono tracking-[0.2em] uppercase backdrop-blur-md">
                                    GAME: {tournament.game}
                                </span>
                                {tournament.region && (
                                    <span className="px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 font-mono tracking-[0.2em] uppercase backdrop-blur-md">
                                        REGION: {{ 'na-east': 'NA East', 'na-west': 'NA West', 'latam': 'LATAM', 'eu': 'EU', 'me': 'ME', 'sea': 'SEA', 'oce': 'OCE' }[tournament.region] || tournament.region}
                                    </span>
                                )}
                                <span className={cn(
                                    "px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-mono tracking-[0.2em] uppercase backdrop-blur-md",
                                    tournament.status === 'published' ? "text-blue-400" :
                                        tournament.status === 'open' ? "text-emerald-400" :
                                            tournament.status === 'closed' ? "text-amber-400" :
                                                tournament.status === 'ongoing' ? "text-red-400" :
                                                    tournament.status === 'completed' ? "text-zinc-400" :
                                                        "text-gray-400"
                                )}>
                                    STATUS: {tournament.status}
                                </span>
                            </div>

                            {/* Winner Banner */}
                            {tournament.status === 'completed' && tournament.winner_team_name && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.6, delay: 0.4 }}
                                    className="mt-8 inline-flex items-center gap-3 px-6 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-full backdrop-blur-md"
                                >
                                    <Trophy className="w-5 h-5 text-yellow-400" />
                                    <span className="text-sm font-bold text-yellow-300 uppercase tracking-wider">
                                        Winner: {tournament.winner_team_name}
                                    </span>
                                </motion.div>
                            )}

                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-4 leading-none text-white mix-blend-difference">
                                {tournament.name.split(' ').slice(0, 2).join(' ')}
                            </h1>
                            {tournament.name.split(' ').length > 2 && (
                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                                    {tournament.name.split(' ').slice(2).join(' ')}
                                </h1>
                            )}

                            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mt-8 text-xs md:text-sm font-mono text-gray-400 tracking-widest uppercase">
                                <div className="flex flex-col items-center gap-2">
                                    <Trophy className="w-5 h-5 text-yellow-500 mb-2" />
                                    <span>Prize Pool</span>
                                    <span className="text-white text-lg font-bold font-sans">{tournament.prize_pool}</span>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-500 mb-2" />
                                    <span>Start Date</span>
                                    <span className="text-white text-lg font-bold font-sans">{tournament.date}{tournament.time && ` • ${tournament.time}`}</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <Users className="w-5 h-5 text-green-500 mb-2" />
                                    <span>Teams</span>
                                    <span className="text-white text-lg font-bold font-sans">{tournament.current_participants}</span>
                                </div>
                            </div>

                            {/* Primary Action Button */}
                            <div className="mt-12 md:mt-16 mb-24 flex justify-center relative z-50 h-[64px]">
                                {isLoading ? (
                                    <div className="h-14 md:h-16 w-64 bg-white/5 animate-pulse rounded-none border border-white/10" />
                                ) : isOrganizer ? (
                                    <Button onClick={() => navigate(`/organizer/tournament/${tournament.slug || tournament.id}`)} className="h-14 md:h-16 px-8 md:px-12 bg-white text-black hover:bg-gray-200 text-base md:text-lg font-bold font-mono tracking-wider rounded-none relative group overflow-hidden">
                                        <span className="relative z-10 flex items-center gap-2">MANAGE EVENT</span>
                                    </Button>
                                ) : (
                                    <>
                                        {!isRegistered && !hasMissedCheckIn && (tournament.status === 'published' || tournament.status === 'open') && (
                                            <Button onClick={onRegister} className="h-14 md:h-16 px-8 md:px-12 bg-green-600 hover:bg-green-500 text-white text-base md:text-lg font-bold font-mono tracking-wider rounded-none relative group overflow-hidden shadow-[0_0_40px_rgba(22,163,74,0.3)]">
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                                <span className="relative z-10 flex items-center gap-2">INITIATE REGISTRATION <ChevronRight className="w-5 h-5" /></span>
                                            </Button>
                                        )}
                                        {isRegistered && awaitingApproval && (
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-3 h-14 md:h-16 px-8 md:px-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-base md:text-lg font-bold font-mono tracking-wider rounded-none">
                                                    <Clock className="w-5 h-5 animate-pulse" />
                                                    PENDING APPROVAL
                                                </div>
                                                {isCaptain && (tournament.status === 'published' || tournament.status === 'open') && (
                                                    <Button variant="outline" onClick={onWithdraw} className="h-14 md:h-16 px-8 md:px-12 bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 text-base md:text-lg font-bold font-mono tracking-wider rounded-none transition-all duration-300">
                                                        WITHDRAW
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        {isRegistered && !awaitingApproval && isCaptain && (
                                            <div className="flex gap-4">
                                                {isBattleRoyale(tournament.game || '') ? (
                                                    <Button onClick={() => navigate(`/tournaments/${tournament.slug || tournament.id}/br-lobby`)} className="h-14 md:h-16 px-8 md:px-12 bg-emerald-600 hover:bg-emerald-500 text-white text-base md:text-lg font-bold font-mono tracking-wider rounded-none relative group overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-pulse">
                                                        <span className="relative z-10 flex items-center gap-2"><Swords className="w-5 h-5" /> ENTER GAME ROOM</span>
                                                    </Button>
                                                ) : (
                                                    <Button onClick={() => navigate(`/tournaments/${tournament.slug || tournament.id}/captain-match`)} className="h-14 md:h-16 px-8 md:px-12 bg-emerald-600 hover:bg-emerald-500 text-white text-base md:text-lg font-bold font-mono tracking-wider rounded-none relative group overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-pulse">
                                                        <span className="relative z-10 flex items-center gap-2"><Swords className="w-5 h-5" /> ENTER MATCH ROOM</span>
                                                    </Button>
                                                )}
                                                {(tournament.status === 'published' || tournament.status === 'open') && (
                                                    <Button variant="outline" onClick={onWithdraw} className="h-14 md:h-16 px-8 md:px-12 bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 text-base md:text-lg font-bold font-mono tracking-wider rounded-none transition-all duration-300">
                                                        WITHDRAW
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {canSelfCheckIn && (
                                            <Button onClick={onCheckIn} disabled={checkInSubmitting} className="ml-4 h-14 md:h-16 px-8 md:px-12 bg-green-600 hover:bg-green-500 text-white text-base md:text-lg font-bold font-mono tracking-wider rounded-none animate-pulse">
                                                CONFIRM PRESENCE
                                            </Button>
                                        )}
                                        {/* Countdown for Check-in */}
                                        {!canSelfCheckIn && isRegistered && isCaptain && !hasMissedCheckIn && checkInStartTime && new Date() < checkInStartTime && (
                                            <div className="ml-4 h-14 md:h-16 px-8 flex flex-col justify-center items-center bg-gray-900/80 border border-white/10 text-white rounded-none backdrop-blur-md">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mb-1">Check-in Opens In</span>
                                                <div className="text-xl font-mono text-emerald-400 leading-none">
                                                    <Countdown targetDate={checkInStartTime} />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex justify-center opacity-50">
                        <p className="text-[10px] font-mono text-gray-600 tracking-[0.5em] uppercase">Scroll for Intel</p>
                    </div>
                </section>
            </div>
        </>
    );
};
