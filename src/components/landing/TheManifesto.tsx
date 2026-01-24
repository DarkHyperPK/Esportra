import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const TheManifesto = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start 0.9", "end 0.5"]
    });

    const opacityHeading = useTransform(scrollYProgress, [0, 0.2, 0.3], [0, 1, 1]);
    const yHeading = useTransform(scrollYProgress, [0, 0.2], [50, 0]);

    const opacityBody = useTransform(scrollYProgress, [0.25, 0.45, 0.6], [0, 1, 1]);
    const yBody = useTransform(scrollYProgress, [0.25, 0.45], [30, 0]);

    const opacityClimax = useTransform(scrollYProgress, [0.55, 0.75, 1], [0, 1, 1]);
    const scaleClimax = useTransform(scrollYProgress, [0.55, 0.8], [0.95, 1]);

    return (
        <section ref={containerRef} className="py-24 md:py-40 bg-[#0a0a0a] relative overflow-hidden flex justify-center items-center min-h-[90vh]">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_0%,transparent_70%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-5xl mx-auto space-y-16 md:space-y-24">

                    {/* Section 1: The Problem */}
                    <motion.div style={{ opacity: opacityHeading, y: yHeading }} className="text-center">
                        <span className="inline-block text-blue-400/80 mb-6 text-sm md:text-base tracking-[0.3em] uppercase font-medium">For The Unseen Legends</span>
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1] tracking-wide font-heading">
                            Talent is universal. <br />
                            <span className="text-white/30">Opportunity is not.</span>
                        </h2>
                    </motion.div>

                    {/* Section 2: The Elaboration */}
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 justify-center">
                        <motion.div
                            style={{ opacity: opacityBody, y: yBody }}
                            className="w-px h-24 md:h-32 bg-gradient-to-b from-white/0 via-white/20 to-white/0 hidden md:block flex-shrink-0" // Decorative line
                        />

                        <motion.div style={{ opacity: opacityBody, y: yBody }} className="max-w-xl text-center md:text-left">
                            <p className="text-lg md:text-2xl text-gray-400 leading-relaxed font-light font-heading">
                                For years, gamers have dominated in the dark. Grinding thousands of hours. Mastering every mechanic.
                                Waiting for a lucky break that never comes.
                            </p>
                            <p className="text-lg md:text-2xl text-gray-400 leading-relaxed font-light font-heading mt-6">
                                The path from casual to professional has been broken—obscured by noise, gatekeepers, and uncertainty.
                            </p>
                        </motion.div>
                    </div>

                    {/* Section 3: The Climax */}
                    <motion.div
                        style={{ opacity: opacityClimax, scale: scaleClimax }}
                        className="text-center pt-8 border-t border-white/5"
                    >
                        <p className="text-white/50 text-base md:text-lg tracking-widest uppercase mb-6">We exist to clear the fog.</p>
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-medium text-white leading-tight tracking-wide font-heading">
                            We are the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 animate-gradient-x">Ladder.</span>
                        </h2>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default TheManifesto;
