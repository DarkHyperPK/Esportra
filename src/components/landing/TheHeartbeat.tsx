import { motion } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const TheHeartbeat = () => {
    return (
        <section className="py-40 bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center justify-center min-h-[70vh]">
            {/* Abstract Energy Field */}
            <div className="absolute inset-0 z-0">
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.4, 0.2]
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_60%)]"
                />
            </div>

            <div className="container mx-auto px-4 relative z-10 text-center">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 0.8 }}
                        className="text-white/60 text-sm tracking-[0.8em] uppercase font-bold mb-12 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                    >
                        The Pulse of eSports
                    </motion.div>

                    <div className="relative py-24 flex items-center justify-center">
                        {/* Dynamic Floating Energy Nodes */}
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    y: [0, -30, 0],
                                    x: [0, i % 2 === 0 ? 20 : -20, 0],
                                    opacity: [0, 0.4, 0],
                                    scale: [0, 1, 0]
                                }}
                                transition={{
                                    duration: 4 + i,
                                    repeat: Infinity,
                                    delay: i * 0.8,
                                    ease: "easeInOut"
                                }}
                                className="absolute w-1 h-1 bg-blue-400 rounded-full blur-[1px]"
                                style={{
                                    left: `${50 + (Math.cos(i) * 30)}%`,
                                    top: `${50 + (Math.sin(i) * 30)}%`
                                }}
                            />
                        ))}

                        {/* Quad-Layer Cinematic Pulse Rings */}
                        <motion.div
                            animate={{ scale: [0.8, 2.5], opacity: [0.5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
                            className="absolute w-44 h-44 border border-blue-500/30 rounded-full"
                        />
                        <motion.div
                            animate={{ scale: [0.8, 3.2], opacity: [0.3, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 1 }}
                            className="absolute w-44 h-44 border border-emerald-500/20 rounded-full"
                        />
                        <motion.div
                            animate={{ scale: [0.8, 4], opacity: [0.2, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: 2 }}
                            className="absolute w-44 h-44 border border-blue-400/10 rounded-full"
                        />
                        <motion.div
                            animate={{ scale: [0.8, 1.5], opacity: [0, 0.4, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute w-44 h-44 bg-blue-500/5 rounded-full blur-3xl shadow-[0_0_100px_rgba(59,130,246,0.2)]"
                        />

                        {/* The Logo Core - More Sophisticated Breathing */}
                        <motion.div
                            animate={{
                                scale: [0.98, 1.05, 0.98],
                                filter: ["drop-shadow(0 0 20px rgba(255,255,255,0.2))", "drop-shadow(0 0 45px rgba(255,255,255,0.6))", "drop-shadow(0 0 20px rgba(255,255,255,0.2))"]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            style={{ willChange: "transform, filter" }}
                            className="relative z-20"
                        >
                            <img src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                                className="h-14 md:h-24 opacity-100"
                                alt="Core" />
                        </motion.div>
                    </div>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-white/80 text-xl md:text-3xl font-light font-heading leading-relaxed mt-16 max-w-3xl mx-auto"
                    >
                        Not just lines of code. <br />
                        A living, breathing engine for the <span className="text-blue-400 font-medium italic">future of competition.</span>
                    </motion.p>
                </div>
            </div>
        </section>
    );
};

export default TheHeartbeat;
