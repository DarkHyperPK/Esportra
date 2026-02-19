import React from 'react';
import { motion } from 'framer-motion';

interface PremiumLoadingScreenProps {
    text?: string;
    className?: string;
}

export const PremiumLoadingScreen: React.FC<PremiumLoadingScreenProps> = ({
    className = ""
}) => {
    const logoSrc = "https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/eSportra%20Logo/eSPORTRA%20white%20transparent.png";

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#050507] text-white overflow-hidden ${className}`}>
            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1),transparent_70%)]" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
                {/* Pulsing Logo */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0.5 }}
                    animate={{ scale: [0.9, 1, 0.9], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-32 h-32 md:w-48 md:h-48 relative flex items-center justify-center"
                >
                    <img
                        src={logoSrc}
                        alt="Esportra"
                        className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    />
                </motion.div>
            </div>

            {/* Footer System Info - Minimal */}
            <div className="absolute bottom-8 text-[10px] text-white/10 font-mono tracking-widest uppercase">
                LOADING
            </div>
        </div>
    );
};

export default PremiumLoadingScreen;
