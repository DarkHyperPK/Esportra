import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Calendar, Users, ChevronRight, Swords, Edit, Clock, Mail, BookOpen } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button-variants';
import { SuccessButton } from '@/components/ui/app-buttons';
import { JackButton } from '@/components/ui/JackButton';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Countdown } from '@/components/ui/Countdown';
import {
  deriveTournamentPhase,
  getDerivedPhaseColorClass,
  getDerivedPhaseLabel,
  getRegistrationOpensFromSettings,
} from '@/utils/tournamentLifecycle';
import { isBattleRoyale } from '@/utils/gameFeatures';
import { formatCurrency } from '@/utils/formatCurrency';
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
    showOpenRegistration?: boolean;
    showInviteRedemption?: boolean;
    onRedeemInvite?: () => void;

    isLoading?: boolean; // New prop
    checkInStartTime?: Date | null;
    awaitingApproval?: boolean;
    maxTeams?: number;
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
    showOpenRegistration = false,
    showInviteRedemption = false,
    onRedeemInvite,
    isLoading = false, // Default to false
    checkInStartTime,
    awaitingApproval = false,
    maxTeams
}) => {
    const navigate = useNavigate();
    const derivedPhase = deriveTournamentPhase({
        status: tournament.status,
        registrationOpens: getRegistrationOpensFromSettings(tournament.settings),
        registrationDeadline: tournament.registration_deadline,
        startDate: tournament.start_date,
    });
    const phaseLabel = getDerivedPhaseLabel(derivedPhase);
    const phaseColorClass = getDerivedPhaseColorClass(derivedPhase);
    const gameData = useRawgGame(tournament.game || '', {
        enabled: !tournament.image_url,
        skipRawg: true,
    });
    const bannerSrc = tournament.image_url || gameData.gameBanner || '/placeholder.svg';
    const isVideoBanner = bannerSrc.includes('youtube.com/embed/');

    return (
        <>
            <div className="relative z-10 pb-20">

                {/* --- HERO SECTION --- */}
                <section className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 overflow-hidden">

                    {/* Background Image Parallax */}
                    <motion.div
                        initial={{ scale: 1.1, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 z-0"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent z-10" />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0c]/30 via-transparent to-transparent z-10" />
                        <div className="absolute inset-0 bg-black/60 z-[5]" />
                        {isVideoBanner ? (
                            <div className="absolute inset-0 overflow-hidden">
                                <iframe
                                    src={bannerSrc}
                                    title={tournament.name}
                                    className="absolute top-1/2 left-1/2 pointer-events-none"
                                    style={{
                                        border: 'none',
                                        width: '177.78vh',
                                        height: '56.25vw',
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
                                <button type="button"
                                    onClick={() => (window as any).dispatchBannerEdit?.()}
                                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'bg-black/40 border-white/10 text-white backdrop-blur-md hover:bg-white/10 flex items-center gap-2')}
                                >
                                    <Edit className="w-4 h-4" />
                                    EDIT BANNER
                                </button>
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
                                        REGION: {{ 'na-east': 'NA East', 'na-west': 'NA West', 'latam': 'LATAM', 'eu': 'EU', 'me': 'ME', 'sea': 'SEA', 'oce': 'OCE' }[tournament.region as keyof { 'na-east': string; 'na-west': string; latam: string; eu: string; me: string; sea: string; oce: string }] || tournament.region}
                                    </span>
                                )}
                                <span className={cn(
                                    "px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-mono tracking-[0.2em] uppercase backdrop-blur-md",
                                    phaseColorClass
                                )}>
                                    STATUS: {phaseLabel}
                                </span>
                            </div>

                            {/* Winner Banner */}
                            {tournament.winner_team_name && (
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
                                    <span className="text-white text-lg font-bold font-sans">
                                        {formatCurrency(parseFloat(tournament.prize_pool) || 0, tournament.currency)}
                                    </span>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-500 mb-2" />
                                    <span>Start Date</span>
                                    <span className="text-white text-lg font-bold font-sans">{tournament.date}{tournament.time && ` • ${tournament.time}`}</span>
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <Users className="w-5 h-5 text-green-500 mb-2" />
                                    <span>Teams</span>
                                    <span className="text-white text-lg font-bold font-sans">
                                        {tournament.current_participants}{maxTeams ? ` / ${maxTeams}` : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Primary Action Button */}
                            <div className="mt-12 md:mt-16 mb-24 flex justify-center relative z-50 min-h-[64px]">
                                {isLoading ? (
                                    <div className="h-14 md:h-16 w-64 bg-white/5 animate-pulse rounded-none border border-white/10" />
                                ) : isOrganizer ? (
                                    <JackButton
                                        onClick={() => navigate(`/organizer/tournament/${tournament.slug || tournament.id}`)}
                                        size="lg"
                                        className="h-14 px-8 text-base md:h-16 md:px-12 md:text-lg"
                                    >
                                        MANAGE EVENT
                                    </JackButton>
                                ) : (
                                    <>
                                        {!isRegistered && !hasMissedCheckIn && (showOpenRegistration || showInviteRedemption) && (
                                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                                {showOpenRegistration && (
                                                    <SuccessButton
                                                        onClick={onRegister}
                                                        size="hero"
                                                        className="active:scale-[0.98] transition-transform"
                                                    >
                                                        <span className="flex items-center gap-2">INITIATE REGISTRATION <ChevronRight className="w-5 h-5" /></span>
                                                    </SuccessButton>
                                                )}
                                                {showInviteRedemption && onRedeemInvite && (
                                                    <button type="button"
                                                        onClick={onRedeemInvite}
                                                        className="h-14 md:h-16 px-8 md:px-12 border border-purple-500/40 bg-purple-600/20 hover:bg-purple-600/40 text-white text-base md:text-lg font-bold font-mono tracking-wider rounded-none shadow-[0_0_30px_rgba(147,51,234,0.15)]"
                                                    >
                                                        <span className="flex items-center gap-2">HAVE INVITATION? <Mail className="w-5 h-5" /></span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {isRegistered && awaitingApproval && (
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-3 h-14 md:h-16 px-8 md:px-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-base md:text-lg font-bold font-mono tracking-wider rounded-none">
                                                    <Clock className="w-5 h-5 animate-pulse" />
                                                    PENDING APPROVAL
                                                </div>
                                                {isCaptain && (tournament.status === 'published' || tournament.status === 'open') && (
                                                    <button type="button" onClick={onWithdraw} className="h-14 md:h-16 px-8 md:px-12 bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 text-base md:text-lg font-bold font-mono tracking-wider rounded-none transition-all duration-300">
                                                        WITHDRAW
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {isRegistered && !awaitingApproval && isCaptain && (
                                            <div className="flex gap-4">
                                                {isBattleRoyale(tournament.game || '') ? (
                                                    <SuccessButton onClick={() => navigate(`/tournaments/${tournament.slug || tournament.id}/br-game-room`)} size="hero" className="active:scale-[0.98] transition-transform">
                                                        <span className="relative z-10 flex items-center gap-2"><Swords className="w-5 h-5" /> ENTER GAME ROOM</span>
                                                    </SuccessButton>
                                                ) : (
                                                    <SuccessButton onClick={() => navigate(`/tournaments/${tournament.slug || tournament.id}/captain-match`)} size="hero" className="active:scale-[0.98] transition-transform">
                                                        <span className="relative z-10 flex items-center gap-2"><Swords className="w-5 h-5" /> ENTER MATCH ROOM</span>
                                                    </SuccessButton>
                                                )}
                                                {(tournament.status === 'published' || tournament.status === 'open') && (
                                                    <button type="button" onClick={onWithdraw} className="h-14 md:h-16 px-8 md:px-12 bg-transparent border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 text-base md:text-lg font-bold font-mono tracking-wider rounded-none transition-all duration-300">
                                                        WITHDRAW
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {canSelfCheckIn && (
                                            <SuccessButton onClick={onCheckIn} disabled={checkInSubmitting} size="hero" className="ml-4 active:scale-[0.98] transition-transform">
                                                CONFIRM PRESENCE
                                            </SuccessButton>
                                        )}
                                        {/* Countdown for Check-in */}
                                        {!canSelfCheckIn && !awaitingApproval && isRegistered && isCaptain && !hasMissedCheckIn && checkInStartTime && new Date() < checkInStartTime && (
                                            <div className="ml-4 h-14 md:h-16 px-8 flex flex-col justify-center items-center bg-gray-900/80 border border-white/10 text-white rounded-none backdrop-blur-md">
                                                <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mb-1">Check-in Opens In</span>
                                                <div className="text-xl font-mono text-emerald-400 leading-none">
                                                    <Countdown targetDate={checkInStartTime} />
                                                </div>
                                            </div>
                                        )}
                                        <Link
                                            to="/help"
                                            className="self-center ml-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500 hover:text-rose-400 transition-colors"
                                        >
                                            <BookOpen className="h-4 w-4" />
                                            Player Guide
                                        </Link>
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
