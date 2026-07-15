import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { trackClick, trackImpression, useSponsors } from '@/hooks/useSponsors';
import { getStorageUrl } from '@/lib/storage';

interface Props {
    sponsorId?: string; // optional override — if not passed, resolves SystemOptiX from DB
}

export const VerticalAdPlacement = ({ sponsorId: sponsorIdProp }: Props) => {
    const { data: sponsors = [] } = useSponsors();
    // Resolve sponsor ID: use prop if provided, otherwise look up SystemOptiX from DB
    const dbSystemOptiX = sponsors.find(s => s.name?.toLowerCase() === 'systemoptix');
    const sponsorId = sponsorIdProp || dbSystemOptiX?.id || '';

    // Performance HUD State
    const statsConfig = useMemo(() => [
        { ping: '1.2ms', fps: '590 FPS' },
        { ping: '0.8ms', fps: '840 FPS' },
        { ping: '1.0ms', fps: '673 FPS' },
    ], []);
    const [currentStats, setCurrentStats] = useState(statsConfig[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStats(prev => {
                const currentIndex = statsConfig.findIndex(s => s.ping === prev.ping);
                return statsConfig[(currentIndex + 1) % statsConfig.length];
            });
        }, 2000);
        return () => clearInterval(interval);
    }, [statsConfig]);

    // Impression Tracking
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && sponsorId) {
                    trackImpression(sponsorId);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );
        if (adRef.current) observer.observe(adRef.current);
        return () => observer.disconnect();
    }, [sponsorId]);

    return (
        <div ref={adRef} className="mt-12 hidden lg:flex flex-col gap-8">
            <div className="relative group bg-[#080808] border border-white/5 overflow-hidden transition-all duration-500 hover:border-emerald-500/30">
                <div className="aspect-[1/2] relative overflow-hidden">
                    <img
                        src={dbSystemOptiX?.banner_image_url || getStorageUrl('system.assets.partners', 'SystemOptiX/1.jpg')}
                        alt="Partner"
                        loading="lazy"
                        decoding="async"
                        fetchpriority="low"
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all [transition-duration:1500ms]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />

                    {/* Performance HUD (Simulated) */}
                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-20">
                        <div className="bg-black/80 border border-emerald-500/30 p-3 backdrop-blur-md">
                            <div className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest mb-1 opacity-70 whitespace-nowrap">LATENCY</div>
                            <div className="text-xl font-mono font-bold text-white tracking-tighter">{currentStats.ping}</div>
                        </div>
                        <div className="bg-black/80 border border-emerald-500/30 p-3 backdrop-blur-md text-right">
                            <div className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest mb-1 opacity-70 whitespace-nowrap">FRAMERATE</div>
                            <div className="text-xl font-mono font-bold text-white tracking-tighter">{currentStats.fps}</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-zinc-950/50 backdrop-blur-sm border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <img
                            src={dbSystemOptiX?.logo_url || getStorageUrl('system.assets.partners', 'SystemOptiX/logo.png')}
                            alt="Partner"
                            loading="lazy"
                            decoding="async"
                            fetchpriority="low"
                            className="h-6 w-auto object-contain"
                        />
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-[8px] text-amber-500 font-bold uppercase tracking-widest rounded">Radiant Partner</span>
                    </div>
                    <h4 className="text-white font-bold text-sm mb-2 group-hover:text-emerald-400 transition-colors">STOP BLAMING YOUR PC.</h4>
                    <p className="text-gray-500 text-xs mb-6 font-light">Frame-perfect optimization that eliminates stutters, reduces input delay, and unlocks the FPS your hardware was built to deliver.</p>

                    <div className="flex items-center justify-between gap-4">
                        <a
                            href={dbSystemOptiX?.website_url || 'https://systemoptix.net/'}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => sponsorId && trackClick(sponsorId)}
                            className="text-[10px] font-mono text-white flex items-center gap-2 hover:text-emerald-400 transition-colors group/btn"
                        >
                            OPTIMIZE_NOW <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                        </a>
                        <div className="px-2 py-1 border border-emerald-500/20 bg-emerald-500/5 text-[9px] font-mono text-emerald-500 uppercase">
                            {dbSystemOptiX?.discount_text || 'esportra20'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


