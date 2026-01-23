import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedLiquidBackground } from './AnimatedLiquidBackground';

interface BackgroundRotatorProps {
    children: React.ReactNode[];
    duration?: number; // Time in seconds to show each background
    transitionDuration?: number; // Time in seconds for the crossfade
}

export const BackgroundRotator: React.FC<BackgroundRotatorProps> = ({
    children,
    duration = 15,
    transitionDuration = 2
}) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (children.length <= 1) return;

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % children.length);
        }, duration * 1000);

        return () => clearInterval(timer);
    }, [children.length, duration]);

    return (
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#020617]">
            <AnimatePresence>
                <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: transitionDuration }}
                    className="absolute inset-0 w-full h-full"
                >
                    <Suspense fallback={<div className="absolute inset-0 bg-[#020617]" />}>
                        {children[index]}
                    </Suspense>
                </motion.div>
            </AnimatePresence>

            {/* Persistent Overlays (applied on top of whichever background is active) */}
            <div className="absolute inset-0 bg-[#020617]/20 backdrop-blur-[1px] z-10" />
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#020617] to-transparent z-10" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#020617] to-transparent z-10" />
        </div>
    );
};

