import { motion } from "framer-motion";
import { useSponsors, trackClick, trackImpression } from '@/hooks/useSponsors';
import { getStorageUrl } from "@/lib/storage";

const LogoTicker = () => {
    const { data: sponsors = [], isLoading } = useSponsors();
    const sponsorsWithLogos = [
        {
            id: '41081b79-4631-4123-bf27-a88cc89eae65',
            name: 'SystemOptiX',
            logo_url: getStorageUrl('system.assets.partners', 'SystemOptiX/logo.png'),
            website_url: 'https://systemoptix.net/',
            accent_color: '#06b6d4'
        },
        ...sponsors.filter(s => s.logo_url && s.name !== 'SystemOptiX')
    ];

    if (isLoading) return null;

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
                    {sponsorsWithLogos.map((sponsor, index) => (
                        <motion.a
                            key={sponsor.id}
                            href={sponsor.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackClick(sponsor.id)}
                            onViewportEnter={() => trackImpression(sponsor.id)}
                            viewport={{ once: true, amount: 0.5 }}
                            className="group relative transition-transform duration-300 hover:scale-105"
                        >
                            <img
                                src={sponsor.logo_url}
                                alt={sponsor.name}
                                className="h-8 md:h-10 w-auto object-contain grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                            />
                        </motion.a>
                    ))}
                </div>
            </div>


        </div>
    );
};

export default LogoTicker;
