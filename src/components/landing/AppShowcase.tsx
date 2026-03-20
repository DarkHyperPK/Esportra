import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Monitor, Zap, Layout, Search } from "lucide-react";
import { getWebsiteAssetUrl } from "@/lib/storage";

const WebShowcase = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const y1 = useTransform(scrollYProgress, [0, 1], [80, -80]);
    const y2 = useTransform(scrollYProgress, [0, 1], [150, -150]);

    return (
        <section ref={containerRef} className="py-40 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col items-center text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-2 text-blue-400 text-sm tracking-[0.4em] uppercase font-medium mb-6"
                    >
                        <Monitor className="w-4 h-4" /> Professional Ecosystem
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-light text-white font-heading leading-tight"
                    >
                        The Ultimate <br />
                        <span className="font-medium italic text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/40">Command Center.</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-white/40 font-light font-heading leading-relaxed mt-8 max-w-2xl"
                    >
                        Esportra is designed to bring elite-level management to every tournament. Precise, transparent, and powerful.
                    </motion.p>
                </div>

                <div className="relative h-[600px] md:h-[800px] mt-12 mb-20 max-w-6xl mx-auto">
                    {/* Mockup 1: CSS Browser Frame for Brackets */}
                    <motion.div
                        style={{ y: y1 }}
                        className="absolute left-0 top-0 w-full lg:w-[80%] z-20"
                    >
                        <div className="bg-[#121212] rounded-xl border border-white/10 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] overflow-hidden">
                            {/* Browser Header */}
                            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                </div>
                                <div className="flex-1 bg-black/20 rounded-md py-1 px-4 text-[10px] text-white/20 font-mono tracking-tight truncate">
                                    app.esportra.com/tournaments/bracket
                                </div>
                            </div>

                            {/* Mock UI: Brackets */}
                            <div className="p-8 md:p-12 aspect-video bg-gradient-to-br from-[#121212] to-[#0a0a0a] relative overflow-hidden">
                                <div className="flex items-center gap-4 mb-12">
                                    <img src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')} loading="lazy" className="h-6 opacity-80" alt="Logo" />
                                    <div className="h-4 w-px bg-white/10" />
                                    <div className="text-white/60 text-sm font-medium">Tournament Hub</div>
                                </div>

                                {/* Bracket visualization simulation */}
                                <div className="flex gap-12 justify-center mt-8">
                                    <div className="space-y-16">
                                        <div className="w-32 h-10 bg-white/5 border-l-2 border-emerald-400 rounded-sm" />
                                        <div className="w-32 h-10 bg-white/5 border-l-2 border-emerald-400 rounded-sm" />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <div className="w-32 h-10 bg-white/5 border-l-2 border-blue-400 rounded-sm translate-y-2" />
                                    </div>
                                </div>

                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -z-10" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Mockup 2: CSS Browser Frame for Venues (Staggered) */}
                    <motion.div
                        style={{ y: y2 }}
                        className="absolute right-0 top-[30%] w-[90%] lg:w-[70%] z-10"
                    >
                        <div className="bg-[#121212] rounded-xl border border-white/10 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] overflow-hidden">
                            {/* Browser Header */}
                            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                                </div>
                                <div className="flex-1 bg-black/20 rounded-md py-1 px-4 text-[10px] text-white/20 font-mono tracking-tight truncate">
                                    app.esportra.com/venues/discovery
                                </div>
                            </div>

                            {/* Mock UI: Venues */}
                            <div className="p-8 md:p-12 aspect-video bg-gradient-to-br from-[#121212] to-[#0a0a0a] relative overflow-hidden">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-32 bg-white/5 rounded-lg overflow-hidden border border-white/5 p-4">
                                        <div className="w-1/2 h-2 bg-white/10 rounded mb-2" />
                                        <div className="w-1/3 h-1.5 bg-white/5 rounded" />
                                    </div>
                                    <div className="h-32 bg-white/5 rounded-lg overflow-hidden border border-white/5 p-4">
                                        <div className="w-1/2 h-2 bg-white/10 rounded mb-2" />
                                        <div className="w-1/3 h-1.5 bg-white/5 rounded" />
                                    </div>
                                </div>
                                <div className="absolute bottom-0 right-0 p-8">
                                    <div className="w-24 h-8 bg-emerald-500/80 rounded-full blur-[2px] opacity-20" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="flex justify-center gap-12 mt-32 flex-wrap">
                    <div className="flex items-center gap-3 text-white/30 text-sm tracking-widest uppercase">
                        <Layout className="w-5 h-5" /> Grid Management
                    </div>
                    <div className="flex items-center gap-3 text-white/30 text-sm tracking-widest uppercase">
                        <Search className="w-5 h-5" /> Smart Discovery
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WebShowcase;
