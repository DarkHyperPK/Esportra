import { motion } from "framer-motion";
import { trackClick, trackImpression } from '@/hooks/useSponsors';
import { useGlobalPlacements } from '@/hooks/useGlobalPlacements';

const LogoTicker = () => {
    const { data: placements = [], isLoading } = useGlobalPlacements('homepage_ticker');
    const visiblePlacements = placements.filter(placement => placement.logoUrl || placement.sponsorLogoUrl).sort((left, right) => left.slotNumber - right.slotNumber);

    if (isLoading || visiblePlacements.length === 0) return null;

    return (
        <div className="py-10 bg-[#0a0a0a] border-y border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-8 relative z-10"
            >
                <span className="text-white/20 text-[10px] tracking-[0.8em] uppercase font-bold mb-2 block ml-[0.8em]">
                    Our Partners
                </span>
            </motion.div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
                    {visiblePlacements.map((placement) => {
                        const image = <img src={placement.logoUrl || placement.sponsorLogoUrl || ''} alt={placement.sponsorName} className="h-8 md:h-10 w-auto object-contain grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300" />;
                        const motionProps = {
                            onViewportEnter: () => trackImpression(placement.sponsorId, 'homepage_ticker'),
                            viewport: { once: true, amount: 0.5 }
                        };
                        return placement.ctaUrl ? <motion.a key={placement.id} href={placement.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(placement.sponsorId, 'homepage_ticker')} className="group relative transition-transform duration-300 hover:scale-105" {...motionProps}>{image}</motion.a> : <motion.div key={placement.id} className="group relative" {...motionProps}>{image}</motion.div>;
                    })}
                </div>
            </div>
        </div>
    );
};

export default LogoTicker;
