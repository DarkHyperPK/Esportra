import React from 'react';
import { motion } from 'framer-motion';

/**
 * GradientWaveBackground - A wave-like animated gradient background
 */
export const GradientWaveBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden bg-[#020617]">
            {/* Animated wave layers */}
            <motion.div
                animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute inset-0 opacity-40"
                style={{
                    background: 'linear-gradient(45deg, #0f172a, #1e1b4b, #0f172a, #1e3a5f, #0f172a)',
                    backgroundSize: '400% 400%',
                }}
            />

            {/* Floating gradient circles */}
            <motion.div
                animate={{
                    y: [0, -30, 0],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="absolute top-[20%] left-[10%] w-[40%] h-[40%] rounded-full bg-gradient-to-r from-indigo-600/30 to-violet-600/30 blur-[80px]"
            />

            <motion.div
                animate={{
                    y: [0, 40, 0],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2
                }}
                className="absolute bottom-[10%] right-[15%] w-[50%] h-[50%] rounded-full bg-gradient-to-l from-emerald-600/20 to-teal-600/20 blur-[100px]"
            />

            {/* Scan line effect */}
            <motion.div
                animate={{
                    y: ['-100%', '200%'],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                }}
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
            />
        </div>
    );
};
