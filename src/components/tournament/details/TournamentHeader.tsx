import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, ChevronRight, Swords, Edit, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Countdown } from '@/components/ui/Countdown';

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
    checkInStartTime
}) => {
    const navigate = useNavigate();

    return (
        <>
            {/* --- DYNAMIC BACKGROUND (Noise & Grid) --- */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
                {/* Accent Blobs */}
                <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-esports-primary/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
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
                        <img
                            src={tournament.image_url || '/placeholder.jpg'}
                            alt={tournament.name}
                            className="w-full h-full object-cover contrast-110"
                        />
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
                            <div className="mb-8 flex justify-center gap-4">
                                <span className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-esports-primary font-mono tracking-[0.2em] uppercase backdrop-blur-md">
                                    GAME: {tournament.game}
                                </span>
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
                                    <span className="text-white text-lg font-bold font-sans">{new Date(tournament.date).toLocaleDateString()}</span>
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
                                        {isRegistered && isCaptain && (
                                            <div className="flex gap-4">
                                                <Button onClick={() => navigate(`/tournaments/${tournament.slug || tournament.id}/captain-match`)} className="h-14 md:h-16 px-8 md:px-12 bg-emerald-600 hover:bg-emerald-500 text-white text-base md:text-lg font-bold font-mono tracking-wider rounded-none relative group overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-pulse">
                                                    <span className="relative z-10 flex items-center gap-2"><Swords className="w-5 h-5" /> ENTER MATCH ROOM</span>
                                                </Button>
                                                {(tournament.status === 'published' || tournament.status === 'open') && (
                                                    <Button variant="outline" onClick={onWithdraw} className="h-14 md:h-16 px-8 md:px-12 bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 text-base md:text-lg font-bold font-mono tracking-wider rounded-none transition-all duration-300">
                                                        WITHDRAW
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        {/* Withdraw button for non-captains or other states */}
                                        {isRegistered && !isCaptain && (tournament.status === 'published' || tournament.status === 'open') && (
                                            <Button variant="outline" onClick={onWithdraw} className="h-14 md:h-16 px-8 md:px-12 bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 text-base md:text-lg font-bold font-mono tracking-wider rounded-none transition-all duration-300">
                                                WITHDRAW ENTRY
                                            </Button>
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
