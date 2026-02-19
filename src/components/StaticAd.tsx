import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { trackImpression, trackClick } from '@/hooks/useSponsors';

interface StaticAdProps {
    sponsorId?: string; // Optional for mocks, required for tracking
    imageUrl: string;
    linkUrl: string;
    alt: string;
    className?: string;
    label?: string;
}

export const StaticAd = ({
    sponsorId,
    imageUrl,
    linkUrl,
    alt,
    className = "",
    label = "Sponsored",
    variant = 'banner'
}: StaticAdProps & { variant?: 'banner' | 'sidebar' | 'box' | 'landscape' | 'wide' }) => {
    const adRef = useRef<HTMLAnchorElement>(null);
    const [hasImpression, setHasImpression] = useState(false);

    useEffect(() => {
        if (!sponsorId || hasImpression) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    trackImpression(sponsorId);
                    setHasImpression(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 } // Trigger when 50% is visible
        );

        if (adRef.current) {
            observer.observe(adRef.current);
        }

        return () => observer.disconnect();
    }, [sponsorId, hasImpression]);

    const handleClick = () => {
        if (sponsorId) {
            trackClick(sponsorId);
        }
    };

    return (
        <motion.a
            ref={adRef}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className={`block relative group overflow-hidden rounded-xl border border-white/5 bg-[#0a0a0c] 
                ${variant === 'sidebar' ? 'aspect-[300/600] w-full max-w-[300px]' : ''}
                ${variant === 'box' ? 'aspect-square w-full' : ''}
                ${variant === 'landscape' ? 'aspect-[3/2] w-full' : ''}
                ${variant === 'wide' ? 'aspect-[2/1] w-full' : ''}
                ${className}`}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
        >
            {/* Label */}
            <div className="absolute top-2 right-2 z-10">
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 bg-black/50 backdrop-blur rounded border border-white/10 group-hover:text-white group-hover:border-white/20 transition-colors">
                    {label}
                </span>
            </div>

            {/* Image */}
            <div className={`w-full h-full relative ${variant === 'banner' ? 'aspect-[16/9] md:aspect-auto' : 'h-full'}`}>
                <img
                    src={imageUrl}
                    alt={alt}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 text-white font-bold text-sm bg-rose-500 px-4 py-2 rounded-full transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        <span>Visit Partner</span>
                        <ExternalLink className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </motion.a>
    );
};
