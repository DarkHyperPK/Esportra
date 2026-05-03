import React from 'react';
import { motion } from 'framer-motion';
import { useLowFx } from '@/hooks/useLowFx';

/**
 * LiquidBackground - A CSS/Framer-Motion based animated gradient background
 * Simulates a fluid/liquid effect with moving gradient orbs.
 *
 * In low-fx mode, returns a static gradient that matches the orb palette —
 * the animated blurred/blended orbs are omitted entirely (they are the single
 * biggest CPU cost when GPU acceleration is off).
 */
export const LiquidBackground = () => {
    const isLowFx = useLowFx();

    if (isLowFx) {
        return (
            <div
                className="absolute inset-0 overflow-hidden bg-[#020617]"
                aria-hidden="true"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b3e] via-[#0f172a] to-[#020617]" />
            </div>
        );
    }

    return (
        <div className="absolute inset-0 overflow-hidden bg-[#020617]">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]" />

            {/* Moving Orb 1 - Purple */}
            <motion.div
                animate={{
                    x: [0, 150, -100, 0],
                    y: [0, -100, 50, 0],
                    scale: [1, 1.3, 0.9, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] rounded-full bg-purple-600/50 blur-[120px] mix-blend-screen"
            />

            {/* Moving Orb 2 - Blue */}
            <motion.div
                animate={{
                    x: [0, -150, 100, 0],
                    y: [0, 150, -50, 0],
                    scale: [1, 1.5, 1.1, 1],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute top-[10%] right-[-20%] w-[80%] h-[80%] rounded-full bg-blue-500/40 blur-[140px] mix-blend-screen"
            />

            {/* Moving Orb 3 - Cyan */}
            <motion.div
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -80, 100, 0],
                    scale: [1, 1.2, 1.4, 1],
                }}
                transition={{
                    duration: 35,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 5
                }}
                className="absolute bottom-[-30%] left-[10%] w-[90%] h-[90%] rounded-full bg-cyan-500/35 blur-[150px] mix-blend-screen"
            />

            {/* Moving Orb 4 - Pink accent */}
            <motion.div
                animate={{
                    x: [0, -80, 120, 0],
                    y: [0, 80, -60, 0],
                    scale: [0.8, 1.1, 0.9, 0.8],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 8
                }}
                className="absolute top-[40%] left-[30%] w-[50%] h-[50%] rounded-full bg-pink-500/30 blur-[100px] mix-blend-screen"
            />

            {/* Subtle Noise Texture Overlay */}
            <div
                className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />
        </div>
    );
};
