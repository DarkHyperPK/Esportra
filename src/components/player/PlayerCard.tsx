import React from 'react';
import { Shield, Crown, Camera, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PlayerCardProps {
    member: {
        user_id: string;
        username: string;
        avatar_url?: string;
        card_image_url?: string; // New field for player card specific image
        role?: string; // 'captain', 'member', etc.
        verified?: boolean;
        stats?: {
            rating?: number; // 99
            kd?: string; // 1.45
            winRate?: string; // 68%
            hs?: string; // 42%
        };
        game?: string; // For conditional stats display
    };
    isOwner?: boolean; // Is this player the team owner?
    isCurrentUser?: boolean; // Is this the logged-in user's card?
    onEdit?: () => void;
    onUploadImage?: () => void;
    className?: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ member, isOwner, isCurrentUser, onEdit, onUploadImage, className }) => {
    // If stats are provided, they are "Real", otherwise they are placeholders or indicative of missing data
    const stats = member.stats || {
        kd: '--',
        winRate: '--',
        hs: '--'
    };

    const isValorant = member.game?.toLowerCase().includes('valorant');
    const hasRealStats = !!member.stats && isValorant;

    return (
        <div
            className={cn(
                "relative group w-full aspect-[3/4] select-none perspective-1000",
                className
            )}
            onClick={onEdit}
        >
            {/* CARD CONTAINER */}
            <div className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden transition-all duration-500 group-hover:transform group-hover:scale-[1.02] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] group-hover:border-white/20">

                {/* CARD BACKGROUND IMAGE */}
                <div className="absolute inset-0 bg-black/40">
                    {member.card_image_url || member.avatar_url ? (
                        <img
                            src={member.card_image_url || member.avatar_url}
                            alt={member.username}
                            className={cn(
                                "w-full h-full object-cover transition-all duration-500",
                                "opacity-60 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105"
                            )}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black" />
                    )}
                </div>

                {/* Background Decor */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-[50px] group-hover:bg-indigo-500/20 transition-colors duration-500" />

                {/* HEADER (Role & Badge) */}
                <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5">
                    {/* Role Indicator - Flatter Premium Look (Gold) */}
                    {isOwner && (
                        <div className="relative group/badge flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-rose-500/50 transition-opacity duration-300 group-hover:opacity-0 overflow-hidden">
                            {/* Inner Glow Polish */}
                            <div className="absolute inset-0 bg-rose-500/5" />

                            {/* Moving Shine Effect */}
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-500/80 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span className="relative text-[10px] uppercase tracking-[0.25em] font-extrabold text-amber-100 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                Captain
                            </span>
                        </div>
                    )}

                    {member.role === 'coach' && (
                        <div className="relative group/badge flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/20 transition-opacity duration-300 group-hover:opacity-0 overflow-hidden">
                            <div className="absolute inset-0 bg-white/5" />
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                            <ClipboardList className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                            <span className="relative text-[10px] uppercase tracking-[0.25em] font-extrabold text-cyan-100 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                                Coach
                            </span>
                        </div>
                    )}


                </div>

                {/* Upload Photo Button (Top Right) - Controlled by parent prop presence */}
                {onUploadImage && (
                    <div className="absolute top-3 right-3 z-50">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/20 border border-white/10 backdrop-blur-xl text-white/90 hover:text-white transition-all duration-200"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUploadImage();
                            }}
                        >
                            <Camera className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}

                {/* BOTTOM INFO */}
                <div className="absolute bottom-0 inset-x-0 z-20 p-5 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pt-12">
                    <h3 className="text-2xl font-heading font-light uppercase tracking-widest text-white mb-4 text-center group-hover:text-white transition-colors duration-300">
                        {member.username}
                    </h3>

                    {/* Stats Grid - Hidden for now, will be re-enabled with platform stats */}
                    {false && isValorant && (
                        <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] uppercase tracking-widest text-white/30 mb-1">K/D</span>
                                <span className={cn(
                                    "text-sm font-mono font-bold",
                                    hasRealStats && parseFloat(stats.kd || '0') >= 1 ? "text-indigo-400" : "text-white/80"
                                )}>
                                    {stats.kd}
                                </span>
                            </div>
                            <div className="flex flex-col items-center border-l border-white/5">
                                <span className="text-[9px] uppercase tracking-widest text-white/30 mb-1">WIN</span>
                                <span className={cn(
                                    "text-sm font-mono font-bold",
                                    hasRealStats ? "text-emerald-400" : "text-white/80"
                                )}>
                                    {stats.winRate}
                                </span>
                            </div>
                            <div className="flex flex-col items-center border-l border-white/5">
                                <span className="text-[9px] uppercase tracking-widest text-white/30 mb-1">HS%</span>
                                <span className="text-sm font-mono text-white/80 font-bold">{stats.hs}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* HOVER BORDER GLOW */}
                <div className="absolute inset-0 rounded-2xl border border-white/0 group-hover:border-white/10 transition-colors duration-500 pointer-events-none" />
            </div>
        </div>
    );
};

export default PlayerCard;
