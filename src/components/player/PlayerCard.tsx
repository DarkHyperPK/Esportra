import React from 'react';
import { Crown, Camera, ClipboardList, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlayerHandle } from '@/components/profile/PlayerHandle';

interface PlayerCardProps {
    member: {
        user_id: string;
        username?: string;
        avatar_url?: string;
        card_image_url?: string;
        role?: string;
        verified?: boolean;
        stats?: {
            rating?: number;
            kd?: string;
            winRate?: string;
            hs?: string;
        };
        game?: string;
    };
    isOwner?: boolean;
    isCurrentUser?: boolean;
    onEdit?: () => void;
    onUploadImage?: () => void;
    onRemove?: () => void;
    className?: string;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ member, isOwner, isCurrentUser: _isCurrentUser, onEdit, onUploadImage, onRemove, className }) => {
    const hasStats = member.stats && (member.stats.rating || member.stats.kd || member.stats.winRate || member.stats.hs);

    return (
        <div
            className={cn(
                "relative group w-full aspect-[3/4] select-none cursor-pointer",
                className
            )}
            onClick={onEdit}
        >
            {/* OUTER FRAME — double-border premium look */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent p-px">
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    {/* BACKGROUND IMAGE */}
                    <div className="absolute inset-0">
                        {member.card_image_url || member.avatar_url ? (
                            <img
                                src={member.card_image_url || member.avatar_url}
                                alt={member.username}
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
                        )}
                    </div>

                    {/* CINEMATIC OVERLAY LAYERS */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-950/30 via-transparent to-rose-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* TOP EDGE HIGHLIGHT */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    {/* CORNER ACCENTS */}
                    <div className="absolute top-0 left-0 w-8 h-8">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-white/40 to-transparent" />
                        <div className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-white/40 to-transparent" />
                    </div>
                    <div className="absolute top-0 right-0 w-8 h-8">
                        <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-l from-white/40 to-transparent" />
                        <div className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-white/40 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 w-8 h-8">
                        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 h-full w-px bg-gradient-to-t from-white/20 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-8 h-8">
                        <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-l from-white/20 to-transparent" />
                        <div className="absolute bottom-0 right-0 h-full w-px bg-gradient-to-t from-white/20 to-transparent" />
                    </div>

                    {/* SCAN LINE TEXTURE (subtle) */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 3px)' }} />

                    {/* ROLE BADGE */}
                    <div className="absolute top-3 left-3 z-20">
                        {isOwner && (
                            <div className="relative flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-amber-500/40 rounded-sm overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent" />
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
                                <Crown className="relative w-3 h-3 text-amber-400 fill-amber-500/70" />
                                <span className="relative text-[9px] uppercase tracking-[0.2em] font-black text-amber-200/90">
                                    Captain
                                </span>
                            </div>
                        )}

                        {member.role === 'coach' && (
                            <div className="relative flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-cyan-500/40 rounded-sm overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent" />
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
                                <ClipboardList className="relative w-3 h-3 text-cyan-400" />
                                <span className="relative text-[9px] uppercase tracking-[0.2em] font-black text-cyan-200/90">
                                    Coach
                                </span>
                            </div>
                        )}
                    </div>

                    {/* REMOVE BUTTON */}
                    {onRemove && (
                        <div className={`absolute z-50 ${onUploadImage ? 'top-12' : 'top-3'} right-3`}>
                            <Button
                                size="icon"
                                variant="ghost"
                                title="Remove from team"
                                className="h-7 w-7 rounded-sm bg-black/50 hover:bg-rose-500/20 border border-white/10 backdrop-blur-md text-white/60 hover:text-rose-400 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    )}

                    {/* UPLOAD BUTTON */}
                    {onUploadImage && (
                        <div className="absolute top-3 right-3 z-50">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-sm bg-black/50 hover:bg-white/10 border border-white/10 backdrop-blur-md text-white/80 hover:text-white transition-all duration-200"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUploadImage();
                                }}
                            >
                                <Camera className="w-3 h-3" />
                            </Button>
                        </div>
                    )}

                    {/* BOTTOM CONTENT AREA */}
                    <div className="absolute bottom-0 inset-x-0 z-20 p-4">
                        {/* PLAYER NAME */}
                        <div className="relative mb-3">
                            <div className="absolute -top-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            <PlayerHandle userId={member.user_id} asSpan>
                                <h3 className="text-lg font-black uppercase tracking-[0.15em] text-white text-center leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                                    {member.username}
                                </h3>
                            </PlayerHandle>
                        </div>

                        {/* STATS GRID */}
                        {hasStats && (
                            <div className="grid grid-cols-2 gap-px bg-white/[0.06] rounded-sm overflow-hidden">
                                {member.stats?.rating != null && (
                                    <div className="bg-black/70 backdrop-blur-sm px-2.5 py-2 text-center">
                                        <div className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">Rating</div>
                                        <div className="text-sm font-black tabular-nums text-white mt-0.5">{member.stats.rating}</div>
                                    </div>
                                )}
                                {member.stats?.kd && (
                                    <div className="bg-black/70 backdrop-blur-sm px-2.5 py-2 text-center">
                                        <div className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">K/D</div>
                                        <div className="text-sm font-black tabular-nums text-emerald-400 mt-0.5">{member.stats.kd}</div>
                                    </div>
                                )}
                                {member.stats?.winRate && (
                                    <div className="bg-black/70 backdrop-blur-sm px-2.5 py-2 text-center">
                                        <div className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">Win%</div>
                                        <div className="text-sm font-black tabular-nums text-sky-400 mt-0.5">{member.stats.winRate}</div>
                                    </div>
                                )}
                                {member.stats?.hs && (
                                    <div className="bg-black/70 backdrop-blur-sm px-2.5 py-2 text-center">
                                        <div className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">HS%</div>
                                        <div className="text-sm font-black tabular-nums text-rose-400 mt-0.5">{member.stats.hs}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* HOVER GLOW RING */}
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 group-hover:ring-white/[0.12] transition-all duration-500 pointer-events-none" />
                    <div className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'conic-gradient(from 180deg, transparent 60%, rgba(99,102,241,0.15) 75%, transparent 90%)' }} />
                </div>
            </div>
        </div>
    );
};

export default PlayerCard;
