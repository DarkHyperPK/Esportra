import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Award, Zap, ArrowRight, Cpu } from 'lucide-react';
import { trackImpression, trackClick } from '@/hooks/useSponsors';
import { useGlobalPlacements, type GlobalPlacement } from '@/hooks/useGlobalPlacements';
import PartnerApplicationForm from '@/components/PartnerApplicationForm';
import Footer from '@/components/Footer';
import { JackButton } from '@/components/ui/JackButton';

/* ──────────────────────────────────────────────────────────────
   Interfaces & Config
   ────────────────────────────────────────────────────────────── */

interface PartnerSectionProps {
    sponsor: GlobalPlacement;
    index: number;
}

const tierConfig: Record<string, { label: string; icon: typeof Star; color: string }> = {
    radiant: { label: 'RADIANT_PARTNER', icon: Zap, color: 'text-amber-500' },
    ascendant: { label: 'ASCENDANT_PARTNER', icon: Award, color: 'text-emerald-500' },
    partner: { label: 'PARTNER', icon: Star, color: 'text-blue-400' },
    diamond: { label: 'PARTNER', icon: Star, color: 'text-blue-400' },
    standard: { label: 'PARTNER', icon: Star, color: 'text-blue-400' },
};

/* ──────────────────────────────────────────────────────────────
   Partner Section Component 
   ────────────────────────────────────────────────────────────── */

const PartnerSection: React.FC<PartnerSectionProps> = ({ sponsor, index }) => {
    const tier = tierConfig[sponsor.sponsorTier || 'standard'] || tierConfig.standard;
    const isEven = index % 2 === 0;
    const sectionRef = useRef<HTMLDivElement>(null);
    const hasTracked = useRef(false);

    // Track impression only when 50% of this section is visible
    useEffect(() => {
        if (!sectionRef.current || hasTracked.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasTracked.current) {
                    trackImpression(sponsor.sponsorId, 'partner_showcase');
                    hasTracked.current = true;
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );

        observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, [sponsor.sponsorId]);

    // Gallery State
    const [[page, direction], setPage] = React.useState([0, 0]);
    const gallery = sponsor.bannerUrl ? [sponsor.bannerUrl] : [];

    const imageIndex = Math.abs(page % gallery.length);


    React.useEffect(() => {
        if (gallery.length <= 1) return;
        const interval = setInterval(() => {
            setPage([page + 1, 1]);
        }, 4000);
        return () => clearInterval(interval);
    }, [gallery.length, page]);

    return (
        <div ref={sectionRef} data-sponsor-id={sponsor.sponsorId} className={`flex flex-col lg:flex-row min-h-[600px] border-b border-white/5 ${isEven ? '' : 'lg:flex-row-reverse'}`}>

            {/* ── Image Side (The Visual) ── */}
            <div className="w-full lg:w-1/2 relative group bg-[#080808] overflow-hidden">

                {/* Image Container */}
                <div className="relative w-full h-full min-h-[400px]">
                    {gallery.length > 0 ? (
                        <>
                            <AnimatePresence initial={false} custom={direction}>
                                <motion.img
                                    key={page}
                                    src={gallery[imageIndex]}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0 w-full h-full object-cover filter grayscale contrast-125 group-hover:grayscale-0 transition-all [transition-duration:800ms] group-hover:scale-105"
                                />
                            </AnimatePresence>

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />

                        </>
                    ) : (
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-zinc-900"
                        >
                            <span
                                className="text-9xl font-heading font-black opacity-10 grayscale group-hover:grayscale-0 transition-all duration-500"
                                style={{ color: '#f43f5e' }}
                            >
                                {sponsor.sponsorName[0]}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Content Side (The Logic) ── */}
            <div className="w-full lg:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-[#050505] relative">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-[1px] bg-zinc-800 group-hover:bg-white transition-colors duration-500" />
                    <span
                        className="font-mono text-xs tracking-[0.2em] uppercase transition-colors duration-300"
                        style={{ color: '#f43f5e' }}
                    >
                        {tier.label}
                    </span>
                </div>

                {/* Header / Logo */}
                {(sponsor.logoUrl || sponsor.sponsorLogoUrl) ? (
                    <img
                        src={sponsor.logoUrl || sponsor.sponsorLogoUrl || ''}
                        alt={sponsor.sponsorName}
                        className="h-16 w-auto object-contain mb-8 self-start opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                ) : (
                    <h2 className="text-4xl md:text-6xl font-black font-heading tracking-tighter mb-6 text-white leading-none">
                        {sponsor.sponsorName.toUpperCase()}
                    </h2>
                )}

                {/* Standard Description */}
                <>
                    {sponsor.headline && (
                        <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">
                            {sponsor.headline}
                        </h3>
                    )}
                    {sponsor.description && (
                        <p className="text-zinc-500 text-lg leading-relaxed mb-10 max-w-lg font-light">
                            {sponsor.description}
                        </p>
                    )}
                </>

                {/* CTA */}
                <div className="flex items-center gap-6 mt-auto pt-6 border-t border-white/5">
                    {sponsor.ctaUrl && <JackButton
                        as="a"
                        href={sponsor.ctaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackClick(sponsor.sponsorId, 'partner_showcase')}
                        variant="invert"
                        size="sm"
                    >
                        {sponsor.ctaText || 'INITIATE_LINK'}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
                    </JackButton>}
                </div>

            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────────
   Main Partners Page
   ────────────────────────────────────────────────────────────── */

const Partners = () => {
    const { data: rawSponsors = [], isLoading } = useGlobalPlacements('partner_showcase');

    const sponsors = React.useMemo(() => {
        return [...rawSponsors].sort((a, b) => a.slotNumber - b.slotNumber);
    }, [rawSponsors]);

    // Impression tracking is now handled per-section via IntersectionObserver
    // (inside PartnerSection component)

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-rose-500/30">
            {/* Background Noise (Subtle) */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-20 bg-[url('/noise.svg')] mix-blend-overlay" />

            {/* ── HERO Section ── */}
            <section className="h-[70vh] flex flex-col justify-center items-center relative overflow-hidden border-b border-white/5">
                <div className="text-center z-10 px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="mb-8 flex justify-center">
                            <span className="px-3 py-1 border border-white/10 bg-white/5 text-xs text-rose-500 font-mono tracking-[0.3em] uppercase">
                                ECOSYSTEM_PARTNERS
                            </span>
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-2 leading-[0.85] mix-blend-difference">
                            POWERING <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600">ESPORTS</span>
                        </h1>
                    </motion.div>
                </div>
            </section>

            {/* ── Partner List ── */}
            <main className="relative z-10">
                {isLoading ? (
                    <div className="h-96 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent animate-spin" />
                    </div>
                ) : sponsors.length === 0 ? (
                    <div className="py-32 text-center">
                        <p className="text-zinc-600 font-mono text-sm">NO_DATA_AVAILABLE</p>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {/* Showcase Section - Only for Radiant and Ascendant partners */}
                        {sponsors
                            .filter(s => s.sponsorTier === 'radiant' || s.sponsorTier === 'ascendant')
                            .map((sponsor, idx) => (
                                <PartnerSection key={sponsor.id} sponsor={sponsor} index={idx} />
                            ))}
                    </div>
                )}
            </main>

            {/* ── Become a Partner (Application) ── */}
            <section className="py-32 relative border-t border-white/5 overflow-hidden" id="apply">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row gap-16">
                        <div className="w-full md:w-1/3">
                            <h2 className="text-5xl md:text-7xl font-black font-heading tracking-tighter mb-6">
                                JOIN THE <br /> <span className="text-rose-500">ALLIANCE</span>
                            </h2>
                            <p className="text-zinc-500 text-lg leading-relaxed font-light mb-8">
                                We are looking for brands that push boundaries. If you want to connect with the next generation of competitors, initialize the sequence.
                            </p>
                            <div className="flex items-center gap-2 text-rose-500 font-mono text-xs tracking-widest uppercase">
                                <Cpu className="w-4 h-4" />
                                Protocol: Open
                            </div>
                        </div>

                        <div className="w-full md:w-2/3">
                            <div className="p-8 md:p-12 border border-white/10 bg-[#0a0a0c] relative group">
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />
                                <PartnerApplicationForm />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default Partners;
