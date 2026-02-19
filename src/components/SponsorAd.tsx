import React, { useEffect, useRef, useState } from 'react';
import { trackImpression, trackClick } from '@/hooks/useSponsors';
import { cn } from '@/lib/utils';

interface SponsorAdProps {
    sponsorId: string;
    imageUrl: string;
    linkUrl: string;
    type: 'banner' | 'sidebar' | 'card' | 'overlay';
    className?: string;
    onClose?: () => void;
}

export const SponsorAd: React.FC<SponsorAdProps> = ({
    sponsorId,
    imageUrl,
    linkUrl,
    type,
    className,
    onClose
}) => {
    const adRef = useRef<HTMLDivElement>(null);
    const [hasImpression, setHasImpression] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasImpression) {
                    trackImpression(sponsorId);
                    setHasImpression(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 } // 50% of ad must be visible
        );

        if (adRef.current) {
            observer.observe(adRef.current);
        }

        return () => observer.disconnect();
    }, [sponsorId, hasImpression]);

    const handleClick = () => {
        trackClick(sponsorId);
        window.open(linkUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            ref={adRef}
            className={cn(
                "relative group cursor-pointer overflow-hidden transition-all",
                type === 'banner' && "w-full aspect-[21/9] rounded-xl",
                type === 'sidebar' && "w-full aspect-square rounded-lg",
                type === 'card' && "absolute top-2 right-2 w-8 h-8",
                className
            )}
            onClick={handleClick}
        >
            {type === 'card' ? (
                <img
                    src={imageUrl}
                    alt="Sponsor"
                    className="w-full h-full object-contain drop-shadow-md hover:scale-110 transition-transform"
                />
            ) : (
                <>
                    <img
                        src={imageUrl}
                        alt="Sponsor Ad"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-white/90 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                            Visit Partner
                        </span>
                    </div>
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[8px] text-white/70 uppercase tracking-wider font-mono">
                        Ad
                    </div>
                </>
            )}
        </div>
    );
};
