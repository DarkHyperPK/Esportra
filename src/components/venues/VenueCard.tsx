import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { MapPin, Trophy, CheckCircle, Clock, Star, Monitor, Wifi, Coffee, Gamepad2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

import { Venue, VenueStatus } from '@/types/venue';

const STATUS_BADGE: Record<VenueStatus, { label: string; classes: string }> = {
    draft:          { label: 'Draft',          classes: 'bg-zinc-700/90 text-zinc-200' },
    pending_review: { label: 'Pending Review', classes: 'bg-yellow-600/80 text-yellow-100' },
    published:      { label: 'Published',      classes: 'bg-emerald-600/80 text-emerald-100' },
    rejected:       { label: 'Rejected',       classes: 'bg-rose-600/80 text-rose-100' },
    suspended:      { label: 'Suspended',      classes: 'bg-orange-600/80 text-orange-100' },
    archived:       { label: 'Archived',       classes: 'bg-zinc-800/90 text-zinc-400' },
};

interface VenueCardProps {
    venue: Venue;
    showStatus?: boolean;
}

export const VenueCard: React.FC<VenueCardProps> = ({ venue, showStatus = false }) => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);

    // Parse amenities/games from string if needed
    const gameList = venue.games ? venue.games.split(',').map(g => g.trim()).slice(0, 3) : [];

    // Default Amenities icons mapping (Mock logic for visual richness)
    const getAmenityIcon = (amenity: string) => {
        const lower = amenity.toLowerCase();
        if (lower.includes('wifi')) return <Wifi className="w-3 h-3" />;
        if (lower.includes('pc') || lower.includes('station')) return <Monitor className="w-3 h-3" />;
        if (lower.includes('cafe') || lower.includes('food')) return <Coffee className="w-3 h-3" />;
        return <CheckCircle className="w-3 h-3" />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, scale: 1.01 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            transition={{ duration: 0.3 }}
            className="group relative h-[380px] w-full rounded-3xl overflow-hidden bg-[#0a0a0c] border border-white/5 shadow-2xl cursor-pointer"
            onClick={() => navigate(`/venues/${venue.slug || venue.id}`)}
        >
            {/* 1. Background Image Layer */}
            <div className="absolute inset-0 z-0 bg-black">
                <motion.div
                    animate={{ scale: isHovered ? 1.05 : 1 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="w-full h-full relative"
                >
                    <OptimizedImage
                        src={venue.card_image || venue.image_url || ((venue as any).images && (venue as any).images[0]) || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'}
                        className="w-full h-full object-cover object-center opacity-50 group-hover:opacity-60 transition-opacity"
                        alt={venue.name}
                        width={800}
                    />
                </motion.div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/80 to-[#050507]/30 opacity-100" />
            </div>

            {/* 2. Top Bar (Floating) */}
            <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-10">
                <div className="flex gap-2 flex-wrap">
                    {/* Status badge (owner context only) */}
                    {showStatus && venue.status && STATUS_BADGE[venue.status as VenueStatus] && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md ${STATUS_BADGE[venue.status as VenueStatus].classes}`}>
                            {STATUS_BADGE[venue.status as VenueStatus].label}
                        </span>
                    )}
                    {venue.openNow !== undefined && (
                        <Badge className={cn(
                            "border-none shadow-sm flex items-center gap-1.5 backdrop-blur-md",
                            venue.openNow
                                ? "bg-emerald-600/90 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                : "bg-red-600/90 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                        )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", venue.openNow ? "bg-white animate-pulse" : "bg-white/50")} />
                            {venue.openNow ? 'OPEN NOW' : 'CLOSED'}
                        </Badge>
                    )}
                    <Badge variant="outline" className="bg-black/60 border-white/10 backdrop-blur-md text-purple-400">
                        {venue.stations} Stations
                    </Badge>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-xs font-bold">{venue.rating || 'N/A'}</span>
                </div>
            </div>

            {/* 3. Bottom Glass Pane content */}
            <div className="absolute bottom-0 inset-x-0 p-5 z-20 flex flex-col gap-4">

                {/* Main Info */}
                <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-heading flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {venue.city}
                        </span>
                        <div className="h-[1px] flex-grow bg-gradient-to-r from-cyan-400/50 to-transparent" />
                    </div>

                    <h3 className="text-2xl font-bold text-white font-heading leading-tight mb-3 line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all">
                        {venue.name}
                    </h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400 mb-4">
                        {/* Games / Amenities Chips */}
                        <div className="flex gap-2 flex-wrap">
                            {gameList.map((game, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-xs text-gray-300">
                                    <Gamepad2 className="w-3 h-3 text-purple-400" />
                                    {game}
                                </span>
                            ))}
                            {venue.stations > 20 && (
                                <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-xs text-gray-300">
                                    <Monitor className="w-3 h-3 text-cyan-400" />
                                    High-End PCs
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm border-t border-white/5 pt-3 mt-1">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{venue.hours}</span>
                        </div>
                        <div className="font-bold text-white">
                            {venue.price_range}
                        </div>
                    </div>
                </div>

                {/* Action Button Area - Slide Up on Hover */}
                <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                    <div className="flex gap-2 w-full pt-2">
                        <Button
                            className="flex-1 font-bold tracking-wide bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
                            onClick={(e) => { e.stopPropagation(); navigate(`/venues/${venue.slug || venue.id}`); }}
                        >
                            View Venue
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                            onClick={(e) => { e.stopPropagation(); /* Add to favorites logic */ }}
                            title="Save Venue"
                        >
                            <div className="text-rose-500">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            </div>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Decorative Glow Border */}
            <div className="absolute inset-0 rounded-3xl border border-white/5 group-hover:border-white/20 transition-colors duration-300 pointer-events-none" />
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]" />

        </motion.div>
    );
};
